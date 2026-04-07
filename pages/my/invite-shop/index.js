const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

Page({
  data: {
    loading: true,
    shareInfo: null
  },

  onLoad() {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    this.fetchInfo()
  },

  async fetchInfo() {
    this.setData({ loading: true })
    try {
      const res = await network.xgwInviteShopInfo({})
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.message || res.msg)) || '加载失败')
      }
      this.setData({
        shareInfo: {
          url: safeText(res.data.url),
          qrcode: safeText(res.data.erweima)
        },
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err && err.message ? err.message : '邀请信息加载失败', icon: 'none' })
    }
  },

  copyLink() {
    const url = safeText(this.data.shareInfo && this.data.shareInfo.url)
    if (!url) return
    wx.setClipboardData({ data: url })
  },

  previewCode() {
    const qrcode = safeText(this.data.shareInfo && this.data.shareInfo.qrcode)
    if (!qrcode) return
    wx.previewImage({
      current: qrcode,
      urls: [qrcode]
    })
  },

  onShareAppMessage() {
    return {
      title: '邀请婚嫁商家入驻喜顾问',
      path: '/pages/start/start',
      imageUrl: safeText(this.data.shareInfo && this.data.shareInfo.qrcode)
    }
  }
})
