const network = require('../../../../api/network.js')

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
    weigh: safeStr(data.weigh, '--'),
    content: safeStr(data.content),
    state: asNumber(data.state, 0),
    status: asNumber(data.status, 0),
    reason: safeStr(data.statecontent),
    photos
  }
}

Page({
  data: {
    loading: true,
    processing: false,
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
  },

  async doRequest(request, payload, successText) {
    if (this.data.processing) return
    this.setData({ processing: true })
    wx.showLoading({ title: '处理中...', mask: true })
    try {
      const res = await request(payload)
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '操作失败')
      }
      wx.showToast({
        title: successText,
        icon: 'success'
      })
      this.fetchDetail()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: safeStr(err && err.message, '操作失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ processing: false })
    }
  },

  onDelete() {
    wx.showModal({
      title: '删除报价',
      content: '删除后不可恢复，是否继续？',
      confirmColor: '#e64340',
      success: res => {
        if (!res.confirm) return
        this.doRequest(network.xgwQuoteDelete, { quotationid: this.quoteId }, '删除成功')
      }
    })
  },

  goEdit() {
    const detail = this.data.detail
    if (!detail) return
    wx.navigateTo({
      url: `/pages/my/quote/form/index?id=${detail.id}`
    })
  },

  onSubmitReview() {
    this.doRequest(network.xgwQuoteSubmit, { quotationid: this.quoteId }, '提交成功')
  },

  onPutOn() {
    this.doRequest(network.xgwQuoteStatus, { quotationid: this.quoteId, status: 1 }, '已上架')
  },

  onPutOff() {
    this.doRequest(network.xgwQuoteStatus, { quotationid: this.quoteId, status: 0 }, '已下架')
  },

  async onShowReason() {
    wx.showLoading({ title: '加载中...', mask: true })
    try {
      const res = await network.xgwQuoteReason({ quotationid: this.quoteId })
      wx.hideLoading()
      wx.showModal({
        title: '未通过原因',
        content: safeStr((res && res.data) || (this.data.detail && this.data.detail.reason), '暂无原因'),
        showCancel: false
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '原因加载失败',
        icon: 'none'
      })
    }
  }
})
