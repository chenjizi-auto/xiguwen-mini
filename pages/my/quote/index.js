const network = require('../../../api/network.js')

const TABS = [
  { label: '审核中', state: 1 },
  { label: '审核通过', state: 2 },
  { label: '审核未通过', state: 3 }
]

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

function normalizeItem(item = {}) {
  const state = asNumber(item.state, 0)
  const status = asNumber(item.status, 0)
  return {
    id: asNumber(item.quotationid, 0),
    title: safeStr(item.name, '未命名报价'),
    priceText: `¥ ${formatPrice(item.price)}`,
    deductibleText: safeStr(item.deductible) ? `抵扣 ¥${formatPrice(item.deductible)}` : '',
    cover: Array.isArray(item.imglist) && item.imglist.length ? safeStr(item.imglist[0]) : '/images/default.webp',
    state,
    status,
    statusText:
      state === 1
        ? '审核中'
        : state === 2
          ? (status === 1 ? '已上架' : '未上架')
          : state === 3
            ? '审核未通过'
            : '待提交',
    raw: item
  }
}

Page({
  data: {
    tabs: TABS,
    tabIndex: 0,
    list: [],
    page: 1,
    rows: 20,
    loading: false,
    finished: false,
    errorText: ''
  },

  onLoad() {
    this.fetchList(true)
  },

  onShow() {
    if (this._refreshOnShow) {
      this._refreshOnShow = false
      this.fetchList(true)
    }
  },

  onTabChange(e) {
    this.setData({
      tabIndex: asNumber(e && e.detail ? e.detail.index : 0, 0),
      page: 1,
      finished: false
    })
    this.fetchList(true)
  },

  onPullDownRefresh() {
    this.fetchList(true).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.loading || this.data.finished) return
    this.fetchList(false)
  },

  async fetchList(reset = false) {
    if (this.data.loading) return
    const nextPage = reset ? 1 : this.data.page
    const tab = (this.data.tabs || [])[this.data.tabIndex] || TABS[0]
    this.setData({
      loading: true,
      errorText: reset ? '' : this.data.errorText
    })
    try {
      const res = await network.xgwQuoteList({
        p: nextPage,
        rows: this.data.rows,
        state: tab.state
      })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '加载失败')
      }
      const source = Array.isArray(res.data) ? res.data : []
      const list = source.map(normalizeItem)
      this.setData({
        list: reset ? list : (this.data.list || []).concat(list),
        page: nextPage + 1,
        finished: list.length < this.data.rows,
        loading: false,
        errorText: ''
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: '报价列表加载失败，请稍后重试'
      })
      if (reset) this.setData({ list: [] })
    }
  },

  goAdd() {
    this._refreshOnShow = true
    wx.navigateTo({
      url: '/pages/my/quote/form/index'
    })
  },

  onCardTap(e) {
    const id = asNumber(e && e.currentTarget ? e.currentTarget.dataset.id : 0, 0)
    if (!id) return
    this._refreshOnShow = true
    wx.navigateTo({
      url: `/pages/my/quote/detail/index?id=${id}`
    })
  }
})
