const network = require('../../../api/network.js')

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function formatPrice(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : safeStr(v, '0.00')
}

function normalizeDetail(data = {}) {
  const photos = Array.isArray(data.imglist)
    ? data.imglist.map(item => (typeof item === 'string' ? item : safeStr(item && item.photo))).filter(Boolean)
    : []
  return {
    id: asNumber(data.quotationid, 0),
    title: safeStr(data.name, '未命名报价'),
    price: formatPrice(data.price),
    temporarypay: formatPrice(data.temporarypay),
    deductible: formatPrice(data.deductible),
    content: safeStr(data.content),
    photos
  }
}

Page({
  data: {
    loading: true,
    detail: null
  },

  onLoad(options) {
    this.quoteId = asNumber(options && options.id, 0)
    this.fetchDetail()
  },

  async fetchDetail() {
    this.setData({ loading: true })
    try {
      const res = await network.xgwQuoteDetail({ quotationid: this.quoteId })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.msg || res.message)) || '加载失败')
      }
      this.setData({
        loading: false,
        detail: normalizeDetail(res.data)
      })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({
        title: safeStr(err && err.message, '加载失败'),
        icon: 'none'
      })
    }
  },

  previewImage(e) {
    const url = safeStr(e && e.currentTarget ? e.currentTarget.dataset.url : '')
    const detail = this.data.detail
    if (!url || !detail) return
    wx.previewImage({
      current: url,
      urls: detail.photos || [url]
    })
  }
})
