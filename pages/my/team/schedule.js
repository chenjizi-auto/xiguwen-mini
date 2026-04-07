const network = require('../../../api/network.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function getErrorMessage(res, fallback = '加载失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

function normalizeItem(item) {
  return {
    userId: safeText(item && item.userid),
    head: safeText(item && item.head),
    nickname: safeText(item && item.nickname, '未命名成员'),
    occupation: safeText(item && item.occupationid, '未设置职业'),
    minPrice: safeText(item && item.zuidijia, '0')
  }
}

Page({
  data: {
    id: '',
    loading: true,
    errorText: '',
    list: []
  },

  onLoad(options) {
    this.setData({
      id: safeText(options && options.id)
    })
    wx.setNavigationBarTitle({
      title: '成员档期'
    })
    this.fetchList()
  },

  onPullDownRefresh() {
    this.fetchList().finally(() => {
      wx.stopPullDownRefresh()
    })
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
      const res = await network.xgwCommunitySchedule({
        id: this.data.id
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
