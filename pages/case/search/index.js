const network = require('../../../api/network.js')
const api = require('../../../api/api.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

const PAGE_SIZE = 15

const SORT_OPTIONS = [
  { key: 'default', label: '默认排序' },
  { key: 'comprehensive', label: '综合排序' }
]

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

function getSelectedCity() {
  const selected = wx.getStorageSync('selectedCity')
  return {
    id: asNumber(selected && selected.id, 273),
    name: safeText(selected && selected.name, '成都')
  }
}

function normalizeOption(item = {}, fallback = '全部') {
  return {
    id: asNumber(item && (item.id || item.typeid), 0),
    name: safeText(item && (item.name || item.title), fallback)
  }
}

function normalizeCaseList(list = []) {
  return (Array.isArray(list) ? list : []).map(item => ({
    id: asNumber(item && item.id, 0),
    userid: safeText(item && item.userid),
    cover: absoluteUrl(item && item.weddingcover) || '/images/load_img.webp',
    head: absoluteUrl(item && item.head) || '/images/default.webp',
    nickname: safeText(item && item.nickname, '案例商家'),
    title: safeText(item && item.title, '未命名案例'),
    price: formatMoney(item && item.weddingexpenses),
    desc: safeText(item && item.weddingdescribe, '暂无案例描述'),
    viewCount: safeText(item && item.clicked, '0'),
    score: safeText(item && item.goodscore, '0'),
    commentCount: safeText(item && item.commented, '0'),
    followed: asNumber(item && (item.afollow != null ? item.afollow : item.userf), 0) === 1
  })).filter(item => item.id)
}

function isSuccessCode(code) {
  return code === 0 || code === '0'
}

function includesText(source, keyword) {
  return safeText(source).includes(keyword)
}

Page({
  data: {
    authSnapshot: false,
    keyword: '',
    cityId: 273,
    cityName: '成都',
    typeOptions: [{ id: 0, name: '全部类型' }],
    environmentOptions: [{ id: 0, name: '全部环境' }],
    sortOptions: SORT_OPTIONS,
    selectedTypeId: 0,
    selectedTypeName: '全部类型',
    selectedEnvironmentId: 0,
    selectedEnvironmentName: '全部环境',
    selectedSortKey: 'default',
    selectedSortName: '默认排序',
    floorprice: '',
    ceilingprice: '',
    filterSummary: '筛选',
    popupMode: '',
    popupShow: false,
    filterForm: {
      floorprice: '',
      ceilingprice: ''
    },
    list: [],
    page: 1,
    loading: false,
    loaded: false,
    hasMore: true
  },

  onLoad(options) {
    const cityInfo = getSelectedCity()
    const cityId = asNumber(options && options.cityId, cityInfo.id)
    const cityName = safeText(options && options.cityName, cityInfo.name)
    this.setData({
      authSnapshot: xgwAuth.isLogined(),
      keyword: safeText(options && options.keyword).trim(),
      cityId,
      cityName
    })
    wx.setNavigationBarTitle({
      title: '搜索案例'
    })
    this.loadFilterOptions()
    this.fetchList(true)
  },

  onShow() {
    const isLogined = xgwAuth.isLogined()
    if (isLogined !== this.data.authSnapshot) {
      this.setData({
        authSnapshot: isLogined
      })
      this.fetchList(true)
      return
    }
    const cityInfo = getSelectedCity()
    if (
      asNumber(cityInfo.id, 273) !== asNumber(this.data.cityId, 273) ||
      safeText(cityInfo.name) !== safeText(this.data.cityName)
    ) {
      this.setData({
        cityId: asNumber(cityInfo.id, 273),
        cityName: cityInfo.name
      })
      this.fetchList(true)
    }
  },

  onPullDownRefresh() {
    this.fetchList(true).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.loading || !this.data.hasMore) return
    this.fetchList(false)
  },

  async loadFilterOptions() {
    try {
      const [typeRes, environmentRes] = await Promise.all([
        network.xgwWeddingTypeList({}),
        network.xgwWeddingEnvironmentList({})
      ])
      const typeList = Array.isArray(typeRes && typeRes.data) ? typeRes.data : []
      const environmentList = Array.isArray(environmentRes && environmentRes.data) ? environmentRes.data : []
      this.setData({
        typeOptions: [{ id: 0, name: '全部类型' }].concat(typeList.map(item => normalizeOption(item, '类型'))),
        environmentOptions: [{ id: 0, name: '全部环境' }].concat(environmentList.map(item => normalizeOption(item, '环境')))
      })
    } catch (err) {}
  },

  buildParams(page) {
    return {
      p: page,
      rows: PAGE_SIZE,
      cont: safeText(this.data.keyword).trim(),
      types: 1,
      stype: 'al',
      city: asNumber(this.data.cityId, 273),
      ambient: this.data.selectedEnvironmentId || 0,
      type: this.data.selectedTypeId || 0,
      orderby: this.data.selectedSortKey === 'comprehensive' ? 1 : 0,
      floorprice: safeText(this.data.floorprice).trim(),
      ceilingprice: safeText(this.data.ceilingprice).trim()
    }
  },

  async fetchList(reset = false) {
    if (this.data.loading) return
    const nextPage = reset ? 1 : this.data.page
    this.setData({
      loading: true
    })
    try {
      const res = await network.xgwCaseSearch(this.buildParams(nextPage))
      const rawList = Array.isArray(res && res.data && res.data.anli) ? res.data.anli : []
      const list = normalizeCaseList(rawList)
      this.setData({
        list: reset ? list : (this.data.list || []).concat(list),
        page: nextPage + 1,
        hasMore: list.length >= PAGE_SIZE,
        loading: false,
        loaded: true
      })
    } catch (err) {
      this.setData({
        loading: false,
        loaded: true
      })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  onKeywordInput(e) {
    this.setData({
      keyword: safeText(e && e.detail ? e.detail.value : '')
    })
  },

  onSearchConfirm(e) {
    this.setData({
      keyword: safeText(e && e.detail ? e.detail.value : this.data.keyword).trim()
    })
    this.fetchList(true)
  },

  onSearchTap() {
    this.setData({
      keyword: safeText(this.data.keyword).trim()
    })
    this.fetchList(true)
  },

  openPopup(e) {
    const mode = safeText(e && e.currentTarget ? e.currentTarget.dataset.mode : '')
    if (!mode) return
    this.setData({
      popupMode: mode,
      popupShow: true,
      filterForm: {
        floorprice: this.data.floorprice,
        ceilingprice: this.data.ceilingprice
      }
    })
  },

  closePopup() {
    this.setData({
      popupShow: false
    })
  },

  onTypeSelect(e) {
    const id = asNumber(e && e.currentTarget ? e.currentTarget.dataset.id : 0, 0)
    const name = safeText(e && e.currentTarget ? e.currentTarget.dataset.name : '全部类型')
    this.setData({
      selectedTypeId: id,
      selectedTypeName: name,
      popupShow: false
    })
    this.fetchList(true)
  },

  onEnvironmentSelect(e) {
    const id = asNumber(e && e.currentTarget ? e.currentTarget.dataset.id : 0, 0)
    const name = safeText(e && e.currentTarget ? e.currentTarget.dataset.name : '全部环境')
    this.setData({
      selectedEnvironmentId: id,
      selectedEnvironmentName: name,
      popupShow: false
    })
    this.fetchList(true)
  },

  onSortSelect(e) {
    const key = safeText(e && e.currentTarget ? e.currentTarget.dataset.key : 'default')
    const name = safeText(e && e.currentTarget ? e.currentTarget.dataset.name : '默认排序')
    this.setData({
      selectedSortKey: key,
      selectedSortName: name,
      popupShow: false
    })
    this.fetchList(true)
  },

  onFilterInput(e) {
    const key = safeText(e && e.currentTarget ? e.currentTarget.dataset.key : '')
    if (!key) return
    this.setData({
      [`filterForm.${key}`]: safeText(e && e.detail ? e.detail.value : '').replace(/[^\d.]/g, '').slice(0, 10)
    })
  },

  onFilterReset() {
    this.setData({
      filterForm: {
        floorprice: '',
        ceilingprice: ''
      }
    })
  },

  onFilterApply() {
    const floorprice = safeText(this.data.filterForm.floorprice).trim()
    const ceilingprice = safeText(this.data.filterForm.ceilingprice).trim()
    const summary = floorprice || ceilingprice
      ? `${floorprice || '0'}-${ceilingprice || '不限'}`
      : '筛选'
    this.setData({
      floorprice,
      ceilingprice,
      filterSummary: summary,
      popupShow: false
    })
    this.fetchList(true)
  },

  onCaseTap(e) {
    const id = asNumber(e && e.currentTarget ? e.currentTarget.dataset.id : 0, 0)
    if (!id) return
    wx.navigateTo({
      url: `/packageCase/pages/detail/index?id=${id}`
    })
  },

  onAvatarError(e) {
    const index = asNumber(e && e.currentTarget ? e.currentTarget.dataset.index : -1, -1)
    if (index < 0) return
    this.setData({
      [`list[${index}].head`]: '/images/default.webp'
    })
  },

  async onFollowTap(e) {
    const index = asNumber(e && e.currentTarget ? e.currentTarget.dataset.index : -1, -1)
    const caseId = asNumber(e && e.currentTarget ? e.currentTarget.dataset.id : 0, 0)
    if (index < 0 || !caseId) return
    if (!xgwAuth.isLogined()) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    const current = (this.data.list || [])[index]
    if (!current) return

    try {
      const res = current.followed
        ? await network.xgwCaseFollowDelete({ id: caseId })
        : await network.xgwCaseFollowAdd({ id: caseId })
      const message = safeText(res && (res.message || res.msg))
      const duplicateFollow = !current.followed && includesText(message, '已经关注')
      const missingFollow = current.followed && (includesText(message, '未关注') || includesText(message, '没有关注'))
      if (!res || (!isSuccessCode(res.code) && !duplicateFollow && !missingFollow)) {
        throw new Error(message || '操作失败')
      }
      this.setData({
        [`list[${index}].followed`]: duplicateFollow ? true : (missingFollow ? false : !current.followed)
      })
      wx.showToast({
        title: duplicateFollow ? '已关注' : (missingFollow ? '已取消关注' : (current.followed ? '已取消关注' : '已关注')),
        icon: 'success'
      })
    } catch (err) {
      wx.showToast({
        title: err && err.message ? err.message : '操作失败',
        icon: 'none'
      })
    }
  }
})
