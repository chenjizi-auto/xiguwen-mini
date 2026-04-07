const TOOLS = require('../../utils/tools.js')
const network = require('../../api/network-main.js');
const xgwAuth = require('../../utils/xgw-auth.js')
const APP = getApp()
const DEFAULT_AVATAR = '/images/default.webp'

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

Page({
  data: {
    inputVal: "", // 搜索框内容
    goodsRecommend: [], // 推荐商品
    kanjiaList: [], //砍价商品列表
    pingtuanList: [], //拼团商品列表
    loadingHidden: false, // loading
    selectCurrent: 0,
    categories_p1: [],
    categories_p2: [],
    goods: [],
    loadingMoreHidden: true,
    coupons: [],
    curPage: 1,
    pageSize: 20,
    tabs:['婚庆','社团','案例'],
    city:'成都',
    activeIndex: 0,
    banners:[],
    rementuandui:[],
    remenhuodong:null,
    youlike:[],
    goodsDynamic: [],
    show_buy_dynamic: '0',
    load_img: '/images/load_img.webp',
    load_img_erro: '/images/load_img_erro.webp',
    load_imag_error: '/images/load_img_erro.webp',
    navHeight: 64,
    navTop: 20,
    windowHeight: 667,
    menuButtonObject: {
      left: 300
    },
    searchShifted: false,
    searchEntryAnimation: {},

    // 社团（参考 Android fragment_club_layout + ApiManager.getAssociation）
    clubCityId: '273', // 默认成都（Android 端默认 273）
    clubPage: 1,
    clubRows: 30,
    clubLoading: false,
    clubNoMore: false,
    clubList: [],

    clubTypes: [],
    clubTypeId: '',
    clubTypeName: '全部',

    clubSortValue: '1',
    clubSortName: '综合排序',

    clubAreaId: '',
    clubAreaName: '全区域',

    clubMoneyMin: '',
    clubMoneyMax: '',

    clubPopupShow: false,
    clubPopupMode: '' // type | sort | area | filter
    ,

    // 案例（参考 Android NewExampleFragment + ApiManager.getCase）
    caseCityId: '273',
    caseType: 1,
    casePage: 1,
    caseRows: 10,
    caseLoading: false,
    caseNoMore: false,
    caseLoaded: false,
    caseList: [],
    caseTopTabs: [
      { type: 1, text: '今日推荐', icon: 'star-o' },
      { type: 2, text: '本周人气', icon: 'friends-o' },
      { type: 3, text: '本月人气', icon: 'user-o' },
      { type: 4, text: '本周热门', icon: 'fire-o' },
      { type: 5, text: '本月热门', icon: 'fire-o' }
    ]
  },
  tabClick(e) {
    const index = e && e.detail ? e.detail.index : undefined
    if (typeof index !== 'number') return

    this.setData({
      activeIndex: index
    });

    if (index === 0) {
      this.loadHome({ cityid: '0' })
      this.loadHomeCategory({})
    }
    if (index === 1) {
      this.ensureClubTypesLoaded()
      this.refreshClubList()
    }
    if (index === 2) {
      this.ensureCaseLoaded()
    }
  },
  
  onLoad: function(e) {
    this.searchEntryAnimator = wx.createAnimation({
      duration: 220,
      timingFunction: 'ease-out'
    })
  },
 
  onShow: function(e){
    const selectedCity = wx.getStorageSync('selectedCity')
    if (selectedCity && selectedCity.name) {
      const cityId = selectedCity.id != null ? String(selectedCity.id) : '273'
      this.setData({
        city: selectedCity.name,
        clubCityId: cityId,
        caseCityId: cityId
      })
    }
    this.setData({
      navHeight: APP.globalData.navHeight || 64,
      navTop: APP.globalData.navTop || 20,
      windowHeight: APP.globalData.windowHeight || 667,
      menuButtonObject: APP.globalData.menuButtonObject || { left: 300 }, // 小程序胶囊信息
      searchShifted: false,
      searchEntryAnimation: this.searchEntryAnimator ? this.searchEntryAnimator.step({ duration: 0 }).export() : {},
      show_buy_dynamic: wx.getStorageSync('show_buy_dynamic') || '0'
    }, () => {
      this.measureSearchEntryWidths()
    })
    if(this.data.activeIndex === 0 ){
      this.loadHome({cityid:'0'})
      this.loadHomeCategory({})
    }
    if(this.data.activeIndex === 1 ){
      this.ensureClubTypesLoaded()
      this.refreshClubList()
    }
    if(this.data.activeIndex === 2 ){
      this.ensureCaseLoaded()
    }
  },

  bindinput(e) {
    this.setData({
      inputVal: e && e.detail ? e.detail.value : ''
    })
  },

  goSearch() {
    wx.navigateTo({
      url: '/pages/search/index'
    })
  },

  goHistoryPage() {
    wx.navigateTo({
      url: '/packageWedding/pages/history/index'
    })
  },

  goScheduleList() {
    wx.navigateTo({
      url: '/packageWedding/pages/schedule/index'
    })
  },

  goCitySelect() {
    wx.navigateTo({
      url: '/pages/city-select/index'
    })
  },

  onHomeCategoryTap(e) {
    const id = e && e.currentTarget ? safeText(e.currentTarget.dataset.id) : ''
    const name = e && e.currentTarget ? safeText(e.currentTarget.dataset.name) : ''
    const cityId = safeText(this.data.clubCityId || '273')
    const cityName = safeText(this.data.city || '成都')
    if (!id) return
    wx.navigateTo({
      url:
        `/pages/mall/list/index?id=${encodeURIComponent(id)}` +
        `&name=${encodeURIComponent(name)}` +
        `&cityId=${encodeURIComponent(cityId)}` +
        `&cityName=${encodeURIComponent(cityName)}`
    })
  },

  onWeddingToolTap(e) {
    const action = e && e.currentTarget ? safeText(e.currentTarget.dataset.action) : ''
    if (!action) return
    if (action === 'publishNeed') {
      wx.navigateTo({ url: '/packageWedding/pages/my/needs/form' })
      return
    }
    if (action === 'publishSchedule') {
      wx.navigateTo({ url: '/packageWedding/pages/schedule/form' })
      return
    }
    if (action === 'invitation') {
      wx.navigateTo({ url: '/pages/invitation/index' })
      return
    }
    if (action === 'scheduleList') {
      wx.navigateTo({ url: '/packageWedding/pages/schedule/index' })
      return
    }
    if (action === 'needList') {
      wx.navigateTo({ url: '/packageWedding/pages/need/index?tabIndex=0' })
      return
    }
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  onWeddingPromoTap(e) {
    const action = e && e.currentTarget ? safeText(e.currentTarget.dataset.action) : ''
    if (!action) return

    if (action === 'case') {
      wx.navigateTo({
        url:
          `/pages/case/search/index?cityId=${encodeURIComponent(safeText(this.data.clubCityId || '273'))}` +
          `&cityName=${encodeURIComponent(safeText(this.data.city || '成都'))}`
      })
      return
    }

    if (action === 'plan') {
      if (!xgwAuth.isLogined()) {
        wx.navigateTo({
          url: '/pages/login/index'
        })
        return
      }
      wx.navigateTo({
        url: '/packageWedding/pages/get-suggest/index'
      })
    }
  },

  onClubItemTap(e) {
    const id = e && e.currentTarget ? safeText(e.currentTarget.dataset.id) : ''
    if (!id) return
    wx.navigateTo({
      url: `/pages/team/detail?id=${id}`
    })
  },

  tapBanner(e) {
    const url = e && e.currentTarget ? e.currentTarget.dataset.url : ''
    if (!url) return
    if (typeof url === 'string' && url.startsWith('/')) {
      wx.navigateTo({ url })
      return
    }
    wx.showToast({
      title: '暂不支持打开该链接',
      icon: 'none'
    })
  },

  onGoodsDynamicTap(e) {
    const id = e && e.currentTarget ? e.currentTarget.dataset.id : ''
    if (!id) return
    wx.navigateTo({
      url: `/pages/goods-details/index?id=${id}`
    })
  },

  toDetailsTap(e) {
    const id = e && e.currentTarget ? e.currentTarget.dataset.id : ''
    const supplytype = e && e.currentTarget ? e.currentTarget.dataset.supplytype : ''
    const yyId = e && e.currentTarget ? e.currentTarget.dataset.yyid : ''
    const typee = e && e.currentTarget ? safeText(e.currentTarget.dataset.typee) : ''
    const shopId = e && e.currentTarget ? e.currentTarget.dataset.shopid : ''
    const videoUrl = e && e.currentTarget ? safeText(e.currentTarget.dataset.videourl) : ''
    if (!id) return

    if (typee === '1') {
      wx.navigateTo({ url: `/packageCase/pages/detail/index?id=${id}` })
      return
    }
    if (typee === '2') {
      wx.navigateTo({ url: `/pages/my/mine-atlas-detail/index?id=${id}` })
      return
    }
    if (typee === '3') {
      wx.navigateTo({ url: `/pages/my/video/detail/index?id=${id}` })
      return
    }
    if (typee === '4') {
      wx.navigateTo({ url: `/pages/my/quote/detail/index?id=${shopId || id}` })
      return
    }
    if (/^https?:\/\//i.test(videoUrl)) {
      wx.navigateTo({
        url: `/pages/my/news/detail/index?url=${encodeURIComponent(videoUrl)}&title=${encodeURIComponent('视频详情')}`
      })
      return
    }

    if (supplytype === 'cps_jd') {
      wx.navigateTo({ url: `/packageCps/pages/goods-details/cps-jd?id=${id}` })
    } else if (supplytype === 'vop_jd') {
      wx.navigateTo({ url: `/pages/goods-details/vop?id=${yyId}&goodsId=${id}` })
    } else if (supplytype === 'cps_pdd') {
      wx.navigateTo({ url: `/packageCps/pages/goods-details/cps-pdd?id=${id}` })
    } else if (supplytype === 'cps_taobao') {
      wx.navigateTo({ url: `/packageCps/pages/goods-details/cps-taobao?id=${id}` })
    } else {
      wx.navigateTo({ url: `/pages/goods-details/index?id=${id}` })
    }
  },

  onMerchantTap(e) {
    const userId = e && e.currentTarget ? safeText(e.currentTarget.dataset.userid) : ''
    if (!userId) return
    const name = e && e.currentTarget ? safeText(e.currentTarget.dataset.name) : ''
    const head = e && e.currentTarget ? safeText(e.currentTarget.dataset.head) : ''
    const occupation = e && e.currentTarget ? safeText(e.currentTarget.dataset.occupation) : ''
    const followed = e && e.currentTarget ? safeText(e.currentTarget.dataset.followed) : ''
    const page = this
    wx.navigateTo({
      url:
        `/packageWedding/pages/merchant/detail?userid=${encodeURIComponent(userId)}` +
        `&name=${encodeURIComponent(name)}` +
        `&head=${encodeURIComponent(head)}` +
        `&occupation=${encodeURIComponent(occupation)}` +
        `&followed=${encodeURIComponent(followed)}`,
      success(res) {
        if (!res || !res.eventChannel) return
        res.eventChannel.on('merchantFollowChanged', payload => {
          if (!payload) return
          page.syncMerchantFollowState(payload.userid, payload.followed)
        })
      }
    })
  },

  syncMerchantFollowState(userId, followed) {
    const targetUserId = safeText(userId)
    if (!targetUserId) return
    const list = Array.isArray(this.data.youlike) ? this.data.youlike : []
    const nextFollow = Number(followed) === 1 ? 1 : 0
    const updates = {}
    let changed = false
    list.forEach((item, idx) => {
      if (safeText(item && item.userid) !== targetUserId) return
      updates[`youlike[${idx}].follow`] = nextFollow
      changed = true
    })
    if (changed) {
      this.setData(updates)
    }
  },

  async onMerchantFollowTap(e) {
    if (!xgwAuth.isLogined()) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    const idx = e && e.currentTarget ? Number(e.currentTarget.dataset.idx) : -1
    const userId = e && e.currentTarget ? safeText(e.currentTarget.dataset.userid) : ''
    if (idx < 0 || !userId) return
    const item = this.data.youlike && this.data.youlike[idx]
    if (!item) return
    const isFollowed = Number(item.follow) === 1
    try {
      const res = isFollowed
        ? await network.xgwShopFollowDelete({ id: userId })
        : await network.xgwShopFollowAdd({ id: userId })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '操作失败')
      }
      const nextFollow = isFollowed ? 0 : 1
      this.syncMerchantFollowState(userId, nextFollow)
      this.setData({
        [`youlike[${idx}].followed`]: Math.max(0, Number(item.followed || 0) + (isFollowed ? -1 : 1))
      })
      wx.showToast({
        title: isFollowed ? '已取消关注' : '已关注',
        icon: 'success'
      })
    } catch (err) {
      wx.showToast({
        title: err && err.message ? err.message : '操作失败',
        icon: 'none'
      })
    }
  },

  loadHome:function(data){
    let that = this;
    return network.mainPage(data).then(res=>{
      console.log(res)
      if(res.code === 0){
        // console.log(JSON.stringify(res.data.youlike))
        this.initBanner(res.data.guanggaolunbo)
        that.setData({
          rementuandui:(res.data.rementuandui && res.data.rementuandui.data) ? res.data.rementuandui.data : []
        })
        that.setData({
          remenhuodong: res.data && res.data.remenhuodong && res.data.remenhuodong.rmhd1 ? res.data.remenhuodong : null
        })
        that.setData({
          youlike:res.data.youlike || []
        })
      }
      return res
    })
  },

  loadHomeCategory:function(data){
    let that = this
      return network.homeCategory(data).then(res => {
        if(res.code === 0){
          console.log(res)
            // let a =  res.data.unshift({occupationid:'0',proname:'全部',wapimg:''},res.data) 
            that.setData({categories_p1:res.data.slice(0,10)})
            that.setData({categories_p2:res.data.slice(10,19)})
        }
        return res
      })
  },

  initBanner (data){
      this.setData({
        banners: Array.isArray(data) ? data : []
      });
  },

  onShopAvatarError(e) {
    const rawIdx = e && e.currentTarget ? e.currentTarget.dataset.idx : -1
    const idx = Number(rawIdx)
    if (idx < 0) return
    this.setData({
      [`youlike[${idx}].head`]: this.data.load_img_erro
    })
  },

  onShopImageError(e) {
    const rawIdx = e && e.currentTarget ? e.currentTarget.dataset.idx : -1
    const idx = Number(rawIdx)
    const field = e && e.currentTarget ? e.currentTarget.dataset.field : ''
    if (!Number.isFinite(idx) || idx < 0 || !field) return
    this.setData({
      [`youlike[${idx}].${field}`]: this.data.load_img_erro
    })
  },

  onCaseAvatarError(e) {
    const rawIdx = e && e.currentTarget ? e.currentTarget.dataset.idx : -1
    const idx = Number(rawIdx)
    if (!Number.isFinite(idx) || idx < 0) return
    this.setData({
      [`caseList[${idx}].head`]: DEFAULT_AVATAR
    })
  },

  // -------------------- 社团列表（Homehot/association） --------------------

  ensureClubTypesLoaded() {
    if (this.data.clubTypes && this.data.clubTypes.length > 0) return
    network.homeCategory({}).then(res => {
      if (res && res.code === 0 && Array.isArray(res.data)) {
        const types = [{ occupationid: -1, proname: '全部' }].concat(res.data)
        this.setData({ clubTypes: types })
      }
    })
  },

  openClubPopup(e) {
    const mode = e && e.currentTarget ? e.currentTarget.dataset.mode : ''
    if (!mode) return
    this.setData({
      clubPopupShow: true,
      clubPopupMode: mode
    })
  },

  closeClubPopup() {
    this.setData({
      clubPopupShow: false,
      clubPopupMode: ''
    })
  },

  selectClubType(e) {
    const id = e && e.currentTarget ? e.currentTarget.dataset.id : -1
    const name = e && e.currentTarget ? e.currentTarget.dataset.name : '全部'
    this.setData({
      clubTypeId: id === -1 ? '' : String(id),
      clubTypeName: name
    })
    this.closeClubPopup()
    this.refreshClubList()
  },

  selectClubSort(e) {
    const value = e && e.currentTarget ? e.currentTarget.dataset.value : ''
    const name = e && e.currentTarget ? e.currentTarget.dataset.name : '默认'
    this.setData({
      clubSortValue: value,
      clubSortName: name
    })
    this.closeClubPopup()
    this.refreshClubList()
  },

  onClubMoneyMinInput(e) {
    const value = e && e.detail != null ? e.detail : ''
    this.setData({ clubMoneyMin: value })
  },

  onClubMoneyMaxInput(e) {
    const value = e && e.detail != null ? e.detail : ''
    this.setData({ clubMoneyMax: value })
  },

  resetClubFilter() {
    this.setData({ clubMoneyMin: '', clubMoneyMax: '' })
  },

  confirmClubFilter() {
    this.closeClubPopup()
    this.refreshClubList()
  },

  refreshClubList() {
    this.setData({ clubPage: 1, clubNoMore: false })
    this.fetchClubList(true)
  },

  fetchClubList(isRefresh) {
    if (this.data.clubLoading) return
    if (!isRefresh && this.data.clubNoMore) return

    const nextPage = isRefresh ? 1 : (this.data.clubPage + 1)

    this.setData({ clubLoading: true })
    network.associationList({
      cityid: this.data.clubAreaId || undefined,
      comprehensive: this.data.clubSortValue || undefined,
      moneymax: this.data.clubMoneyMax || undefined,
      moneymin: this.data.clubMoneyMin || undefined,
      p: String(nextPage),
      rows: String(this.data.clubRows),
      type: this.data.clubTypeId || undefined,
      city: this.data.clubCityId || '273'
    }).then(res => {
      if (!res || res.code !== 0) return
      const data = res.data || {}
      const list = Array.isArray(data.shetuan) ? data.shetuan : []
      const merged = isRefresh ? list : (this.data.clubList || []).concat(list)
      this.setData({
        clubList: merged,
        clubPage: nextPage,
        clubNoMore: list.length < this.data.clubRows
      })
    }).catch(() => {
    }).then(() => {
      this.setData({ clubLoading: false })
      wx.stopPullDownRefresh()
    })
  },

  onPullDownRefresh() {
    if (this.data.activeIndex === 0) {
      Promise.all([
        this.loadHome({ cityid: '0' }),
        this.loadHomeCategory({})
      ]).then(() => wx.stopPullDownRefresh())
      return
    }
    if (this.data.activeIndex === 1) {
      this.refreshClubList()
      return
    }
    if (this.data.activeIndex === 2) {
      this.refreshCaseList()
      return
    }
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    if (this.data.activeIndex === 1) {
      this.fetchClubList(false)
    }
    if (this.data.activeIndex === 2) {
      this.fetchCaseList(false)
    }
  }
  ,

  onPageScroll(e) {
    const scrollTop = Number(e && e.scrollTop) || 0
    const nextShifted = scrollTop > 24
    if (nextShifted === this.data.searchShifted) return
    const targetWidth = nextShifted ? this.searchEntryExpandedWidth : this.searchEntryCompactWidth
    if (this.searchEntryAnimator && targetWidth > 0) {
      this.searchEntryAnimator.width(targetWidth).step()
    }
    this.setData({
      searchShifted: nextShifted,
      searchEntryAnimation: this.searchEntryAnimator ? this.searchEntryAnimator.export() : {}
    })
  },

  measureSearchEntryWidths() {
    const query = this.createSelectorQuery()
    query.select('.search-main').boundingClientRect()
    query.select('.search-city').boundingClientRect()
    query.select('.search-entry-shell').boundingClientRect()
    query.select('.search-archive').boundingClientRect()
    query.exec(res => {
      const searchMainRect = res && res[0] ? res[0] : null
      const cityRect = res && res[1] ? res[1] : null
      const entryRect = res && res[2] ? res[2] : null
      const archiveRect = res && res[3] ? res[3] : null
      if (!searchMainRect || !cityRect || !entryRect || !archiveRect) return

      const compactWidth = Math.max(0, Math.round(entryRect.width || 0))
      const windowWidth = wx.getSystemInfoSync().windowWidth || 375
      const gapPx = (16 / 750) * windowWidth
      const expandedWidth = Math.max(
        compactWidth,
        Math.round((searchMainRect.width || 0) - (cityRect.width || 0) - (archiveRect.width || 0) - gapPx * 2)
      )

      this.searchEntryCompactWidth = compactWidth
      this.searchEntryExpandedWidth = expandedWidth

      if (this.searchEntryAnimator && compactWidth > 0) {
        this.searchEntryAnimator.width(compactWidth).step({ duration: 0 })
        this.setData({
          searchEntryAnimation: this.searchEntryAnimator.export()
        })
      }
    })
  },

  // -------------------- 案例（Homehot/indexcaseapp） --------------------

  ensureCaseLoaded() {
    if (this.data.caseLoaded) return
    this.refreshCaseList()
  },

  onCaseTopTap(e) {
    const type = e && e.currentTarget ? Number(e.currentTarget.dataset.type) : 1
    if (![1,2,3,4,5].includes(type)) return
    if (type === this.data.caseType) return
    this.setData({ caseType: type, casePage: 1, caseNoMore: false })
    this.refreshCaseList()
  },

  refreshCaseList() {
    this.setData({ casePage: 1, caseNoMore: false })
    this.fetchCaseList(true)
  },

  fetchCaseList(isRefresh) {
    if (this.data.caseLoading) return
    if (!isRefresh && this.data.caseNoMore) return

    const nextPage = isRefresh ? 1 : (this.data.casePage + 1)
    this.setData({ caseLoading: true })

    network.caseList({
      cityid: this.data.caseCityId || '273',
      p: String(nextPage),
      rows: String(this.data.caseRows),
      type: String(this.data.caseType)
    }).then(res => {
      if (!res || res.code !== 0) return

      const payload = res.data || {}
      const list = (Array.isArray(payload.data) ? payload.data : []).map(item => ({
        ...item,
        head: safeText(item && item.head).trim() || DEFAULT_AVATAR
      }))
      const merged = isRefresh ? list : (this.data.caseList || []).concat(list)

      this.setData({
        caseList: merged,
        casePage: nextPage,
        caseNoMore: list.length < this.data.caseRows,
        caseLoaded: true
      })
    }).catch(() => {
    }).then(() => {
      this.setData({ caseLoading: false })
      wx.stopPullDownRefresh()
    })
  },

  onCaseItemTap(e) {
    const id = e && e.currentTarget ? e.currentTarget.dataset.id : ''
    if (!id) return
    wx.navigateTo({
      url: `/packageCase/pages/detail/index?id=${id}`
    })
  }




})
