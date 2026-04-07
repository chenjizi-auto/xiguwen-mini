const network = require('../../api/network-main.js')

function normalizeHistory(list) {
  if (!Array.isArray(list)) return []
  return list
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .slice(-20)
    .reverse()
}

function uniquePushFront(list, keyword) {
  const next = [keyword].concat((list || []).filter(item => item !== keyword))
  return next.slice(0, 20)
}

function pickHotKeywords(data) {
  const source = data && data.data ? data.data : data
  const hotList = (source && (source.hot || source.list || source.data || source.result)) || []
  if (!Array.isArray(hotList)) return []
  return hotList
    .map(item => {
      if (typeof item === 'string') return item
      return item && (item.title || item.name || item.keywords || item.keyword)
    })
    .map(item => String(item || '').trim())
    .filter(Boolean)
}

Page({
  data: {
    inputVal: '',
    hotList: [],
    list: [],
    cityModeText: '同城',
    loadingHot: false
  },
  onLoad: function () {
    this.refreshHistory()
    this.fetchHotKeywords()
  },
  onShow: function () {
    this.refreshHistory()
  },
  refreshHistory() {
    this.setData({
      list: normalizeHistory(wx.getStorageSync('searchHis'))
    })
  },
  async fetchHotKeywords() {
    this.setData({ loadingHot: true })
    try {
      const res = await network.searchIndex({})
      const hotList = pickHotKeywords(res)
      this.setData({
        hotList,
        loadingHot: false
      })
    } catch (err) {
      this.setData({
        loadingHot: false
      })
    }
  },
  onSearchChange(e) {
    this.setData({
      inputVal: e.detail
    })
  },
  search(e) {
    const keyword = String((e && e.detail) || this.data.inputVal || '').trim()
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      })
      return
    }
    const nextHistory = uniquePushFront(normalizeHistory(wx.getStorageSync('searchHis')), keyword)
    wx.setStorageSync('searchHis', nextHistory.slice().reverse())
    this.setData({
      inputVal: keyword,
      list: nextHistory
    })
    wx.redirectTo({
      url: `/pages/search/result?keyword=${encodeURIComponent(keyword)}`
    })
  },
  async clearHistory() {
    wx.removeStorageSync('searchHis')
    this.setData({
      list: []
    })
    try {
      await network.searchClearHistory({})
    } catch (err) {}
  },
  onClose(e) {
    const idx = e.currentTarget.dataset.idx
    const list = (this.data.list || []).filter((_, index) => index !== idx)
    wx.setStorageSync('searchHis', list.slice().reverse())
    this.setData({
      list
    })
  },
  go(e) {
    const idx = e.currentTarget.dataset.idx
    const keywords = this.data.list[idx]
    this.search({ detail: keywords })
  },
  tapHotKeyword(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.search({ detail: keyword })
  },
  onCancel() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }
    })
  },
  searchscan() {
    wx.scanCode({
      scanType: ['barCode', 'qrCode', 'datamatrix', 'pdf417'],
      success: res => {
        this.search({
          detail: res.result
        })
      }
    })
  }
})
