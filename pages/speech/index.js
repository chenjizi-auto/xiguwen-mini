const network = require('../../api/network.js')

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

function normalizeItem(item) {
  return {
    id: asNumber(item && item.id, 0),
    title: safeText(item && item.title, '未命名宝典'),
    content: safeText(item && item.content, '')
  }
}

Page({
  data: {
    loading: true,
    errorText: '',
    list: []
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '婚礼宝典' })
  },

  onShow() {
    this.fetchList()
  },

  onPullDownRefresh() {
    this.fetchList().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async fetchList() {
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const res = await network.xgwSpeechList({
        p: 1,
        rows: 100
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
  },

  onAddTap() {
    wx.navigateTo({
      url: '/pages/speech/form'
    })
  },

  onDetailTap(e) {
    const item = e.currentTarget.dataset.item
    if (!item || !item.id) return
    wx.navigateTo({
      url: `/pages/speech/detail?data=${encodeURIComponent(JSON.stringify(item))}`
    })
  },

  onEditTap(e) {
    const item = e.currentTarget.dataset.item
    if (!item || !item.id) return
    wx.navigateTo({
      url: `/pages/speech/form?data=${encodeURIComponent(JSON.stringify(item))}`
    })
  },

  async onDeleteTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '确定删除该宝典吗？',
        content: '删除后将不能恢复。',
        success: res => resolve(!!res.confirm),
        fail: () => resolve(false)
      })
    })
    if (!confirmed) return
    wx.showLoading({
      title: '删除中...',
      mask: true
    })
    try {
      const res = await network.xgwSpeechDelete({ id })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res, '删除失败'))
      }
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      this.fetchList()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '删除失败',
        icon: 'none'
      })
    }
  }
})
