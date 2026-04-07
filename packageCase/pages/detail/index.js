const api = require('../../../api/api.js')
const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

const DEFAULT_COVER = '/images/load_img.webp'
const DEFAULT_AVATAR = '/images/default.webp'

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

function formatPrice(value, fallback = '面议') {
  const text = safeText(value).trim()
  if (!text || text === '0' || text === '0.00') return fallback
  return `¥${text}`
}

function formatScore(value) {
  const num = asNumber(value, 0)
  if (!num) return '暂无评分'
  return `${num}分`
}

function normalizeGallery(info = {}) {
  const list = Array.isArray(info.photourl) ? info.photourl : []
  const urls = list.map(item => absoluteUrl(item && (item.photourl || item.url))).filter(Boolean)
  const cover = absoluteUrl(info.weddingcover) || urls[0] || DEFAULT_COVER
  if (!urls.length) return [cover]
  if (urls.includes(cover)) return urls
  return [cover].concat(urls)
}

function normalizeCaseInfo(info = {}, typeMap = {}, environmentMap = {}, attentionCount = 0, commentCount = 0) {
  const gallery = normalizeGallery(info)
  return {
    id: asNumber(info.id, 0),
    userid: safeText(info.userid),
    title: safeText(info.title, '未命名案例'),
    cover: gallery[0] || DEFAULT_COVER,
    gallery,
    weddingTime: safeText(info.weddingtime, '--'),
    weddingPlace: safeText(info.weddingplace, '--'),
    weddingExpenses: formatPrice(info.weddingexpenses),
    weddingTypeText: typeMap[asNumber(info.weddingtypeid, 0)] || '--',
    weddingEnvironmentText: environmentMap[asNumber(info.weddingenvironmentid, 0)] || '--',
    description: safeText(info.weddingdescribe, '暂无案例描述'),
    clicked: asNumber(info.clicked || info.pv, 0),
    careCount: asNumber(info.followed, attentionCount),
    commentCount: asNumber(info.commented, commentCount),
    goodscore: formatScore(info.goodscore)
  }
}

function normalizeMerchant(user = {}, followed = false) {
  const badges = []
  if (asNumber(user.shiming, 0) === 1) badges.push('实名认证')
  if (asNumber(user.platform, 0) === 1) badges.push('平台认证')
  if (asNumber(user.sincerity, 0) === 1) badges.push('诚信认证')
  if (asNumber(user.college, 0) === 1) badges.push('学院认证')
  return {
    userid: safeText(user.userid),
    nickname: safeText(user.nickname, '案例商家'),
    occupation: safeText(user.occupation || user.occupationid, '婚礼商家'),
    head: absoluteUrl(user.head) || DEFAULT_AVATAR,
    mobile: safeText(user.mobile || user.moblie),
    address: safeText(user.addr, '--'),
    fans: asNumber(user.fans, 0),
    goodscore: asNumber(user.goodscore, 0),
    evaluate: asNumber(user.evaluate, 0),
    badges,
    followed: !!followed
  }
}

function normalizeTeam(list = []) {
  return (Array.isArray(list) ? list : []).map(item => ({
    userid: safeText(item && item.userid),
    nickname: safeText(item && item.nickname, '团队成员'),
    occupation: safeText(item && (item.occupation || item.occupationid), '婚礼商家'),
    head: absoluteUrl(item && item.head) || DEFAULT_AVATAR,
    goodscore: formatScore(item && item.goodscore),
    price: formatPrice(item && (item.zuidiqijia || item.zuidijia))
  })).filter(item => item.userid)
}

function normalizeComments(list = []) {
  return (Array.isArray(list) ? list : []).map(item => ({
    id: asNumber(item && item.id, 0),
    nickname: safeText(item && item.name, '匿名用户'),
    head: absoluteUrl(item && item.touxiang) || DEFAULT_AVATAR,
    scoreText: `${asNumber(item && item.pingfen, 0)}分`,
    content: safeText(item && item.comment, '该用户未填写评价'),
    time: safeText(item && item.ssj, '--'),
    images: (Array.isArray(item && item.commphoto) ? item.commphoto : []).map(url => absoluteUrl(url)).filter(Boolean)
  }))
}

function normalizeRelated(list = []) {
  return (Array.isArray(list) ? list : []).map(item => ({
    id: asNumber(item && item.id, 0),
    title: safeText(item && item.title, '未命名案例'),
    cover: absoluteUrl(item && item.weddingcover) || DEFAULT_COVER,
    price: formatPrice(item && item.weddingexpenses),
    place: safeText(item && item.weddingplace, '--'),
    clicked: asNumber(item && (item.clicked || item.pv), 0)
  })).filter(item => item.id)
}

function buildTypeMap(list = []) {
  const map = {}
  ;(Array.isArray(list) ? list : []).forEach(item => {
    const id = asNumber(item && (item.id || item.typeid), 0)
    if (!id) return
    map[id] = safeText(item && (item.name || item.title))
  })
  return map
}

Page({
  data: {
    loading: true,
    errorText: '',
    detail: null,
    merchant: null,
    teams: [],
    comments: [],
    relatedCases: [],
    showToTop: false
  },

  onLoad(options) {
    this.caseId = asNumber(options && options.id, 0)
    wx.showShareMenu({ menus: ['shareAppMessage'] })
    if (!this.caseId) {
      this.setData({ loading: false, errorText: '缺少案例参数' })
      return
    }
    this.fetchDetail()
  },

  onPageScroll(e) {
    const scrollTop = asNumber(e && e.scrollTop, 0)
    this.setData({
      showToTop: scrollTop > 480
    })
  },

  async fetchDetail() {
    this.setData({ loading: true, errorText: '' })
    try {
      const [detailRes, typeRes, environmentRes] = await Promise.allSettled([
        network.xgwCaseDetail({ id: this.caseId }),
        network.xgwWeddingTypeList({}),
        network.xgwWeddingEnvironmentList({})
      ])
      const detailResValue = detailRes.status === 'fulfilled' ? detailRes.value : null
      const detailCode = detailResValue && typeof detailResValue.code !== 'undefined' ? detailResValue.code : -1
      const detailData = detailCode === 0
        ? detailRes.value.data
        : null
      if (!detailData || !detailData.info) {
        throw new Error((detailResValue && (detailResValue.message || detailResValue.msg)) || '加载案例详情失败')
      }
      const typeMap = typeRes.status === 'fulfilled' && typeRes.value && typeRes.value.code === 0 ? buildTypeMap(typeRes.value.data) : {}
      const environmentMap = environmentRes.status === 'fulfilled' && environmentRes.value && environmentRes.value.code === 0 ? buildTypeMap(environmentRes.value.data) : {}
      const comments = normalizeComments(detailData.pinglun)
      this.setData({
        loading: false,
        detail: normalizeCaseInfo(detailData.info || {}, typeMap, environmentMap, detailData.pinglunshu, comments.length),
        merchant: normalizeMerchant(detailData.user || {}, asNumber(detailData.userf, 0) === 1),
        teams: normalizeTeam(detailData.team),
        comments,
        relatedCases: normalizeRelated(detailData.gdanli)
      })
      wx.setNavigationBarTitle({ title: safeText(this.data.detail && this.data.detail.title, '案例详情') })
    } catch (err) {
      this.setData({ loading: false, errorText: err && err.message ? err.message : '加载案例详情失败' })
    }
  },

  onRetryTap() {
    if (this.caseId) this.fetchDetail()
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

  onPreviewImage(e) {
    const current = safeText(e && e.currentTarget && e.currentTarget.dataset.url)
    const urls = this.data.detail && Array.isArray(this.data.detail.gallery) ? this.data.detail.gallery : []
    if (!current || !urls.length) return
    wx.previewImage({ current, urls })
  },

  onPreviewCommentImage(e) {
    const commentIndex = asNumber(e && e.currentTarget && e.currentTarget.dataset.commentIndex, -1)
    const imageIndex = asNumber(e && e.currentTarget && e.currentTarget.dataset.imageIndex, -1)
    const comments = Array.isArray(this.data.comments) ? this.data.comments : []
    const urls = commentIndex >= 0 && comments[commentIndex] ? comments[commentIndex].images : []
    const current = imageIndex >= 0 && urls[imageIndex] ? urls[imageIndex] : ''
    if (!current || !urls.length) return
    wx.previewImage({ current, urls })
  },

  onMerchantTap() {
    const merchant = this.data.merchant
    if (!merchant || !merchant.userid) return
    wx.navigateTo({
      url:
        `/packageWedding/pages/merchant/detail?userid=${encodeURIComponent(merchant.userid)}` +
        `&name=${encodeURIComponent(safeText(merchant.nickname))}` +
        `&head=${encodeURIComponent(safeText(merchant.head))}` +
        `&occupation=${encodeURIComponent(safeText(merchant.occupation))}` +
        `&followed=${encodeURIComponent(merchant.followed ? '1' : '0')}`
    })
  },

  onTeamTap(e) {
    const userid = safeText(e && e.currentTarget && e.currentTarget.dataset.userid)
    if (!userid) return
    wx.navigateTo({ url: `/packageWedding/pages/merchant/detail?userid=${encodeURIComponent(userid)}` })
  },

  onRelatedTap(e) {
    const id = asNumber(e && e.currentTarget && e.currentTarget.dataset.id, 0)
    if (!id) return
    wx.navigateTo({ url: `/packageCase/pages/detail/index?id=${id}` })
  },

  onGetPlanTap() {
    if (!xgwAuth.isLogined()) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    wx.navigateTo({ url: '/packageWedding/pages/get-suggest/index' })
  },

  onPriceDetailTap() {
    if (!this.caseId) return
    wx.navigateTo({ url: `/packageCase/pages/priceDetail/index?id=${this.caseId}` })
  },

  async onFollowTap() {
    const merchant = this.data.merchant
    if (!merchant || !merchant.userid) return
    if (!xgwAuth.isLogined()) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    try {
      const res = merchant.followed
        ? await network.xgwShopFollowDelete({ id: merchant.userid })
        : await network.xgwShopFollowAdd({ id: merchant.userid })
      if (!res || res.code !== 0) throw new Error((res && (res.message || res.msg)) || '操作失败')
      this.setData({ 'merchant.followed': !merchant.followed })
      wx.showToast({ title: merchant.followed ? '已取消关注' : '已关注', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: err && err.message ? err.message : '操作失败', icon: 'none' })
    }
  },

  onCallTap() {
    const merchant = this.data.merchant
    if (!merchant || !/^1\d{10}$/.test(safeText(merchant.mobile))) {
      wx.showToast({ title: '暂无有效手机号', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: merchant.mobile })
  },

  onShareAppMessage() {
    const detail = this.data.detail || {}
    return {
      title: detail.title || '案例详情',
      path: `/packageCase/pages/detail/index?id=${encodeURIComponent(safeText(detail.id || this.caseId))}`,
      imageUrl: safeText(detail.cover || DEFAULT_COVER)
    }
  }
})
