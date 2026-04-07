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
    title: safeText(item && item.title, '未命名流程'),
    person: safeText(item && item.renyuan, ''),
    time: safeText(item && item.shijian, '--:--'),
    matter: safeText(item && item.shixiang, '')
  }
}

Page({
  data: {
    loading: true,
    loadError: '',
    list: []
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '婚礼流程'
    })
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
      loadError: ''
    })
    try {
      const res = await network.xgwWeddingFlowList({
        p: 1,
        rows: 100
      })
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res))
      }
      const list = Array.isArray(res.data) ? res.data : []
      this.setData({
        loading: false,
        list: list.map(normalizeItem)
      })
    } catch (err) {
      this.setData({
        loading: false,
        loadError: err && err.message ? err.message : '加载失败，请稍后重试',
        list: []
      })
    }
  },

  onAddTap() {
    wx.navigateTo({
      url: '/pages/wedding-flow/form'
    })
  },

  onEditTap(e) {
    const item = e.currentTarget.dataset.item
    const encoded = encodeURIComponent(JSON.stringify(item || {}))
    wx.navigateTo({
      url: `/pages/wedding-flow/form?data=${encoded}`
    })
  },

  async onDeleteTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '确定删除婚礼流程吗？',
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
      const res = await network.xgwWeddingFlowDelete({ id })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res, '删除失败'))
      }
      this.setData({
        list: this.data.list.filter(item => item.id !== id)
      })
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '删除失败',
        icon: 'none'
      })
    }
  }
})
