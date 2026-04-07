const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

const DEFAULT_COVER = '/images/load_img.webp'
const PAGE_SIZE = 15
const STATUS_TABS = [
  { key: 1, title: '审核中' },
  { key: 2, title: '审核通过' },
  { key: 3, title: '审核未通过' }
]

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function formatPrice(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return safeText(value, '0')
  return num % 1 === 0 ? String(num) : num.toFixed(2)
}

function splitImages(value) {
  if (Array.isArray(value)) return value.map(item => safeText(item)).filter(Boolean)
  const text = safeText(value)
  return text ? text.split(',').map(item => item.trim()).filter(Boolean) : []
}

function getErrorMessage(err, fallback = '加载失败，请稍后重试') {
  if (!err) return fallback
  if (typeof err === 'string') return err
  return err.message || err.errMsg || fallback
}

function getStatusMeta(item = {}) {
  const state = asNumber(item.state, 0)
  const status = asNumber(item.status, 0)
  if (state === 1) return { text: '审核中', tone: 'pending' }
  if (state === 2) {
    return {
      text: status === 1 ? '审核通过 · 已上架' : '审核通过 · 未上架',
      tone: status === 1 ? 'success' : 'warning'
    }
  }
  if (state === 3) return { text: '审核未通过', tone: 'danger' }
  return { text: '待完善', tone: 'draft' }
}

function normalizeItem(item = {}) {
  const statusMeta = getStatusMeta(item)
  const imgs = splitImages(item.shopimg)
  return {
    id: asNumber(item.shopid, 0),
    title: safeText(item.shopname, '未命名商品'),
    priceText: `¥ ${formatPrice(item.price)}`,
    deductibleText: safeText(item.coupons_price) ? `抵扣 ¥${formatPrice(item.coupons_price)}` : '',
    cover: imgs[0] || DEFAULT_COVER,
    categoryText: [safeText(item.pcolumnname), safeText(item.columnname)].filter(Boolean).join(' / '),
    statusText: statusMeta.text,
    statusTone: statusMeta.tone
  }
}

Page({
  data: {
    tabs: STATUS_TABS,
    activeStatus: 1,
    list: [],
    page: 1,
    rows: PAGE_SIZE,
    loading: false,
    loadingMore: false,
    finished: false,
    loadError: '',
    defaultCover: DEFAULT_COVER
  },

  onLoad(options) {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    const activeStatus = asNumber(options && options.status, 1)
    this.setData({
      activeStatus: STATUS_TABS.some(item => item.key === activeStatus) ? activeStatus : 1
    })
    this.loadList(true)
  },

  onShow() {
    if (this._shouldRefreshOnShow) {
      this._shouldRefreshOnShow = false
      this.loadList(true)
    }
  },

  onHide() {
    if (this._hasLoaded) this._shouldRefreshOnShow = true
  },

  onPullDownRefresh() {
    this.loadList(true)
  },

  onReachBottom() {
    this.loadList(false)
  },

  onTabTap(e) {
    const nextStatus = asNumber(e.currentTarget.dataset.status, 1)
    if (nextStatus === this.data.activeStatus) return
    this.setData({ activeStatus: nextStatus, loadError: '' })
    this.loadList(true)
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/my/commodity/form/index' })
  },

  onCardTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    wx.navigateTo({ url: `/pages/my/commodity/detail/index?id=${id}` })
  },

  handleImageError(e) {
    const index = asNumber(e.currentTarget.dataset.index, -1)
    if (index < 0) return
    const list = this.data.list.slice()
    if (!list[index]) return
    list[index].cover = DEFAULT_COVER
    this.setData({ list })
  },

  async loadList(isRefresh) {
    if (isRefresh && this.data.loading) return
    if (!isRefresh && (this.data.loading || this.data.loadingMore || this.data.finished)) return
    this._listRequestId = (this._listRequestId || 0) + 1
    const requestId = this._listRequestId
    this.setData({
      loading: isRefresh,
      loadingMore: !isRefresh,
      loadError: isRefresh ? '' : this.data.loadError
    })
    try {
      const page = isRefresh ? 1 : this.data.page
      const res = await network.xgwCommodityList({
        p: page,
        rows: this.data.rows,
        status: this.data.activeStatus
      })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '加载失败')
      }
      if (requestId !== this._listRequestId) return
      const rows = Array.isArray(res.data) ? res.data.map(normalizeItem) : []
      const list = isRefresh ? rows : this.data.list.concat(rows)
      this._hasLoaded = true
      this.setData({
        list,
        page: page + 1,
        finished: rows.length < this.data.rows
      })
    } catch (err) {
      if (requestId !== this._listRequestId) return
      const message = getErrorMessage(err)
      this.setData({ loadError: message })
      if (!this.data.list.length) {
        wx.showToast({ title: message, icon: 'none' })
      }
    } finally {
      if (requestId !== this._listRequestId) return
      this.setData({ loading: false, loadingMore: false })
      wx.stopPullDownRefresh()
    }
  }
})
