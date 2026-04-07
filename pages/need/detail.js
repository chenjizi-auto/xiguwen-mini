const network = require('../../api/network.js')
const CONFIG = require('../../config.js')
const xgwAuth = require('../../utils/xgw-auth.js')

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

function getRemainingSeconds(endAt, fallback = 0) {
  const endMs = asNumber(endAt, 0)
  if (endMs > 0) {
    return Math.max(0, Math.floor((endMs - Date.now()) / 1000))
  }
  return Math.max(0, asNumber(fallback, 0))
}

Page({
  data: {
    id: 0,
    loading: true,
    errorText: '',
    detail: null,
    enablePrivateMessage: !!(CONFIG && CONFIG.enablePrivateMessage),
    orderRemark: '',
    submitting: false
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
    if (this.data.id) {
      this.fetchDetail()
    }
  },

  onHide() {
    this.stopCountdown()
  },

  onUnload() {
    this.stopCountdown()
  },

  async fetchDetail() {
    this.stopCountdown()
    this.setData({
      loading: true,
      errorText: ''
    })

    try {
      const res = await network.xgwMyNeedDetail({ id: this.data.id })
      if (!res || res.code !== 0 || !res.data || !res.data.xuquxiangqing) {
        throw new Error(getErrorMessage(res))
      }
      const detail = res.data.xuquxiangqing
      const countdownEndAt = parseDateTimeToMs(detail.daoqitime || detail.remainingtime)
      const countdown = Math.max(0, asNumber(detail.countdown, 0))
      this.setData({
        loading: false,
        detail: {
          id: asNumber(detail.id, 0),
          title: safeText(detail.title, '--'),
          code: safeText(detail.code),
          type: safeText(detail.type, '婚庆'),
          priceText: `¥ ${formatPrice(detail.price)}`,
          createTime: formatDateTime(detail.create_ti),
          address: safeText(detail.address || detail.dizhi, '--'),
          details: safeText(detail.details, '--'),
          countDownText: formatCountDown(countdown),
          countdown,
          countdownBase: countdown || getRemainingSeconds(countdownEndAt, 0),
          countdownStartedAt: Date.now(),
          countdownEndAt,
          browseText: String(asNumber(detail.browsingvolume, 0)),
          joinText: String(asNumber(detail.renshu, 0)),
          openPhone: asNumber(detail.openphone, 0) === 1,
          openMessage: asNumber(detail.openmessage, 0) === 1,
          mobile: safeText(detail.mobile),
          userId: asNumber(detail.userid, 0)
        }
      })
      this.startCountdown()
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载失败，请稍后重试'
      })
    }
  },

  startCountdown() {
    this.stopCountdown()
    const detail = this.data.detail
    if (!detail || detail.countdown <= 0) return
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
      'detail.countDownText': formatCountDown(nextCountdown)
    })
    if (!nextCountdown) {
      this.stopCountdown()
    }
  },

  onRemarkInput(e) {
    this.setData({
      orderRemark: safeText(e.detail.value).slice(0, 200)
    })
  },

  onCallTap() {
    const detail = this.data.detail
    if (!detail || !detail.openPhone) {
      wx.showToast({
        title: '该用户开启了电话隐私保护',
        icon: 'none'
      })
      return
    }
    if (!detail.mobile) {
      wx.showToast({
        title: '暂无联系电话',
        icon: 'none'
      })
      return
    }
    wx.makePhoneCall({
      phoneNumber: detail.mobile,
      fail: () => {}
    })
  },

  onChatTap() {
    if (!this.data.enablePrivateMessage) {
      return
    }
    const detail = this.data.detail
    if (!detail || !detail.openMessage) {
      wx.showToast({
        title: '该用户开启了私信隐私保护',
        icon: 'none'
      })
      return
    }
    wx.showToast({
      title: '私信功能开发中',
      icon: 'none'
    })
  },

  async onTakeOrderTap() {
    const detail = this.data.detail
    if (!detail) return
    if (!xgwAuth.isLogined()) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    if (detail.countdown <= 0) {
      wx.showToast({
        title: '需求已结束',
        icon: 'none'
      })
      return
    }
    if (!this.data.orderRemark.trim()) {
      wx.showToast({
        title: '请输入接单说明',
        icon: 'none'
      })
      return
    }
    if (this.data.submitting) return

    this.setData({ submitting: true })
    wx.showLoading({
      title: '提交中...',
      mask: true
    })
    try {
      const res = await network.xgwTakeNeedOrder({
        id: detail.id,
        cont: this.data.orderRemark.trim()
      })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: getErrorMessage(res, '接单失败'),
          icon: 'none'
        })
        return
      }
      wx.showToast({
        title: '接单成功',
        icon: 'success'
      })
      this.fetchDetail()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '接单失败',
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
