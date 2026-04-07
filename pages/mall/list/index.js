const network = require('../../../api/network-main.js')
const api = require('../../../api/base.js')

const PAGE_SIZE = 15

const SORT_OPTIONS = [
  { key: 'default', label: '默认排序' },
  { key: 'comprehensive', label: '综合排序' }
]

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function decodeText(value, fallback = '') {
  const text = safeText(value, fallback)
  if (!text) return fallback
  try {
    return decodeURIComponent(text)
  } catch (err) {
    return text
  }
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

Page({
  data: {
    navTitle: '婚庆商家',
    keyword: '',
    cityId: 273,
    cityName: '成都',
    categoryName: '全部',
    categoryId: '',
    categories: [],
    categoryDropdownShow: false,
    pickingCity: false,
    sortOptions: SORT_OPTIONS,
    currentSortKey: 'default',
    popupShow: false,
    popupMode: '',
    filterForm: {
      minPrice: '',
      maxPrice: '',
      college: false,
      isVip: false,
      platform: false,
      sincerity: false,
      team: false
    },
    list: [],
    page: 1,
    loading: false,
    loaded: false,
    hasMore: true,
    footerLoading: false,
    footerNoMore: false
  },

  onLoad(options) {
    const storageCity = getSelectedCity()
    const routeCityId = asNumber(options && options.cityId, storageCity.id)
    const routeCityName = decodeText(options && options.cityName, storageCity.name)
    const categoryId = safeText(options && options.id)
    const categoryName = decodeText(options && options.name, '婚庆商家')
    this.setData({
      cityId: routeCityId,
      cityName: routeCityName,
      categoryId,
      categoryName,
      navTitle: categoryName || '婚庆商家'
    })
    wx.setNavigationBarTitle({
      title: categoryName || '婚庆商家'
    })
    this.loadCategories()
    this.fetchList(true)
  },

  onShow() {
    if (!this.data.pickingCity) return
    const cityInfo = getSelectedCity()
    this.setData({
      cityId: cityInfo.id,
      cityName: cityInfo.name,
      pickingCity: false
    })
    this.fetchList(true)
  },

  onPullDownRefresh() {
    this.fetchList(true)
  },

  onReachBottom() {
    if (this.data.loading || !this.data.hasMore) return
    this.fetchList(false)
  },

  async loadCategories() {
    try {
      const res = await network.homeCategory({})
      if (!res || res.code !== 0 || !Array.isArray(res.data)) return
      const categories = [{ occupationid: '', proname: '全部' }].concat(res.data)
      this.setData({ categories })
    } catch (err) {
    }
  },

  buildParams(page) {
    const form = this.data.filterForm || {}
    return {
      p: page,
      rows: PAGE_SIZE,
      cont: safeText(this.data.keyword).trim(),
      city: this.data.cityId || 273,
      types: 1,
      stype: 'sj',
      countyid: 0,
      occupationid: this.data.categoryId || 0,
      comprehensive: this.data.currentSortKey === 'comprehensive' ? 1 : 0,
      floorprice: safeText(form.minPrice).trim(),
      ceilingprice: safeText(form.maxPrice).trim(),
      college: form.college ? 1 : 0,
      isshopvip: form.isVip ? 1 : 0,
      platform: form.platform ? 1 : 0,
      sincerity: form.sincerity ? 1 : 0,
      team: form.team ? 2 : 0
    }
  },

  async fetchList(reset) {
    const nextPage = reset ? 1 : this.data.page + 1
    this.setData({
      loading: true,
      footerLoading: !reset && (this.data.list || []).length > 0,
      footerNoMore: false
    })
    try {
      const res = await network.mallMerchantSearch(this.buildParams(nextPage))
      const data = res && res.data ? res.data : {}
      const normalized = normalizeMerchantList(data.shangjia)
      const list = reset ? normalized : (this.data.list || []).concat(normalized)
      const hasMore = normalized.length >= PAGE_SIZE
      this.setData({
        list,
        page: nextPage,
        loading: false,
        loaded: true,
        hasMore,
        footerLoading: false,
        footerNoMore: !hasMore && list.length > 0
      })
    } catch (err) {
      this.setData({
        loading: false,
        loaded: true,
        footerLoading: false,
        footerNoMore: false
      })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  onKeywordInput(e) {
    this.setData({
      keyword: safeText(e && e.detail ? e.detail.value : '')
    })
  },

  onSearchConfirm(e) {
    this.setData({
      keyword: safeText(e && e.detail ? e.detail.value : this.data.keyword)
    })
    this.fetchList(true)
  },

  onSearchTap() {
    this.fetchList(true)
  },

  onCityTap() {
    this.setData({ pickingCity: true })
    wx.navigateTo({
      url: '/pages/city-select/index'
    })
  },

  openPopup(e) {
    const mode = e && e.currentTarget ? safeText(e.currentTarget.dataset.mode) : ''
    if (!mode) return
    if (mode === 'area') {
      this.onCityTap()
      return
    }
    if (mode === 'category') {
      this.setData({
        categoryDropdownShow: !this.data.categoryDropdownShow,
        popupShow: false,
        popupMode: ''
      })
      return
    }
    this.setData({
      categoryDropdownShow: false,
      popupShow: true,
      popupMode: mode
    })
  },

  closePopup() {
    this.setData({
      categoryDropdownShow: false,
      popupShow: false
    })
  },

  onPopupClosed() {
    if (this.data.popupShow) return
    this.setData({
      popupMode: ''
    })
  },

  onSelectCategory(e) {
    const id = safeText(e && e.currentTarget ? e.currentTarget.dataset.id : '')
    const name = safeText(e && e.currentTarget ? e.currentTarget.dataset.name : '全部')
    this.setData({
      categoryId: id,
      categoryName: name,
      categoryDropdownShow: false
    })
    this.fetchList(true)
  },

  onSelectSort(e) {
    const key = safeText(e && e.currentTarget ? e.currentTarget.dataset.key : 'default')
    if (key === this.data.currentSortKey) {
      this.closePopup()
      return
    }
    this.setData({
      currentSortKey: key
    })
    this.closePopup()
    this.fetchList(true)
  },

  onFilterInput(e) {
    const key = safeText(e && e.currentTarget ? e.currentTarget.dataset.key : '')
    if (!key) return
    this.setData({
      [`filterForm.${key}`]: safeText(e && e.detail ? e.detail.value : '')
    })
  },

  onFilterToggle(e) {
    const key = safeText(e && e.currentTarget ? e.currentTarget.dataset.key : '')
    if (!key) return
    this.setData({
      [`filterForm.${key}`]: !this.data.filterForm[key]
    })
  },

  onFilterReset() {
    this.setData({
      filterForm: {
        minPrice: '',
        maxPrice: '',
        college: false,
        isVip: false,
        platform: false,
        sincerity: false,
        team: false
      }
    })
  },

  onFilterConfirm() {
    this.closePopup()
    this.fetchList(true)
  },

  onMerchantTap(e) {
    const userid = safeText(e && e.currentTarget ? e.currentTarget.dataset.userid : '')
    if (!userid) return
    wx.navigateTo({
      url: `/packageWedding/pages/merchant/detail?userid=${encodeURIComponent(userid)}`
    })
  }
})
