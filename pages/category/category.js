const network = require('../../api/network.js')
const xgwAuth = require('../../utils/xgw-auth.js')
const APP = getApp()

function normalizePhotoUrls(photourl) {
  if (!photourl) return []
  if (Array.isArray(photourl)) {
    return photourl
      .map(p => {
        if (!p) return ''
        if (typeof p === 'string') return p
        if (typeof p === 'object') return p.photourl || p.url || ''
        return ''
      })
      .filter(Boolean)
  }
  if (typeof photourl === 'string') {
    return photourl
      .split(/[,\s|]+/)
      .map(s => s.trim())
      .filter(Boolean)
  }
  return []
}

function computeGridCols(count) {
  if (count <= 1) return 1
  if (count === 2 || count === 4) return 2
  return 3
}

function normalizeDiscoverItem(item) {
  const urls = normalizePhotoUrls(item.photourl)
  return Object.assign({}, item, {
    photoUrls: urls,
    _photoCount: urls.length,
    _gridCols: computeGridCols(urls.length)
  })
}

Page({
  data: {
    // custom navigationBar 尺寸（来自 app.js 全局计算）
    navHeight: 0,
    navTop: 0,
    navRightGap: 0,
    navTabWidth: 0,
    menuButtonObject: null,

    load_img: '/images/load_img.png',
    load_img_erro: '/images/load_img_erro.png',

    circleActive: 0, // 0 婚庆圈 1 商城圈（对齐 Android FindFragment）
    orderActive: 0, // 0 最新 1 热门 2 关注（对齐 Android DiscoverFragment）

    // 九宫格尺寸（保证长宽相同；避免 padding 百分比按父宽计算导致高度异常）
    gridSize1: 0,
    gridSize2: 0,
    gridSize3: 0,

    // 婚庆圈职业筛选（对齐 Android DiscoverFragment discover_condition）
    jobPopupShow: false,
    jobTypes: [],
    jobTypeId: '',
    jobTypeName: '全部',

    // list
    discoverList: [],
    loaded: false,
    loading: false,
    noMore: false,
    page: 1,
    rows: 15
  },

  onLoad() {
    this.initNavBar()
    this.initGridSizes()
    this.ensureJobTypesLoaded()
    this.refreshDiscover()
  },

  onShow() {
    // no-op
  },

  onPullDownRefresh() {
    this.refreshDiscover()
  },

  onReachBottom() {
    this.loadMoreDiscover()
  },

  onCircleChange(e) {
    const index = e && e.detail ? e.detail.index : 0
    this.setData({
      circleActive: index,
      // 切换圈子时重置排序到“最新”
      orderActive: 0,
      // 商城圈不带职业筛选
      jobTypeId: index === 0 ? this.data.jobTypeId : '',
      jobTypeName: index === 0 ? this.data.jobTypeName : '全部'
    })
    this.refreshDiscover()
  },

  onOrderTap(e) {
    const idx = e && e.currentTarget ? Number(e.currentTarget.dataset.idx) : 0
    if (![0, 1, 2].includes(idx)) return
    if (idx === this.data.orderActive) return

    // 关注：需要登录 token
    if (idx === 2 && !xgwAuth.isLogined()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setData({ orderActive: idx })
    // 关注时清空职业筛选（对齐 Android：follow 时 jobType=0）
    if (idx === 2) {
      this.setData({ jobTypeId: '', jobTypeName: '全部' })
    }
    this.refreshDiscover()
  },

  onAddDiscover() {
    if (!xgwAuth.isLogined()) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/discover-publish/index'
    })
  },

  initNavBar() {
    try {
      const sys = wx.getSystemInfoSync()
      const menuButtonObject =
        (APP && APP.globalData && APP.globalData.menuButtonObject) || wx.getMenuButtonBoundingClientRect()

      const navTop =
        (APP && APP.globalData && APP.globalData.navTop) ||
        (sys && typeof sys.statusBarHeight === 'number' ? sys.statusBarHeight : 0)
      const navHeight =
        (APP && APP.globalData && APP.globalData.navHeight) ||
        (navTop +
          (menuButtonObject && menuButtonObject.height ? menuButtonObject.height : 32) +
          ((menuButtonObject && menuButtonObject.top ? menuButtonObject.top : navTop) - navTop) * 2)

      const windowWidth = sys && sys.windowWidth ? sys.windowWidth : 375
      const navRightGap = menuButtonObject && menuButtonObject.left ? windowWidth - menuButtonObject.left : 0
      const navTabWidth = menuButtonObject && menuButtonObject.left ? Math.max(0, menuButtonObject.left - 58) : 0

      this.setData({
        navHeight,
        navTop,
        navRightGap,
        navTabWidth,
        menuButtonObject
      })
    } catch (e) {
      // ignore
    }
  },

  initGridSizes() {
    try {
      const sys = wx.getSystemInfoSync()
      const windowWidth = sys && sys.windowWidth ? sys.windowWidth : 375
      const rpx2px = windowWidth / 750

      const listPadding = 24 * 2 * rpx2px // discover-list 左右 padding
      const cardPadding = 16 * 2 * rpx2px // discover-card 左右 padding
      const contentWidth = Math.max(0, windowWidth - listPadding - cardPadding)

      const gap = 10 * rpx2px // discover-img-wrap margin-right

      const size3 = Math.floor((contentWidth - 2 * gap) / 3)
      const size2 = Math.floor((contentWidth - 1 * gap) / 2)
      const size1 = Math.floor(contentWidth)

      this.setData({
        gridSize1: Math.max(0, size1),
        gridSize2: Math.max(0, size2),
        gridSize3: Math.max(0, size3)
      })
    } catch (e) {
      // ignore
    }
  },

  onAvatarError(e) {
    const idx = e && e.currentTarget ? Number(e.currentTarget.dataset.idx) : -1
    if (idx < 0) return
    this.setData({
      [`discoverList[${idx}].head`]: this.data.load_img_erro
    })
  },

  onDiscoverImgError(e) {
    const idx = e && e.currentTarget ? Number(e.currentTarget.dataset.idx) : -1
    const pidx = e && e.currentTarget ? Number(e.currentTarget.dataset.pidx) : -1
    if (idx < 0 || pidx < 0) return
    this.setData({
      [`discoverList[${idx}].photoUrls[${pidx}]`]: this.data.load_img_erro
    })
  },

  ensureJobTypesLoaded() {
    if (this.data.jobTypes && this.data.jobTypes.length > 0) return
    network.homeCategory({}).then(res => {
      if (!res || res.code !== 0 || !Array.isArray(res.data)) return
      const types = [{ occupationid: -1, proname: '全部' }].concat(res.data)
      this.setData({ jobTypes: types })
    })
  },

  openJobPopup() {
    if (this.data.circleActive !== 0) return
    this.setData({ jobPopupShow: true })
  },

  closeJobPopup() {
    this.setData({ jobPopupShow: false })
  },

  selectJobType(e) {
    const id = e && e.currentTarget ? e.currentTarget.dataset.id : -1
    const name = e && e.currentTarget ? e.currentTarget.dataset.name : '全部'
    this.setData({
      jobTypeId: id === -1 ? '' : String(id),
      jobTypeName: name,
      jobPopupShow: false
    })
    this.refreshDiscover()
  },

  refreshDiscover() {
    this.setData({ page: 1, noMore: false })
    this.fetchDiscover(true)
  },

  loadMoreDiscover() {
    if (this.data.noMore) return
    this.fetchDiscover(false)
  },

  fetchDiscover(isRefresh) {
    if (this.data.loading) return
    const nextPage = isRefresh ? 1 : this.data.page + 1
    this.setData({ loading: true })

    let follow
    let hot
    let newest
    if (this.data.orderActive === 0) newest = 'desc'
    if (this.data.orderActive === 1) hot = 'desc'
    if (this.data.orderActive === 2) follow = '1'

    const params = {
      follow,
      hot,
      newest,
      p: String(nextPage),
      rows: String(this.data.rows)
    }

    // 婚庆圈才传 type（职业）
    if (this.data.circleActive === 0 && this.data.jobTypeId && this.data.orderActive !== 2) {
      params.type = this.data.jobTypeId
    }

    const req = this.data.circleActive === 0 ? network.discoverWedding : network.discoverShops
    req(params).then(res => {
      if (!res || res.code !== 0) return
      const list = (Array.isArray(res.data) ? res.data : []).map(normalizeDiscoverItem)
      const merged = isRefresh ? list : (this.data.discoverList || []).concat(list)
      this.setData({
        discoverList: merged,
        page: nextPage,
        noMore: list.length < this.data.rows,
        loaded: true
      })
    }).catch(() => {
      if (!isRefresh) {
        this.setData({ page: Math.max(1, this.data.page) })
      }
    }).then(() => {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    })
  }
})
