const network = require('../../../api/network.js')

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatDateCN(date) {
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日`
}

function getDayStartTimestamp(dateText) {
  const date = dateText ? new Date(`${dateText}T00:00:00`) : new Date()
  return Math.floor(date.getTime() / 1000)
}

Page({
  data: {
    dateValue: '',
    dateText: '',
    loading: true,
    errorText: '',
    num: 0,
    money: '0.00',
    list: [],
    shareTitle: '邀请好友',
    sharePath: '/pages/index/index',
    shareImage: ''
  },

  onLoad() {
    const now = new Date()
    this.setData({
      dateValue: formatDate(now),
      dateText: formatDateCN(now)
    })
    this.loadShareInfo()
    this.loadData()
  },

  onPullDownRefresh() {
    Promise.all([this.loadShareInfo(), this.loadData()]).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onDateChange(e) {
    const value = safeStr(e && e.detail ? e.detail.value : '')
    if (!value) return
    const date = new Date(`${value}T00:00:00`)
    this.setData({
      dateValue: value,
      dateText: formatDateCN(date)
    })
    this.loadData()
  },

  shiftDate(step) {
    const base = this.data.dateValue ? new Date(`${this.data.dateValue}T00:00:00`) : new Date()
    base.setDate(base.getDate() + step)
    this.setData({
      dateValue: formatDate(base),
      dateText: formatDateCN(base)
    })
    this.loadData()
  },

  onPrevDay() {
    this.shiftDate(-1)
  },

  onNextDay() {
    this.shiftDate(1)
  },

  openDetails() {
    wx.navigateTo({
      url: `/pages/my/invites/detail/index?date=${encodeURIComponent(this.data.dateValue)}`
    })
  },

  async loadData() {
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const res = await network.mineInvitationInfo({
        time: getDayStartTimestamp(this.data.dateValue)
      })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && res.msg) || 'request failed')
      }
      this.setData({
        loading: false,
        num: asNumber(res.data.num, 0),
        money: safeStr(res.data.money, '0.00'),
        list: Array.isArray(res.data.list) ? res.data.list : []
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: '邀请信息加载失败，请稍后重试',
        num: 0,
        money: '0.00',
        list: []
      })
    }
  },

  async loadShareInfo() {
    try {
      const res = await network.invitationFriend({})
      if (!res || res.code !== 0 || !res.data) return
      const url = safeStr(res.data.url)
      const erweima = safeStr(res.data.erweima)
      let path = '/pages/index/index'
      const inviterId = wx.getStorageSync('uid')
      if (inviterId) {
        path = `/pages/index/index?inviter_id=${inviterId}`
      } else if (url && /inviter_id=([^&]+)/.test(url)) {
        path = `/pages/index/index?inviter_id=${RegExp.$1}`
      }
      this.setData({
        shareTitle: '你的好友送来50元现金抵扣券，快点我领取吧。',
        sharePath: path,
        shareImage: erweima
      })
    } catch (err) {}
  },

  onShareAppMessage() {
    return {
      title: this.data.shareTitle,
      path: this.data.sharePath,
      imageUrl: this.data.shareImage || undefined
    }
  }
})
