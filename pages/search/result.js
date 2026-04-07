const network = require('../../api/network-main.js')
const api = require('../../api/base.js')

const PAGE_SIZE = 15

const TAB_CONFIG = {
  merchant: {
    stype: 'sj',
    listField: 'shangjia',
    sortOptions: [
      { key: 'default', label: '默认排序' },
      { key: 'comprehensive', label: '综合排序' }
    ]
  },
  case: {
    stype: 'al',
    listField: 'anli',
    sortOptions: [
      { key: 'default', label: '默认排序' },
      { key: 'comprehensive', label: '综合排序' }
    ]
  },
  quote: {
    stype: 'fw',
    listField: 'baojia',
    sortOptions: [
      { key: 'comprehensive', label: '综合排序' },
      { key: 'priceDesc', label: '价格降序' },
      { key: 'priceAsc', label: '价格升序' },
      { key: 'sales', label: '销量排序' }
    ]
  },
  goods: {
    stype: 'sp',
    listField: 'shop',
    sortOptions: [
      { key: 'comprehensive', label: '综合排序' },
      { key: 'priceDesc', label: '价格降序' },
      { key: 'priceAsc', label: '价格升序' },
      { key: 'sales', label: '销量排序' }
    ]
  }
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function absoluteUrl(url = '') {
  const text = safeText(url).trim()
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text
  if (text.startsWith('/')) return `${api.ApiRoot}${text}`
  return text
}

function formatMoney(value, fallback = '面议') {
  const text = safeText(value).trim()
  if (!text || text === '0' || text === '0.00') return fallback
  return `￥${text}`
}

function parseImageList(value) {
  if (Array.isArray(value)) {
    return value.map(item => absoluteUrl(typeof item === 'string' ? item : item && (item.url || item.photourl))).filter(Boolean)
  }
  const text = safeText(value).trim()
  if (!text) return []
  if (text.startsWith('[')) {
    try {
      return JSON.parse(text).map(item => absoluteUrl(item)).filter(Boolean)
    } catch (err) {}
  }
  return text
    .split(',')
    .map(item => absoluteUrl(item.trim()))
    .filter(Boolean)
}

function getSelectedCity() {
  const selected = wx.getStorageSync('selectedCity')
  return {
    id: asNumber(selected && selected.id, 273),
    name: safeText(selected && selected.name, '成都')
  }
}

function normalizeMerchantList(list = []) {
  return (Array.isArray(list) ? list : []).map(item => ({
    id: safeText(item && item.userid),
    head: absoluteUrl(item && item.head) || '/images/default.webp',
    nickname: safeText(item && item.nickname, '婚礼商家'),
    occupation: safeText(item && item.occupationid, '婚礼商家'),
    price: `${formatMoney(item && item.zuidijia)}起`,
    goodRate: `${safeText(item && item.haopinl, '0')}%`,
    commentCount: safeText(item && item.evaluate, '0'),
    fans: safeText(item && item.fans, '0'),
    isVip: asNumber(item && item.isshopvip, 0) === 1,
    sincerity: asNumber(item && item.sincerity, 0) === 1,
    platform: asNumber(item && item.platform, 0) === 1,
    realname: asNumber(item && item.shiming, 0) === 1
  })).filter(item => item.id)
}

function normalizeCaseList(list = []) {
  return (Array.isArray(list) ? list : []).map(item => ({
    id: asNumber(item && item.id, 0),
    cover: absoluteUrl(item && item.weddingcover) || '/images/load_img.webp',
    head: absoluteUrl(item && item.head) || '/images/default.webp',
    nickname: safeText(item && item.nickname, '案例商家'),
    title: safeText(item && item.title, '未命名案例'),
    price: formatMoney(item && item.weddingexpenses),
    desc: safeText(item && item.weddingdescribe, '暂无案例描述'),
    viewCount: safeText(item && item.clicked, '0'),
    score: safeText(item && item.goodscore, '0'),
    commentCount: safeText(item && item.commented, '0'),
    userid: safeText(item && item.userid)
  })).filter(item => item.id)
}

function normalizeQuoteList(list = []) {
  return (Array.isArray(list) ? list : []).map(item => {
    const images = parseImageList(item && item.imglist)
    return {
      id: asNumber(item && item.quotationid, 0),
      cover: images[0] || '/images/load_img.webp',
      title: safeText(item && item.name, '未命名报价'),
      price: formatMoney(item && item.price),
      soldText: `已售${safeText(item && item.num, '0')}`
    }
  }).filter(item => item.id)
}

function normalizeGoodsList(list = []) {
  return (Array.isArray(list) ? list : []).map(item => {
    const images = parseImageList(item && (item.shopimg || item.imglist))
    return {
      id: asNumber(item && (item.shopid || item.id), 0),
      cover: images[0] || '/images/load_img.webp',
      title: safeText(item && (item.shopname || item.name), '未命名商品'),
      price: formatMoney(item && item.price),
      soldText: `已售${safeText(item && item.num, '0')}`
    }
  }).filter(item => item.id)
}

function normalizeList(tabKey, list) {
  if (tabKey === 'merchant') return normalizeMerchantList(list)
  if (tabKey === 'case') return normalizeCaseList(list)
  if (tabKey === 'quote') return normalizeQuoteList(list)
  return normalizeGoodsList(list)
}

function buildParams(tabKey, page, keyword, sortKey, cityInfo) {
  const config = TAB_CONFIG[tabKey]
  const params = {
    p: page,
    rows: PAGE_SIZE,
    cont: keyword,
    types: 1,
    stype: config.stype,
    city: cityInfo.id
  }
  if (tabKey === 'merchant') {
    params.countyid = 0
    params.occupationid = 0
    params.comprehensive = sortKey === 'comprehensive' ? 1 : 0
    params.college = 0
    params.isshopvip = 0
    params.platform = 0
    params.sincerity = 0
    params.team = 0
    return params
  }
  if (tabKey === 'case') {
    params.ambient = 0
    params.type = 0
    params.orderby = sortKey === 'comprehensive' ? 1 : 0
    return params
  }
  params.comprehensive = sortKey === 'comprehensive' ? 1 : 0
  params.salesvolume = sortKey === 'sales' ? 1 : 0
  if (sortKey === 'priceDesc') params.price = 'desc'
  if (sortKey === 'priceAsc') params.price = 'asc'
  return params
}

Page({
  data: {
    keyword: '',
    cityName: '成都',
    tabs: [
      { key: 'merchant', label: '商家' },
      { key: 'case', label: '案例' },
      { key: 'quote', label: '报价' },
      { key: 'goods', label: '商品' }
    ],
    activeTab: 'merchant',
    currentSortKey: 'default',
    currentSortOptions: TAB_CONFIG.merchant.sortOptions,
    merchantList: [],
    merchantPage: 1,
    merchantLoading: false,
    merchantHasMore: true,
    merchantLoaded: false,
    merchantSortKey: 'default',
    caseList: [],
    casePage: 1,
    caseLoading: false,
    caseHasMore: true,
    caseLoaded: false,
    caseSortKey: 'default',
    quoteList: [],
    quotePage: 1,
    quoteLoading: false,
    quoteHasMore: true,
    quoteLoaded: false,
    quoteSortKey: 'comprehensive',
    goodsList: [],
    goodsPage: 1,
    goodsLoading: false,
    goodsHasMore: true,
    goodsLoaded: false,
    goodsSortKey: 'comprehensive'
  },

  onLoad(options) {
    const cityInfo = getSelectedCity()
    const keyword = safeText(options && options.keyword).trim()
    this.setData({
      keyword,
      cityName: cityInfo.name
    })
    if (!keyword) {
      wx.showToast({
        title: '缺少搜索关键词',
        icon: 'none'
      })
      return
    }
    this.syncActiveState('merchant')
    this.fetchTabData('merchant', true)
  },

  onReachBottom() {
    const tabKey = this.data.activeTab
    const loadingKey = `${tabKey}Loading`
    const hasMoreKey = `${tabKey}HasMore`
    if (this.data[loadingKey] || !this.data[hasMoreKey]) return
    this.fetchTabData(tabKey, false)
  },

  onKeywordInput(e) {
    this.setData({
      keyword: e.detail.value
    })
  },

  onSearchConfirm(e) {
    const keyword = safeText(e && e.detail && e.detail.value, this.data.keyword).trim()
    this.setData({ keyword })
    this.reloadAllTabs()
  },

  onSearchTap() {
    this.reloadAllTabs()
  },

  onCancel() {
    wx.navigateBack({
      fail: () => {
        wx.redirectTo({
          url: '/pages/search/index'
        })
      }
    })
  },

  onTabTap(e) {
    const tabKey = safeText(e.currentTarget.dataset.key)
    if (!TAB_CONFIG[tabKey] || tabKey === this.data.activeTab) return
    this.setData({
      activeTab: tabKey,
      currentSortOptions: TAB_CONFIG[tabKey].sortOptions,
      currentSortKey: this.data[`${tabKey}SortKey`]
    })
    this.syncActiveState(tabKey)
    if (!this.data[`${tabKey}Loaded`]) {
      this.fetchTabData(tabKey, true)
    }
  },

  onSortTap(e) {
    const sortKey = safeText(e.currentTarget.dataset.key)
    const tabKey = this.data.activeTab
    const dataKey = `${tabKey}SortKey`
    if (this.data[dataKey] === sortKey) return
    this.setData({
      [dataKey]: sortKey,
      currentSortKey: sortKey
    })
    this.fetchTabData(tabKey, true)
  },

  reloadAllTabs() {
    const keyword = safeText(this.data.keyword).trim()
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      })
      return
    }
    const nextState = {
      merchantLoaded: false,
      caseLoaded: false,
      quoteLoaded: false,
      goodsLoaded: false,
      merchantPage: 1,
      casePage: 1,
      quotePage: 1,
      goodsPage: 1,
      merchantList: [],
      caseList: [],
      quoteList: [],
      goodsList: [],
      merchantHasMore: true,
      caseHasMore: true,
      quoteHasMore: true,
      goodsHasMore: true
    }
    this.setData(nextState)
    this.syncActiveState(this.data.activeTab)
    this.fetchTabData(this.data.activeTab, true)
  },

  syncActiveState(tabKey) {
    const list = this.data[`${tabKey}List`] || []
    const loading = !!this.data[`${tabKey}Loading`]
    const loaded = !!this.data[`${tabKey}Loaded`]
    const hasMore = !!this.data[`${tabKey}HasMore`]
    this.setData({
      currentSortKey: this.data[`${tabKey}SortKey`],
      footerLoading: loading && list.length > 0,
      footerNoMore: loaded && list.length > 0 && !hasMore && !loading
    })
  },

  async fetchTabData(tabKey, reset) {
    const keyword = safeText(this.data.keyword).trim()
    if (!keyword || !TAB_CONFIG[tabKey]) return
    const pageKey = `${tabKey}Page`
    const listKey = `${tabKey}List`
    const loadingKey = `${tabKey}Loading`
    const hasMoreKey = `${tabKey}HasMore`
    const loadedKey = `${tabKey}Loaded`
    const sortKey = this.data[`${tabKey}SortKey`]
    const nextPage = reset ? 1 : this.data[pageKey]
    const cityInfo = getSelectedCity()

    this.setData({
      [loadingKey]: true,
      cityName: cityInfo.name
    })
    try {
      const res = await network.searchUniversal(buildParams(tabKey, nextPage, keyword, sortKey, cityInfo))
      const source = res && res.data ? res.data : {}
      const rawList = source[TAB_CONFIG[tabKey].listField]
      const normalized = normalizeList(tabKey, rawList)
      const merged = reset ? normalized : this.data[listKey].concat(normalized)
      this.setData({
        [listKey]: merged,
        [pageKey]: nextPage + 1,
        [hasMoreKey]: normalized.length >= PAGE_SIZE,
        [loadingKey]: false,
        [loadedKey]: true
      })
      if (tabKey === this.data.activeTab) {
        this.syncActiveState(tabKey)
      }
    } catch (err) {
      this.setData({
        [loadingKey]: false,
        [loadedKey]: true
      })
      if (tabKey === this.data.activeTab) {
        this.syncActiveState(tabKey)
      }
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      })
    }
  },

  onMerchantTap(e) {
    const userid = safeText(e.currentTarget.dataset.userid)
    if (!userid) return
    wx.navigateTo({
      url: `/packageWedding/pages/merchant/detail?userid=${encodeURIComponent(userid)}`
    })
  },

  onCaseTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    wx.navigateTo({
      url: `/packageCase/pages/detail/index?id=${id}`
    })
  },

  onQuoteTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    wx.navigateTo({
      url: `/pages/quote/detail/index?id=${id}`
    })
  },

  onGoodsTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    wx.navigateTo({
      url: `/pages/goods-details/index?id=${id}`
    })
  }
})
