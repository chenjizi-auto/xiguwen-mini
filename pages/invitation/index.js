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
  const bridegroom = safeText(item && item.xinlang)
  const bride = safeText(item && item.xinniang)
  const dynamicTitle = bridegroom || bride ? `${bridegroom || '新郎'}&${bride || '新娘'}的婚礼请柬` : ''
  return {
    id: asNumber(item && item.id, 0),
    mobanId: asNumber(item && item.mobanid, 0),
    cover: safeText(item && item.cover),
    url: safeText(item && item.url),
    shareUrl: safeText(item && item.shareurl || item && item.url),
    shareTime: safeText(item && item.sharetime),
    title: dynamicTitle || `请柬 #${asNumber(item && item.id, 0) || '--'}`,
    bridegroom,
    bride,
    hotel: safeText(item && item.hotel),
    address: safeText(item && item.hunlidizhi),
    weddingTimestamp: asNumber(item && item.hunlitime, 0)
  }
}

Page({
  data: {
    loading: true,
    errorText: '',
    list: []
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '电子请柬' })
  },

  onShow() {
    this.fetchList()
  },

  onPullDownRefresh() {
    this.fetchList().finally(() => wx.stopPullDownRefresh())
  },

  async fetchList() {
    this.setData({ loading: true, errorText: '' })
    try {
      const res = await network.xgwInvitationList({ p: 1, rows: 100 })
      const user = Array.isArray(res && res.data && res.data.user) ? res.data.user : []
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res))
      }
      this.setData({
        loading: false,
        list: user.map(normalizeItem)
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载失败，请稍后重试',
        list: []
      })
    }
  },

  onCreateTap() {
    wx.navigateTo({ url: '/pages/invitation/templates' })
  },

  onPreviewTap(e) {
    const item = e.currentTarget.dataset.item
    if (!item || !item.id) return
    wx.navigateTo({
      url:
        `/pages/invitation/preview?id=${item.id}` +
        `&title=${encodeURIComponent(item.title)}` +
        `&cover=${encodeURIComponent(item.cover || '')}` +
        `&url=${encodeURIComponent(item.shareUrl || item.url || '')}` +
        `&data=${encodeURIComponent(JSON.stringify(item))}`
    })
  },

  onEditTap(e) {
    const item = e.currentTarget.dataset.item
    if (!item || !item.id) return
    wx.navigateTo({
      url: `/pages/invitation/form?data=${encodeURIComponent(JSON.stringify(item))}`
    })
  },

  async onDeleteTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '确定删除该请柬吗？',
        content: '删除后将不能恢复。',
        success: res => resolve(!!res.confirm),
        fail: () => resolve(false)
      })
    })
    if (!confirmed) return
    wx.showLoading({ title: '删除中...', mask: true })
    try {
      const res = await network.xgwInvitationDelete({ id })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res, '删除失败'))
      }
      wx.showToast({ title: '删除成功', icon: 'success' })
      this.fetchList()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err && err.message ? err.message : '删除失败', icon: 'none' })
    }
  }
})
