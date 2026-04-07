const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

const PAGE_SIZE = 10

const TABS = [
  { key: 'merchant', label: '商家', type: 1, listKey: 'merchantList' },
  { key: 'example', label: '案例', type: 3, listKey: 'exampleList' },
  { key: 'goods', label: '商品', type: 4, listKey: 'goodsList' }
]

function safeStr(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function formatPrice(value) {
  const text = safeStr(value).trim()
  if (!text) return '0'
  const num = Number(text)
  if (!Number.isFinite(num)) return text
  return Number.isInteger(num) ? String(num) : num.toFixed(2)
}

function normalizeImages(value) {
  if (Array.isArray(value)) {
    return value.map(item => safeStr(item).trim()).filter(Boolean)
  }
  const text = safeStr(value).trim()
  if (!text) return []
  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      return normalizeImages(JSON.parse(text))
    } catch (e) {
    }
  }
  if (text.includes(',')) {
    return text.split(',').map(item => item.trim()).filter(Boolean)
  }
  return [text]
}

function normalizeMerchantItem(item = {}) {
  return {
    id: asNumber(item.userid || item.id),
    head: safeStr(item.head),
    nickname: safeStr(item.nickname, '未命名商家'),
    occupation: safeStr(item.occupationid, '商家'),
    address: safeStr(item.address || item.site || item.diqu, '暂未设置地址')
  }
}

function normalizeExampleItem(item = {}) {
  return {
    id: asNumber(item.id),
    cover: safeStr(item.weddingcover),
    title: safeStr(item.title, '未命名案例'),
    desc: safeStr(item.weddingdescribea || item.weddingdescribe, '暂无简介'),
    price: formatPrice(item.weddingexpenses),
    careCount: asNumber(item.followed, 0)
  }
}

function normalizeGoodsItem(item = {}) {
  const images = normalizeImages(item.shopimg)
  return {
    id: asNumber(item.shopid || item.id),
    cover: images[0] || '',
    title: safeStr(item.shopname, '未命名商品'),
    price: formatPrice(item.price),
    sold: asNumber(item.num || item.saled, 0)
  }
}

function getTabIndexByQuery(tabKey) {
  const index = TABS.findIndex(item => item.key === tabKey)
  return index >= 0 ? index : 0
}

Page({
  data: {
    tabs: TABS,
    activeTab: 0,
    activeSummary: '全部商家(0)',
    activeLoaded: false,
    activeLoading: false,
    activeNoMore: false,
    activeListLength: 0,
    defaultAvatar: '/images/default.webp',
    load_img_erro: '/images/load_img_erro.webp',
    merchantList: [],
    exampleList: [],
    goodsList: [],
    tabState: {
      merchant: { page: 0, loading: false, loaded: false, noMore: false },
      example: { page: 0, loading: false, loaded: false, noMore: false },
      goods: { page: 0, loading: false, loaded: false, noMore: false }
    }
  },

  onLoad(options) {
    const activeTab = getTabIndexByQuery(safeStr(options && options.tab))
    this.setData({ activeTab })
    this.syncActiveMeta()
    this.ensureLogin()
  },

  onShow() {
    if (!xgwAuth.isLogined()) return
    this.ensureCurrentTabLoaded()
  },

  onPullDownRefresh() {
    if (!xgwAuth.isLogined()) {
      wx.stopPullDownRefresh()
      return
    }
    this.loadCurrentTab(true)
  },

  onReachBottom() {
    if (!xgwAuth.isLogined()) return
    this.loadCurrentTab(false)
  },

  ensureLogin() {
    if (xgwAuth.isLogined()) {
      return true
    }
    wx.showModal({
      title: '请先登录',
      content: '当前未登录，是否前往登录？',
      confirmText: '去登录',
      confirmColor: '#e64340',
      success: res => {
        if (!res.confirm) return
        wx.navigateTo({
          url: '/pages/login/index'
        })
      }
    })
    return false
  },

  getActiveTabConfig() {
    return TABS[this.data.activeTab] || TABS[0]
  },

  syncActiveMeta() {
    const tab = this.getActiveTabConfig()
    const state = this.data.tabState[tab.key] || {}
    const list = this.data[tab.listKey] || []
    this.setData({
      activeSummary: `全部${tab.label}(${list.length})`,
      activeLoaded: !!state.loaded,
      activeLoading: !!state.loading,
      activeNoMore: !!state.noMore,
      activeListLength: list.length
    })
  },

  ensureCurrentTabLoaded() {
    const tab = this.getActiveTabConfig()
    const state = this.data.tabState[tab.key]
    if (state && (state.loaded || state.loading)) return
    this.loadTabData(tab, true)
  },

  loadCurrentTab(refresh) {
    const tab = this.getActiveTabConfig()
    this.loadTabData(tab, refresh)
  },

  async loadTabData(tab, refresh = false) {
    const state = this.data.tabState[tab.key]
    if (!state) return
    if (state.loading) return
    if (!refresh && state.noMore) return

    const nextPage = refresh ? 1 : state.page + 1
    this.setData({
      [`tabState.${tab.key}.loading`]: true
    })
    this.syncActiveMeta()

    try {
      const res = await network.myAttentionList({
        p: String(nextPage),
        rows: String(PAGE_SIZE),
        type: String(tab.type)
      })

      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '加载失败')
      }

      const data = res.data || {}
      let rawList = []
      if (tab.key === 'merchant') rawList = Array.isArray(data.shangjia) ? data.shangjia : []
      if (tab.key === 'example') rawList = Array.isArray(data.anli) ? data.anli : []
      if (tab.key === 'goods') rawList = Array.isArray(data.shangping) ? data.shangping : []

      const normalizedList = rawList.map(item => {
        if (tab.key === 'merchant') return normalizeMerchantItem(item)
        if (tab.key === 'example') return normalizeExampleItem(item)
        return normalizeGoodsItem(item)
      })

      const currentList = refresh ? [] : (this.data[tab.listKey] || [])
      this.setData({
        [tab.listKey]: currentList.concat(normalizedList),
        [`tabState.${tab.key}.page`]: nextPage,
        [`tabState.${tab.key}.loaded`]: true,
        [`tabState.${tab.key}.noMore`]: normalizedList.length < PAGE_SIZE
      })
      this.syncActiveMeta()
    } catch (e) {
      wx.showToast({
        title: e && e.message ? e.message : '加载失败',
        icon: 'none'
      })
      if (refresh) {
        this.setData({
          [tab.listKey]: [],
          [`tabState.${tab.key}.page`]: 0,
          [`tabState.${tab.key}.loaded`]: true,
          [`tabState.${tab.key}.noMore`]: false
        })
        this.syncActiveMeta()
      }
    } finally {
      this.setData({
        [`tabState.${tab.key}.loading`]: false
      })
      this.syncActiveMeta()
      wx.stopPullDownRefresh()
    }
  },

  onTabTap(e) {
    const index = e && e.currentTarget ? asNumber(e.currentTarget.dataset.index, 0) : 0
    if (index === this.data.activeTab) return
    this.setData({ activeTab: index })
    this.syncActiveMeta()
    this.ensureCurrentTabLoaded()
  },

  onImageError(e) {
    const index = e && e.currentTarget ? asNumber(e.currentTarget.dataset.index, -1) : -1
    const tabKey = e && e.currentTarget ? safeStr(e.currentTarget.dataset.tab) : ''
    const field = e && e.currentTarget ? safeStr(e.currentTarget.dataset.field, 'cover') : 'cover'
    if (index < 0 || !tabKey) return

    const tab = TABS.find(item => item.key === tabKey)
    if (!tab) return

    this.setData({
      [`${tab.listKey}[${index}].${field}`]: this.data.load_img_erro
    })
  },

  onMerchantTap() {
    wx.showToast({
      title: '商家详情开发中',
      icon: 'none'
    })
  },

  onExampleTap(e) {
    const id = e && e.currentTarget ? asNumber(e.currentTarget.dataset.id, 0) : 0
    if (!id) return
    wx.navigateTo({
      url: `/packageCase/pages/detail/index?id=${id}`
    })
  },

  onGoodsTap(e) {
    const id = e && e.currentTarget ? asNumber(e.currentTarget.dataset.id, 0) : 0
    if (!id) return
    wx.navigateTo({
      url: `/pages/goods-details/index?id=${id}`
    })
  }
})
