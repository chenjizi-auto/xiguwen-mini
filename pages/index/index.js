const TOOLS = require('../../utils/tools.js')
const network = require('../../api/network.js');
const api = require('../../api/api.js');
const APP = getApp()

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
    remenhuodong:{},
    youlike:[],
    load_img: '/images/load_img.png',
    load_img_erro: '/images/load_img_erro.png',
    load_imag_error: '/images/load_img_erro.png',

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
      navHeight: APP.globalData.navHeight,
      navTop: APP.globalData.navTop,
      windowHeight: APP.globalData.windowHeight,
      menuButtonObject: APP.globalData.menuButtonObject //小程序胶囊信息
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

  goCitySelect() {
    wx.navigateTo({
      url: '/pages/city-select/index'
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

  toDetailsTap(e) {
    const id = e && e.currentTarget ? e.currentTarget.dataset.id : ''
    const supplytype = e && e.currentTarget ? e.currentTarget.dataset.supplytype : ''
    const yyId = e && e.currentTarget ? e.currentTarget.dataset.yyid : ''
    if (!id) return

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
          remenhuodong:res.data.remenhuodong || {}
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
        banners: data
      });
  },

  onShopAvatarError(e) {
    const idx = e && e.currentTarget ? Number(e.currentTarget.dataset.idx) : -1
    if (idx < 0) return
    this.setData({
      [`youlike[${idx}].head`]: this.data.load_img_erro
    })
  },

  onShopImageError(e) {
    const idx = e && e.currentTarget ? Number(e.currentTarget.dataset.idx) : -1
    const field = e && e.currentTarget ? e.currentTarget.dataset.field : ''
    if (idx < 0 || !field) return
    this.setData({
      [`youlike[${idx}].${field}`]: this.data.load_img_erro
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
      const list = Array.isArray(payload.data) ? payload.data : []
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
    wx.showToast({
      title: '案例详情开发中',
      icon: 'none'
    })
  }




})
