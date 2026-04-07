const network = require('../../../api/network.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function getErrorMessage(res, fallback = '加载失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeItem(item) {
  const timeslot = asNumber(item && item.timeslot, 0)
  return {
    nickname: safeText(item && item.nickname, '未命名成员'),
    createTime: safeText(item && item.create_ti, '--'),
    date: safeText(item && item.date, '--'),
    timeslotText: timeslot > 0 ? `时段 ${timeslot}` : '全天'
  }
}

Page({
  data: {
    id: '',
    mode: 'todayNew',
    title: '今日新增',
    date: formatDate(new Date()),
    loading: true,
    errorText: '',
    list: []
  },

  onLoad(options) {
    const mode = safeText(options && options.mode, 'todayNew')
    const title = mode === 'todayOrder' ? '今日有单' : '今日新增'
    this.setData({
      id: safeText(options && options.id),
      mode,
      title
    })
    wx.setNavigationBarTitle({ title })
    this.fetchList()
  },

  onPullDownRefresh() {
    this.fetchList().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onDateChange(e) {
    this.setData({
      date: safeText(e.detail.value, this.data.date)
    })
    this.fetchList()
  },

  shiftDate(offset) {
    const base = new Date(`${this.data.date}T00:00:00`)
    base.setDate(base.getDate() + offset)
    this.setData({
      date: formatDate(base)
    })
    this.fetchList()
  },

  onPrevDay() {
    this.shiftDate(-1)
  },

  onNextDay() {
    this.shiftDate(1)
  },

  async fetchList() {
    if (!this.data.id) {
      this.setData({
        loading: false,
        errorText: '团队参数有误'
      })
      return
    }
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const request = this.data.mode === 'todayOrder' ? network.xgwCommunityTodayOrder : network.xgwCommunityTodayNew
      const res = await request({
        id: this.data.id,
        datea: this.data.date
      })
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res))
      }
      this.setData({
        loading: false,
        list: (Array.isArray(res.data) ? res.data : []).map(normalizeItem)
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载失败，请稍后重试',
        list: []
      })
    }
  }
})
