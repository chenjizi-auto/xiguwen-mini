const network = require('../../api/network.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

Page({
  data: {
    id: 0,
    title: '电子请柬',
    url: '',
    cover: '',
    rawData: '',
    loading: true,
    errorText: ''
  },

  onLoad(options) {
    const id = asNumber(options && options.id, 0)
    const title = decodeURIComponent(safeText(options && options.title, '电子请柬'))
    const url = decodeURIComponent(safeText(options && options.url))
    const cover = decodeURIComponent(safeText(options && options.cover))
    const rawData = decodeURIComponent(safeText(options && options.data))
    this.setData({ id, title, url, cover, rawData })
    wx.setNavigationBarTitle({ title })
    wx.showShareMenu({
      menus: ['shareAppMessage']
    })
    if (url) {
      this.setData({ loading: false, errorText: '' })
      this.syncShareMeta()
      return
    }
    this.fetchUrl()
  },

  getSharePayload() {
    const title = this.data.title || '电子请柬'
    const describe = `${title}，诚挚邀请您的到来。`
    return {
      sharetitle: title,
      sharedescribe: describe,
      sharecover: this.data.cover || ''
    }
  },

  async fetchUrl() {
    if (!this.data.id) {
      this.setData({ loading: false, errorText: '请柬参数有误' })
      return
    }
    this.setData({ loading: true, errorText: '' })
    try {
      const res = await network.xgwInvitationUrl({
        id: this.data.id,
        type: 1
      })
      const url = safeText(res && res.data)
      if (!res || res.code !== 0 || !url) {
        throw new Error((res && (res.message || res.msg)) || '加载失败')
      }
      this.setData({
        url,
        loading: false,
        errorText: ''
      })
      this.syncShareMeta()
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '请柬地址加载失败'
      })
    }
  },

  onEditTap() {
    if (!this.data.rawData) {
      wx.showToast({
        title: '当前请柬缺少编辑参数',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: `/pages/invitation/form?data=${encodeURIComponent(this.data.rawData)}`
    })
  },

  async syncShareMeta() {
    if (!this.data.id) return
    try {
      await network.xgwInvitationShareSave(Object.assign({ id: this.data.id }, this.getSharePayload()))
    } catch (err) {}
  },

  onShareAppMessage() {
    const payload = this.getSharePayload()
    return {
      title: payload.sharetitle,
      path:
        `/pages/invitation/preview?id=${this.data.id}` +
        `&title=${encodeURIComponent(payload.sharetitle)}` +
        `&cover=${encodeURIComponent(this.data.cover || '')}` +
        `&url=${encodeURIComponent(this.data.url || '')}` +
        `&data=${encodeURIComponent(this.data.rawData || '')}`,
      imageUrl: this.data.cover || undefined
    }
  }
})
