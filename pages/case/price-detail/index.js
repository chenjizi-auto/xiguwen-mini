const network = require('../../../api/network.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function formatPrice(value) {
  const num = asNumber(value, 0)
  return `¥${num}`
}

function normalizeRows(list = []) {
  return (Array.isArray(list) ? list : []).map(item => ({
    name: safeText(item && item.a, '--'),
    price: formatPrice(item && item.b)
  }))
}

function normalizeGroups(list = []) {
  return (Array.isArray(list) ? list : []).map(item => ({
    title: safeText(item && item.title, '未命名分类'),
    subtotal: formatPrice(item && item.xiaoji),
    rows: normalizeRows(item && item.data)
  }))
}

Page({
  data: {
    loading: true,
    errorText: '',
    totalPrice: '',
    groups: []
  },

  onLoad(options) {
    this.caseId = asNumber(options && options.id, 0)
    if (!this.caseId) {
      this.setData({
        loading: false,
        errorText: '缺少案例参数'
      })
      return
    }
    wx.setNavigationBarTitle({
      title: '查看明细'
    })
    this.fetchDetail()
  },

  async fetchDetail() {
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const res = await network.xgwCasePriceDetail({ id: this.caseId })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '加载明细失败')
      }
      const groups = normalizeGroups(res.data)
      this.setData({
        loading: false,
        totalPrice: formatPrice(res && res.zongji),
        groups
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载明细失败'
      })
    }
  },

  onRetryTap() {
    if (!this.caseId) return
    this.fetchDetail()
  }
})
