const network = require('../../../../api/network.js')

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
    list: []
  },

  onLoad(options) {
    const initial = safeStr(options && options.date)
    const date = initial ? new Date(`${initial}T00:00:00`) : new Date()
    this.setData({
      dateValue: formatDate(date),
      dateText: formatDateCN(date)
    })
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
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
      const list = Array.isArray(res.data.list) ? res.data.list : []
      this.setData({
        loading: false,
        list: list.map((item, index) => ({
          id: safeStr(item.id, `${index}`),
          mobile: safeStr(item.mobile, '--'),
          created_at: safeStr(item.created_at, '--'),
          index: asNumber(index, 0) + 1
        }))
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: '邀请明细加载失败，请稍后重试',
        list: []
      })
    }
  }
})
