const network = require('../../../api/network.js')

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function getErrorMessage(res, fallback = '加载失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

function formatPrice(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return safeText(value, '0')
  return num % 1 === 0 ? String(num) : num.toFixed(2)
}

function formatDateTime(value) {
  const text = safeText(value)
  if (!text) return '--'
  return text.length >= 16 ? text.slice(0, 16) : text
}

function parseDateTimeToMs(value) {
  const text = safeText(value).trim()
  if (!text) return 0
  const normalized = text.replace(/-/g, '/')
  const time = new Date(normalized).getTime()
  return Number.isFinite(time) ? time : 0
}

function formatCountDown(seconds) {
  const totalSeconds = Math.max(0, asNumber(seconds, 0))
  if (!totalSeconds) return '00小时00分00秒'
  const days = Math.floor(totalSeconds / 86400)
  const remain = totalSeconds % 86400
  const hours = Math.floor(remain / 3600)
  const minutes = Math.floor((remain % 3600) / 60)
  const secondsText = String(remain % 60).padStart(2, '0')
  const parts = []
  if (days > 0) parts.push(`${days}天`)
  parts.push(`${String(hours).padStart(2, '0')}小时`)
  parts.push(`${String(minutes).padStart(2, '0')}分`)
  parts.push(`${secondsText}秒`)
  return parts.join('')
}

function participantStatusText(status) {
  const s = asNumber(status, 0)
  if (s === 1) return '已中标'
  if (s === 3) return '进行中'
  return '未中标'
}

function canCooperate(detail) {
  return asNumber(detail && detail.countdown, 0) > 0
}

function getRemainingSeconds(endAt, fallback = 0) {
  const endMs = asNumber(endAt, 0)
  if (endMs > 0) {
    return Math.max(0, Math.floor((endMs - Date.now()) / 1000))
  }
  return Math.max(0, asNumber(fallback, 0))
}

function normalizeDetail(detail = {}) {
  const countdownEndAt = parseDateTimeToMs(detail.remainingtime)
  const serverCountdown = Math.max(0, asNumber(detail.countdown, 0))
  const countdown = serverCountdown > 0 ? serverCountdown : getRemainingSeconds(countdownEndAt, 0)
  return {
    id: asNumber(detail.id, 0),
    code: safeText(detail.code),
    title: safeText(detail.title, '--'),
    type: safeText(detail.type, asNumber(detail.type, 0) === 2 ? '商城' : '婚庆'),
    priceText: `¥ ${formatPrice(detail.price)}`,
    address: safeText(detail.address || detail.dizhi, '--'),
    details: safeText(detail.details, '--'),
    createTime: formatDateTime(detail.create_ti),
    statusText: countdown > 0 ? '进行中' : '已结束',
    countDownText: formatCountDown(countdown),
    countdown,
    countdownBase: countdown,
    countdownStartedAt: 0,
    countdownEndAt,
    browseText: String(asNumber(detail.browsingvolume, 0)),
    joinText: String(asNumber(detail.renshu, 0)),
    openPhone: asNumber(detail.openphone, 0) === 1,
    openMessage: asNumber(detail.openmessage, 0) === 1,
    mobile: safeText(detail.mobile),
    username: safeText(detail.username)
  }
}

Page({
  data: {
    id: 0,
    loading: true,
    errorText: '',
    detail: null,
    participants: [],
    participantPopupVisible: false,
    selectedParticipant: null,
    participantLoading: false,
    cooperating: false
  },

  onLoad(options) {
    const id = asNumber(options && options.id, 0)
    this.setData({ id })
    wx.setNavigationBarTitle({
      title: '需求详情'
    })
    if (!id) {
      this.setData({
        loading: false,
        errorText: '需求参数有误'
      })
      return
    }
    this.fetchDetail()
  },

  onShow() {
    if (this.data.detail) {
      this.startCountdown()
    }
  },

  onHide() {
    this.stopCountdown()
  },

  onUnload() {
    this.stopCountdown()
  },

  async fetchDetail() {
    this.setData({
      loading: true,
      errorText: ''
    })

    try {
      const res = await network.xgwMyNeedDetail({ id: this.data.id })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error(getErrorMessage(res))
      }

      const detail = (res.data && res.data.xuquxiangqing) || {}
      const participants = Array.isArray(res.data && res.data.jiedanren) ? res.data.jiedanren : []
      const normalizedDetail = normalizeDetail(detail)

      this.setData({
        loading: false,
        detail: normalizedDetail,
        participants: participants.map(item => ({
          id: asNumber(item.cid, 0),
          nickname: safeText(item.nickname || item.username, '匿名用户'),
          head: safeText(item.head, '/images/default.webp'),
          desc: safeText(item.jdshuoming, '暂无说明'),
          minimumprice: safeText(item.minimumprice, '0'),
          statusText: participantStatusText(item.status_j),
          raw: item
        }))
      })
      this.startCountdown()
    } catch (err) {
      this.stopCountdown()
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载失败，请稍后重试'
      })
    }
  },

  startCountdown() {
    this.stopCountdown()
    const detail = this.data.detail
    if (!detail || detail.countdown <= 0) {
      return
    }
    this.setData({
      'detail.countdownStartedAt': Date.now()
    })
    this.syncCountdown()
    this._countdownTimer = setInterval(() => {
      this.syncCountdown()
    }, 1000)
  },

  stopCountdown() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer)
      this._countdownTimer = null
    }
  },

  syncCountdown() {
    const detail = this.data.detail
    if (!detail) return
    const base = Math.max(0, asNumber(detail.countdownBase, detail.countdown))
    const startedAt = asNumber(detail.countdownStartedAt, 0)
    const elapsed = startedAt > 0 ? Math.floor((Date.now() - startedAt) / 1000) : 0
    const fallback = Math.max(0, base - elapsed)
    const nextCountdown = base > 0 ? fallback : getRemainingSeconds(detail.countdownEndAt, 0)
    this.setData({
      'detail.countdown': nextCountdown,
      'detail.countDownText': formatCountDown(nextCountdown),
      'detail.statusText': nextCountdown > 0 ? '进行中' : '已结束'
    })
    if (!nextCountdown) {
      this.stopCountdown()
    }
  },

  async onParticipantTap(e) {
    const cid = asNumber(e.currentTarget.dataset.cid, 0)
    if (!cid) return

    this.setData({
      participantPopupVisible: true,
      participantLoading: true,
      selectedParticipant: null
    })

    try {
      const res = await network.xgwNeedJoinDetail({ cid })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error(getErrorMessage(res, '获取参与详情失败'))
      }
      const item = res.data || {}
      this.setData({
        participantLoading: false,
        selectedParticipant: {
          cid: asNumber(item.cid, 0),
          userid: asNumber(item.userid, 0),
          nickname: safeText(item.nickname, '匿名用户'),
          head: safeText(item.head, '/images/default.webp'),
          occupation: safeText(item.occupationid, '未填写职业'),
          price: formatPrice(item.minimumprice),
          goodscore: `${asNumber(item.goodscore, 0)}%`,
          mobile: safeText(item.mobile),
          content: safeText(item.jdshuoming, '暂无接单说明'),
          statusText: participantStatusText(item.status_j),
          selectedTime: safeText(item.selected_time),
          isPlatform: asNumber(item.platform, 0) === 1,
          isSincerity: asNumber(item.sincerity, 0) === 1,
          isCollege: asNumber(item.college, 0) === 1
        }
      })
    } catch (err) {
      this.setData({
        participantLoading: false,
        selectedParticipant: null
      })
      wx.showToast({
        title: err && err.message ? err.message : '获取参与详情失败',
        icon: 'none'
      })
    }
  },

  onCloseParticipantPopup() {
    this.setData({
      participantPopupVisible: false,
      participantLoading: false,
      selectedParticipant: null
    })
  },

  onCallTap() {
    if (!(this.data.detail && this.data.detail.openPhone)) {
      wx.showToast({
        title: '发布人未公开电话',
        icon: 'none'
      })
      return
    }
    const mobile = safeText(this.data.detail && this.data.detail.mobile)
    if (!mobile) {
      wx.showToast({
        title: '暂无联系电话',
        icon: 'none'
      })
      return
    }
    wx.makePhoneCall({
      phoneNumber: mobile,
      fail: () => {}
    })
  },

  onParticipantCallTap() {
    const mobile = safeText(this.data.selectedParticipant && this.data.selectedParticipant.mobile)
    if (!mobile) {
      wx.showToast({
        title: '暂无联系电话',
        icon: 'none'
      })
      return
    }
    wx.makePhoneCall({
      phoneNumber: mobile,
      fail: () => {}
    })
  },

  async onCooperateTap() {
    const participant = this.data.selectedParticipant
    const detail = this.data.detail
    if (!participant || !participant.cid) return
    if (!canCooperate(detail)) {
      wx.showToast({
        title: '需求已结束，无法合作',
        icon: 'none'
      })
      return
    }
    if (this.data.cooperating) return

    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '确认合作',
        content: `是否与“${participant.nickname}”合作？`,
        confirmText: '确认',
        cancelText: '取消',
        success: res => resolve(!!res.confirm),
        fail: () => resolve(false)
      })
    })
    if (!confirmed) return

    this.setData({ cooperating: true })
    wx.showLoading({
      title: '提交中...',
      mask: true
    })
    try {
      const res = await network.xgwNeedCooperation({ cid: participant.cid })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: getErrorMessage(res, '合作失败'),
          icon: 'none'
        })
        return
      }
      wx.showToast({
        title: '合作成功',
        icon: 'success'
      })
      this.onCloseParticipantPopup()
      this.fetchDetail()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '合作失败',
        icon: 'none'
      })
    } finally {
      this.setData({ cooperating: false })
    }
  }
})
