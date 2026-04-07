function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

const network = require('../../api/network.js')

const PAGE_CONFIG = {
  0: {
    title: '婚庆订单',
    tabs: [
      { label: '全部', status: '' },
      { label: '待付款', status: '10' },
      { label: '待接单', status: '60' },
      { label: '待服务', status: '70' },
      { label: '已服务', status: '79' },
      { label: '待评价', status: '80' },
      { label: '已完成', status: '90' }
    ]
  },
  2: {
    title: '婚庆接单',
    tabs: [
      { label: '全部', status: '' },
      { label: '待付款', status: '10' },
      { label: '待接单', status: '60' },
      { label: '待服务', status: '70' },
      { label: '已服务', status: '79' },
      { label: '待评价', status: '80' },
      { label: '已完成', status: '90' },
      { label: '已关闭', status: '20' },
      { label: '退款单', status: '100' }
    ]
  }
}

function resolveInitialTab(intentType, sourceIndex) {
  if (sourceIndex < 0) return 0
  if ((intentType === 0 || intentType === 2) && sourceIndex === 4) {
    return 5
  }
  return sourceIndex
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function formatPrice(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) {
    return safeStr(v, '0.00')
  }
  return n.toFixed(2)
}

function formatStatus(intentType, item) {
  const status = asNumber(item && item.status, -1)
  if (intentType === 2) {
    if (status === 10) return '待付款'
    if (status === 60) return '待接单'
    if (status === 70) return '待服务'
    if (status === 71) return '已服务未付尾款'
    if (status === 79) return '已服务'
    if (status === 80) return '待评价'
    if (status === 90) return '已完成'
    if (status === 20) return '已关闭'
    if (status === 100) return '退款单'
    return '订单状态'
  }
  if (status === 10) return '待付款'
  if (status === 60) return '待接单'
  if (status === 70) return '待服务'
  if (status === 79) return '已服务'
  if (status === 80) return '待评价'
  if (status === 90) return '已完成'
  if (status === 20) return '已关闭'
  return '订单状态'
}

function formatRefundStatus(tuihuo) {
  const t = asNumber(tuihuo, 0)
  if (t === 2) return '退款中'
  if (t === 3) return '同意退款'
  if (t === 4) return '拒绝退款'
  return ''
}

function mapListItem(intentType, item = {}) {
  return {
    id: asNumber(item.order_id, 0),
    orderSn: safeStr(item.order_sn),
    title: safeStr(item.baojia_name, '未命名服务'),
    cover: safeStr(item.baojia_image, '/images/default.webp'),
    spec: safeStr(item.specification, '暂无规格'),
    priceText: `¥ ${formatPrice(item.zongjine || item.order_amount || item.payjine)}`,
    statusText: formatStatus(intentType, item),
    refundText: formatRefundStatus(item.tuihuo),
    rawStatus: asNumber(item.status, 0),
    raw: item
  }
}

Page({
  data: {
    intentType: 0,
    title: '婚庆订单',
    currentLabel: '全部',
    tabIndex: 0,
    tabs: [],
    list: [],
    page: 1,
    rows: 10,
    loading: false,
    finished: false,
    errorText: ''
  },

  onLoad(options) {
    const intentType = asNumber(options && options.intentType, 0)
    const sourceIndex = asNumber(options && options.index, 0)
    const config = PAGE_CONFIG[intentType] || PAGE_CONFIG[0]
    const tabIndex = Math.min(
      resolveInitialTab(intentType, sourceIndex),
      Math.max((config.tabs || []).length - 1, 0)
    )

    this.setData({
      intentType,
      title: config.title,
      currentLabel: (config.tabs[tabIndex] || {}).label || '全部',
      tabs: config.tabs,
      tabIndex
    })

    wx.setNavigationBarTitle({
      title: config.title
    })

    this.fetchList(true)
  },

  onTabChange(e) {
    const index = asNumber(e && e.detail ? e.detail.index : 0, 0)
    this.setData({
      tabIndex: index,
      currentLabel: ((this.data.tabs || [])[index] || {}).label || '全部',
      page: 1,
      finished: false,
      errorText: ''
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

  getCurrentStatus() {
    const tabs = this.data.tabs || []
    const current = tabs[this.data.tabIndex] || {}
    return safeStr(current.status)
  },

  async fetchList(reset = false) {
    if (this.data.loading) return
    const nextPage = reset ? 1 : this.data.page
    const params = {
      p: nextPage,
      rows: this.data.rows
    }
    const status = this.getCurrentStatus()
    if (status) {
      params.status = status
    }

    this.setData({
      loading: true,
      errorText: reset ? '' : this.data.errorText
    })

    try {
      const request = this.data.intentType === 2 ? network.weddingJiedanList : network.weddingOrderList
      const res = await request(params)
      if (!res || res.code !== 0) {
        throw new Error((res && res.msg) || 'request failed')
      }
      const source = (((res || {}).data || {}).data) || []
      const list = source.map(item => mapListItem(this.data.intentType, item))

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
        errorText: '加载失败，请稍后重试'
      })
      if (reset) {
        this.setData({ list: [] })
      }
    }
  },

  onCardTap(e) {
    const id = asNumber(e && e.currentTarget ? e.currentTarget.dataset.id : 0, 0)
    if (!id) return
    wx.navigateTo({
      url: `/pages/wedding-order/detail?id=${id}&intentType=${this.data.intentType}`
    })
  }
})
