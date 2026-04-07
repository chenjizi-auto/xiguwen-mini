const api = require('../../api/api.js')
const network = require('../../api/network.js')
const xgwAuth = require('../../utils/xgw-auth.js')

const TABS = [
  { key: 'home', text: '首页' },
  { key: 'quote', text: '报价' },
  { key: 'works', text: '作品' },
  { key: 'comment', text: '评价' },
  { key: 'dynamic', text: '动态' },
  { key: 'schedule', text: '档期' },
  { key: 'profile', text: '资料' }
]

const PAGE_SIZE = 10

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function absoluteUrl(url = '') {
  const text = safeText(url)
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text
  if (text.startsWith('/')) return `${api.ApiRoot}${text}`
  return text
}

function formatPrice(value, fallback = '面议') {
  const text = safeText(value)
  if (!text || text === '0' || text === '0.00') return fallback
  return `￥${text}`
}

function parseShopImages(value) {
  const text = safeText(value)
  if (!text) return []
  const matches = text.match(/https?:\/\/[^\s"'\\]+|\/uploads\/[^\s"'\\;]+/g) || []
  return matches.map(item => absoluteUrl(item)).filter(Boolean)
}

function normalizeBasic(data = {}, fallback = {}) {
  return {
    userid: safeText(data.userid || fallback.userid),
    addr: safeText(data.addr, '--'),
    mobile: safeText(data.mobile, '--'),
    sex: safeText(data.sex, '--'),
    age: safeText(data.age, '--'),
    height: safeText(data.height, '--'),
    weight: safeText(data.weight, '--'),
    intro: safeText(data.smalltext),
    followed: asNumber(fallback.followed, 0) === 1
  }
}

function normalizeCommentPictures(pictures) {
  if (Array.isArray(pictures)) {
    return pictures.map(item => absoluteUrl(item)).filter(Boolean)
  }
  if (typeof pictures === 'string') {
    return pictures
      .split(',')
      .map(item => absoluteUrl(item.trim()))
      .filter(Boolean)
  }
  return []
}

function normalizeDynamicPictures(list) {
  if (!Array.isArray(list)) return []
  return list.map(item => absoluteUrl(item && (item.photourl || item.url))).filter(Boolean)
}

function normalizeHomeData(data = {}, fallback = {}, basic = {}) {
  const user = data.user || {}
  const userinfo = data.userinfo || {}
  const quoteRaw = data.baojia && Array.isArray(data.baojia.baojia) ? data.baojia.baojia : []
  const workRaw = data.zuoping && Array.isArray(data.zuoping.zuopin) ? data.zuoping.zuopin : []
  const commentRaw = Array.isArray(data.pinglun) ? data.pinglun : []
  const teamRaw = Array.isArray(data.tuijiantd) ? data.tuijiantd : []
  const followed = asNumber(data.userf, basic.followed ? 1 : asNumber(fallback.followed, 0)) === 1

  return {
    userid: safeText(user.userid || basic.userid || fallback.userid),
    head: absoluteUrl(user.head || fallback.head),
    nickname: safeText(user.nickname || fallback.name, '商家主页'),
    occupation: safeText(user.occupation || fallback.occupation || user.occupationid, '婚礼商家'),
    company: safeText(userinfo.company),
    address: safeText(userinfo.dizhi || user.site || basic.addr, '--'),
    mobile: safeText(user.mobile || basic.mobile, '--'),
    sex: safeText(basic.sex, '--'),
    age: safeText(basic.age, '--'),
    height: safeText(basic.height, '--'),
    weight: safeText(basic.weight, '--'),
    intro: safeText(userinfo.content || basic.intro, '商家暂未填写简介'),
    qualification: safeText(userinfo.qualifications, '商家暂未补充更多资料'),
    background: absoluteUrl(userinfo.background),
    gallery: parseShopImages(userinfo.shopimg),
    stats: [
      { label: '评分', value: safeText(user.goodscore, '0') },
      { label: '粉丝', value: safeText(user.fans, '0') },
      { label: '浏览', value: safeText(user.pv, '0') },
      { label: '起价', value: formatPrice(user.price) }
    ],
    counts: {
      quotes: asNumber(data.baojia && data.baojia.zongshu, quoteRaw.length),
      works: asNumber(data.zuoping && data.zuoping.zongshu, workRaw.length),
      comments: commentRaw.length,
      teams: teamRaw.length
    },
    quotePreviewList: normalizeQuoteItems(quoteRaw.slice(0, 4)),
    quoteList: normalizeQuoteItems(quoteRaw.slice(0, 4)),
    workPreviewList: normalizeWorkItems(workRaw.slice(0, 6)),
    workList: normalizeWorkItems(workRaw.slice(0, 6)),
    commentPreviewList: normalizeCommentItems(commentRaw.slice(0, 3)),
    commentList: normalizeCommentItems(commentRaw.slice(0, 3)),
    teamList: teamRaw.slice(0, 6).map(item => ({
      userid: safeText(item.userid),
      nickname: safeText(item.nickname, '团队成员'),
      occupation: safeText(item.occupation || item.occupationid, '婚礼商家'),
      head: absoluteUrl(item.head),
      price: formatPrice(item.zuidijia)
    })),
    followed
  }
}

function normalizeQuoteItems(list) {
  return (Array.isArray(list) ? list : []).map(item => ({
    id: asNumber(item && item.quotationid),
    title: safeText(item && item.name, '未命名报价'),
    cover: absoluteUrl(item && item.imglist),
    price: formatPrice(item && item.price),
    countText: `${asNumber(item && item.num)}人查看`
  }))
}

function normalizeWorkItems(list) {
  return (Array.isArray(list) ? list : []).map(item => ({
    id: asNumber(item && item.id),
    type: safeText(item && item.type),
    title: safeText(item && (item.title || item.name), '未命名作品'),
    cover: absoluteUrl(item && (item.weddingcover || item.cover)),
    desc: safeText(item && (item.weddingdescribe || item.synopsis || '')),
    countText: `${asNumber(item && (item.clicked || item.num))}热度`
  }))
}

function normalizeCommentItems(list) {
  return (Array.isArray(list) ? list : []).map(item => ({
    id: asNumber(item && item.comment_id),
    nickname: safeText(item && (item.nickname || item.username), '匿名用户'),
    head: absoluteUrl(item && item.head),
    content: safeText(item && item.content, '该用户未填写评价内容'),
    time: safeText(item && item.created_at),
    score: asNumber(item && item.order_score),
    pictures: normalizeCommentPictures(item && item.pictures),
    replyContent: safeText(item && item.replay_content),
    replyTime: safeText(item && item.replay_time)
  }))
}

function normalizeDynamicList(data = {}) {
  const list = Array.isArray(data.dongtai) ? data.dongtai : []
  return {
    total: asNumber(data.num, list.length),
    list: normalizeDynamicItems(list)
  }
}

function normalizeDynamicItems(list) {
  return (Array.isArray(list) ? list : []).map(item => ({
    id: asNumber(item.id),
    nickname: safeText(item.nickname, '商家动态'),
    occupation: safeText(item.occupation || item.theteam),
    head: absoluteUrl(item.head),
    time: safeText(item.create_ti),
    content: safeText(item.contentmw || item.content),
    pv: asNumber(item.pv),
    zan: asNumber(item.zan),
    commentCount: asNumber(item.commentnum || item.pls),
    images: normalizeDynamicPictures(item.photourl || item.pics),
    myzan: asNumber(item.myzan)
  }))
}

function normalizeScheduleList(data) {
  const source = Array.isArray(data) ? data : []
  const groups = source
    .map(group => ({
      title: safeText(group && group.dateye),
      list: Array.isArray(group && group.dangqi)
        ? group.dangqi.map(item => ({
            id: asNumber(item && item.id),
            date: safeText(item && item.date, '--'),
            timeslot: safeText(item && item.timeslot, '全天')
          }))
        : []
    }))
    .filter(group => group.title || group.list.length)
  return {
    total: groups.reduce((sum, group) => sum + group.list.length, 0),
    groups
  }
}

function buildMerchantDetail(homeData, fallback, basicData, dynamicData, scheduleData) {
  const detail = Object.assign(
    normalizeHomeData(homeData || {}, fallback, normalizeBasic(basicData || {}, fallback)),
    {
      dynamic: normalizeDynamicList(dynamicData || {}),
      schedule: normalizeScheduleList(scheduleData || [])
    }
  )
  detail.dynamicPreviewList = (detail.dynamic && Array.isArray(detail.dynamic.list) ? detail.dynamic.list : []).slice(0, 3)
  return detail
}

Page({
  data: {
    loading: true,
    errorText: '',
    detail: null,
    activeTab: 'home',
    tabs: TABS,
    tabLoading: false,
    tabLoadingText: '',
    tabNoMore: false,
    showToTop: false
  },

  onLoad(options) {
    this.tabPager = {
      quote: { page: 0, loaded: false, loading: false, noMore: false },
      works: { page: 0, loaded: false, loading: false, noMore: false },
      comment: { page: 0, loaded: false, loading: false, noMore: false },
      dynamic: { page: 1, loaded: true, loading: false, noMore: false }
    }
    this.fallback = {
      userid: safeText(options && options.userid),
      head: decodeURIComponent(safeText(options && options.head)),
      name: decodeURIComponent(safeText(options && options.name)),
      occupation: decodeURIComponent(safeText(options && options.occupation)),
      followed: safeText(options && options.followed)
    }
    if (typeof this.getOpenerEventChannel === 'function') {
      this.eventChannel = this.getOpenerEventChannel()
    }
    wx.setNavigationBarTitle({
      title: decodeURIComponent(safeText(options && options.name, '商家主页')) || '商家主页'
    })
    this.fetchDetail()
  },

  onShow() {
    if (!this.needsDynamicRefresh || !this.data.detail || !this.data.detail.userid) return
    this.needsDynamicRefresh = false
    this.loadTabData('dynamic', true)
  },

  onPageScroll(e) {
    const scrollTop = asNumber(e && e.scrollTop, 0)
    this.setData({
      showToTop: scrollTop > 480
    })
  },

  onPullDownRefresh() {
    this.tabPager = {
      quote: { page: 0, loaded: false, loading: false, noMore: false },
      works: { page: 0, loaded: false, loading: false, noMore: false },
      comment: { page: 0, loaded: false, loading: false, noMore: false },
      dynamic: { page: 1, loaded: true, loading: false, noMore: false }
    }
    this.fetchDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async fetchDetail() {
    if (!this.fallback.userid) {
      this.setData({
        loading: false,
        errorText: '缺少商家参数'
      })
      return
    }
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const [homeRes, basicRes, dynamicRes, scheduleRes] = await Promise.allSettled([
        network.xgwMerchantHomeDetail({ id: this.fallback.userid }),
        network.xgwMerchantDetail({ userid: this.fallback.userid }),
        network.xgwMerchantDynamic({ id: this.fallback.userid, p: 1, rows: 10 }),
        network.xgwMerchantSchedule({ id: this.fallback.userid })
      ])

      const homeData =
        homeRes.status === 'fulfilled' && homeRes.value && homeRes.value.code === 0 && homeRes.value.data
          ? homeRes.value.data
          : null
      const basicData =
        basicRes.status === 'fulfilled' && basicRes.value && basicRes.value.code === 0 && basicRes.value.data
          ? basicRes.value.data
          : null
      const dynamicData =
        dynamicRes.status === 'fulfilled' && dynamicRes.value && dynamicRes.value.code === 0 && dynamicRes.value.data
          ? dynamicRes.value.data
          : {}
      const scheduleData =
        scheduleRes.status === 'fulfilled' && scheduleRes.value && scheduleRes.value.code === 0 && scheduleRes.value.data
          ? scheduleRes.value.data
          : []

      if (!homeData && !basicData) {
        throw new Error('加载失败')
      }

      this.setData({
        loading: false,
        detail: buildMerchantDetail(homeData, this.fallback, basicData, dynamicData, scheduleData)
      })
      const detail = this.data.detail
      this.tabPager.dynamic.noMore = !detail.dynamic.total || detail.dynamic.list.length >= detail.dynamic.total
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载失败',
        detail: buildMerchantDetail({}, this.fallback, {}, {}, [])
      })
    }
  },

  onRetryTap() {
    this.fetchDetail()
  },

  onBackTap() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }
    })
  },

  onShareTap() {
    wx.showToast({
      title: '请使用右上角分享',
      icon: 'none'
    })
  },

  onToTopTap() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 260
    })
  },

  onTabTap(e) {
    const key = e && e.currentTarget ? safeText(e.currentTarget.dataset.key) : ''
    if (!key || key === this.data.activeTab) return
    const pager = this.tabPager[key]
    this.setData({
      activeTab: key,
      tabNoMore: !!(pager && pager.loaded && pager.noMore)
    })
    this.ensureTabData(key)
  },

  async onFollowTap() {
    const detail = this.data.detail
    if (!detail || !detail.userid) return
    if (!xgwAuth.isLogined()) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    try {
      const res = detail.followed
        ? await network.xgwShopFollowDelete({ id: detail.userid })
        : await network.xgwShopFollowAdd({ id: detail.userid })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '操作失败')
      }
      this.setData({
        'detail.followed': !detail.followed
      })
      if (this.eventChannel) {
        this.eventChannel.emit('merchantFollowChanged', {
          userid: detail.userid,
          followed: detail.followed ? 0 : 1
        })
      }
      wx.showToast({
        title: detail.followed ? '已取消关注' : '已关注',
        icon: 'success'
      })
    } catch (err) {
      wx.showToast({
        title: err && err.message ? err.message : '操作失败',
        icon: 'none'
      })
    }
  },

  onSectionMoreTap(e) {
    const key = e && e.currentTarget ? safeText(e.currentTarget.dataset.key) : ''
    if (!key) return
    const pager = this.tabPager[key]
    this.setData({
      activeTab: key,
      tabNoMore: !!(pager && pager.loaded && pager.noMore)
    })
    this.ensureTabData(key)
  },

  onReachBottom() {
    const key = this.data.activeTab
    if (!this.isPagedTab(key)) return
    this.loadTabData(key, false)
  },

  isPagedTab(key) {
    return key === 'quote' || key === 'works' || key === 'comment' || key === 'dynamic'
  },

  ensureTabData(key) {
    if (!this.isPagedTab(key)) return
    const pager = this.tabPager[key]
    if (pager && pager.loaded) return
    this.loadTabData(key, true)
  },

  async loadTabData(key, reset = false) {
    const detail = this.data.detail
    if (!detail || !detail.userid || !this.isPagedTab(key)) return
    const pager = this.tabPager[key]
    if (!pager || pager.loading) return
    if (!reset && pager.noMore) return

    const nextPage = reset ? 1 : pager.page + 1
    pager.loading = true
    this.setData({
      tabLoading: true,
      tabLoadingText: reset ? '加载中...' : '正在加载更多...'
    })
    try {
      let res
      let total = 0
      let list = []
      if (key === 'quote') {
        res = await network.xgwMerchantQuoteList({ id: detail.userid, p: nextPage, rows: PAGE_SIZE })
        total = asNumber(res && res.data && res.data.zongshu)
        list = normalizeQuoteItems(res && res.data && res.data.baojia)
      } else if (key === 'works') {
        res = await network.xgwMerchantWorksList({ id: detail.userid, p: nextPage, rows: PAGE_SIZE })
        total = asNumber(res && res.data && res.data.num)
        list = normalizeWorkItems(res && res.data && res.data.zuoping)
      } else if (key === 'comment') {
        res = await network.xgwMerchantCommentList({ id: detail.userid, p: nextPage, rows: PAGE_SIZE })
        total = asNumber(res && res.data && res.data.num)
        list = normalizeCommentItems(res && res.data && res.data.pinlun)
      } else if (key === 'dynamic') {
        res = await network.xgwMerchantDynamic({ id: detail.userid, p: nextPage, rows: PAGE_SIZE })
        total = asNumber(res && res.data && res.data.num)
        list = normalizeDynamicItems(res && res.data && res.data.dongtai)
      }
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '加载失败')
      }

      const currentList = reset ? [] : this.getTabListByKey(key)
      const mergedList = currentList.concat(list)
      const noMore = list.length < PAGE_SIZE || (total > 0 ? mergedList.length >= total : list.length === 0)
      const updates = {}
      if (key === 'quote') {
        updates['detail.quoteList'] = mergedList
        updates['detail.counts.quotes'] = total || mergedList.length
      } else if (key === 'works') {
        updates['detail.workList'] = mergedList
        updates['detail.counts.works'] = total || mergedList.length
      } else if (key === 'comment') {
        updates['detail.commentList'] = mergedList
        updates['detail.counts.comments'] = total || mergedList.length
      } else if (key === 'dynamic') {
        updates['detail.dynamic.list'] = mergedList
        updates['detail.dynamic.total'] = total || mergedList.length
        updates['detail.dynamicPreviewList'] = mergedList.slice(0, 3)
      }
      this.setData(Object.assign(updates, {
        tabNoMore: noMore
      }))
      pager.page = nextPage
      pager.loaded = true
      pager.noMore = noMore
    } catch (err) {
      wx.showToast({
        title: err && err.message ? err.message : '加载失败',
        icon: 'none'
      })
    } finally {
      pager.loading = false
      this.setData({
        tabLoading: false,
        tabLoadingText: ''
      })
    }
  },

  getTabListByKey(key) {
    const detail = this.data.detail || {}
    if (key === 'quote') return Array.isArray(detail.quoteList) ? detail.quoteList : []
    if (key === 'works') return Array.isArray(detail.workList) ? detail.workList : []
    if (key === 'comment') return Array.isArray(detail.commentList) ? detail.commentList : []
    if (key === 'dynamic' && detail.dynamic) return Array.isArray(detail.dynamic.list) ? detail.dynamic.list : []
    return []
  },

  onCallTap() {
    const mobile = safeText(this.data.detail && this.data.detail.mobile)
    if (!/^1\d{10}$/.test(mobile)) {
      wx.showToast({
        title: '暂无有效手机号',
        icon: 'none'
      })
      return
    }
    wx.makePhoneCall({
      phoneNumber: mobile
    })
  },

  onBookTap() {
    if (!xgwAuth.isLogined()) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    wx.navigateTo({
      url: '/packageWedding/pages/get-suggest/index'
    })
  },

  onWorkTap(e) {
    const id = e && e.currentTarget ? asNumber(e.currentTarget.dataset.id) : 0
    const type = e && e.currentTarget ? safeText(e.currentTarget.dataset.type) : ''
    if (!id) return
    if (type === 'sp') {
      wx.navigateTo({ url: `/pages/my/video/detail/index?id=${id}` })
      return
    }
    if (type === 'tc') {
      wx.navigateTo({ url: `/pages/my/mine-atlas-detail/index?id=${id}` })
      return
    }
    wx.navigateTo({ url: `/packageCase/pages/detail/index?id=${id}` })
  },

  onQuoteTap(e) {
    const id = e && e.currentTarget ? asNumber(e.currentTarget.dataset.id) : 0
    if (!id) return
    wx.navigateTo({ url: `/pages/my/quote/detail/index?id=${id}` })
  },

  onTeamTap(e) {
    const userid = e && e.currentTarget ? safeText(e.currentTarget.dataset.userid) : ''
    if (!userid) return
    wx.navigateTo({ url: `/packageWedding/pages/merchant/detail?userid=${encodeURIComponent(userid)}` })
  },

  onDynamicTap(e) {
    const id = e && e.currentTarget ? asNumber(e.currentTarget.dataset.id) : 0
    if (!id) return
    this.needsDynamicRefresh = true
    wx.navigateTo({ url: `/packageDiscover/pages/discover-detail/index?id=${id}&type=1` })
  },

  async onDynamicLikeTap(e) {
    if (!xgwAuth.isLogined()) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    const dynamicIndex = e && e.currentTarget ? asNumber(e.currentTarget.dataset.dynamicIndex, -1) : -1
    const list = this.data.detail && this.data.detail.dynamic && Array.isArray(this.data.detail.dynamic.list)
      ? this.data.detail.dynamic.list
      : []
    const item = dynamicIndex >= 0 ? list[dynamicIndex] : null
    if (!item || !item.id) return
    try {
      const req = asNumber(item.myzan) === 1 ? network.xgwDynamicDislike : network.xgwDynamicLike
      const res = await req({ id: item.id })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '操作失败')
      }
      const nextMyzan = asNumber(item.myzan) === 1 ? 0 : 1
      const nextZan = Math.max(0, asNumber(item.zan) + (nextMyzan === 1 ? 1 : -1))
      this.setData({
        [`detail.dynamic.list[${dynamicIndex}].myzan`]: nextMyzan,
        [`detail.dynamic.list[${dynamicIndex}].zan`]: nextZan
      })
      if (dynamicIndex < 3 && this.data.detail && Array.isArray(this.data.detail.dynamicPreviewList)) {
        this.setData({
          [`detail.dynamicPreviewList[${dynamicIndex}].myzan`]: nextMyzan,
          [`detail.dynamicPreviewList[${dynamicIndex}].zan`]: nextZan
        })
      }
    } catch (err) {
      wx.showToast({
        title: err && err.message ? err.message : '操作失败',
        icon: 'none'
      })
    }
  },

  onDynamicCommentTap(e) {
    this.onDynamicTap(e)
  },

  onPreviewGallery(e) {
    const current = e && e.currentTarget ? safeText(e.currentTarget.dataset.url) : ''
    const urls = (this.data.detail && this.data.detail.gallery) || []
    if (!current || !urls.length) return
    wx.previewImage({
      current,
      urls
    })
  },

  onPreviewCommentImage(e) {
    const commentIndex = e && e.currentTarget ? asNumber(e.currentTarget.dataset.commentIndex, -1) : -1
    const imageIndex = e && e.currentTarget ? asNumber(e.currentTarget.dataset.imageIndex, -1) : -1
    const comments = this.data.detail && Array.isArray(this.data.detail.commentList) ? this.data.detail.commentList : []
    const urls = commentIndex >= 0 && comments[commentIndex] && Array.isArray(comments[commentIndex].pictures)
      ? comments[commentIndex].pictures
      : []
    const current = imageIndex >= 0 && urls[imageIndex] ? urls[imageIndex] : ''
    if (!current || !urls.length) return
    wx.previewImage({
      current,
      urls
    })
  },

  onPreviewDynamicImage(e) {
    const dynamicIndex = e && e.currentTarget ? asNumber(e.currentTarget.dataset.dynamicIndex, -1) : -1
    const imageIndex = e && e.currentTarget ? asNumber(e.currentTarget.dataset.imageIndex, -1) : -1
    const dynamicList =
      this.data.detail && this.data.detail.dynamic && Array.isArray(this.data.detail.dynamic.list)
        ? this.data.detail.dynamic.list
        : []
    const urls = dynamicIndex >= 0 && dynamicList[dynamicIndex] && Array.isArray(dynamicList[dynamicIndex].images)
      ? dynamicList[dynamicIndex].images
      : []
    const current = imageIndex >= 0 && urls[imageIndex] ? urls[imageIndex] : ''
    if (!current || !urls.length) return
    wx.previewImage({
      current,
      urls
    })
  },

  onShareAppMessage() {
    const detail = this.data.detail || {}
    return {
      title: detail.nickname ? `${detail.nickname}的商家主页` : '商家主页',
      path:
        `/packageWedding/pages/merchant/detail?userid=${encodeURIComponent(safeText(detail.userid || this.fallback.userid))}` +
        `&name=${encodeURIComponent(safeText(detail.nickname || this.fallback.name))}` +
        `&head=${encodeURIComponent(safeText(detail.head || this.fallback.head))}` +
        `&occupation=${encodeURIComponent(safeText(detail.occupation || this.fallback.occupation))}` +
        `&followed=${encodeURIComponent(detail.followed ? '1' : '0')}`,
      imageUrl: safeText(detail.background || detail.head)
    }
  }
})
