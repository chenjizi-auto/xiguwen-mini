const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

const DEFAULT_COVER = '/images/load_img.webp'

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function splitImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(item => safeText(item))
  const text = safeText(value)
  if (!text) return []
  return text
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function buildAreaText(detail = {}) {
  return [safeText(detail.province), safeText(detail.city), safeText(detail.county)].filter(Boolean).join(' ') || '--'
}

function normalizeDetail(data = {}) {
  const photos = splitImages(data.photo || data.photourl || data.shopimg)
  return {
    name: safeText(data.shopname || data.name, '未填写店铺名称'),
    usertype: asNumber(data.usertype, 0),
    storeId: safeText(data.shopid || data.id || data.shopcode, '--'),
    logo: safeText(data.background || data.headimg || data.cover || photos[0], DEFAULT_COVER) || DEFAULT_COVER,
    photos,
    occupation: safeText(data.columnname || data.zhiye || data.occupation, '--'),
    address: safeText(data.address || data.dizhi, '--'),
    areaText: buildAreaText(data),
    intro: safeText(data.synopsis || data.content || data.describes, ''),
    contact: safeText(data.mobile || data.phone || data.tel, '')
  }
}

Page({
  data: {
    loading: true,
    detail: null,
    errorText: '',
    defaultCover: DEFAULT_COVER,
    quickActions: [
      { id: 'info', title: '店铺信息', desc: '查看并编辑资料' },
      { id: 'quote', title: '发布报价', desc: '管理店铺报价' },
      { id: 'atlas', title: '上传图片', desc: '管理图册内容' },
      { id: 'video', title: '上传视频', desc: '管理视频内容' },
      { id: 'case', title: '上传案例', desc: '管理案例作品' },
      { id: 'city', title: '服务城市', desc: '管理服务区域' }
    ]
  },

  onLoad() {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    this.fetchDetail()
  },

  onPullDownRefresh() {
    this.fetchDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  previewLogo() {
    const detail = this.data.detail
    if (!detail || !detail.logo) return
    const urls = [detail.logo].concat(detail.photos || [])
    wx.previewImage({
      current: detail.logo,
      urls
    })
  },

  previewPhoto(e) {
    const current = safeText(e.currentTarget.dataset.url)
    if (!current) return
    wx.previewImage({
      current,
      urls: this.data.detail && this.data.detail.photos ? this.data.detail.photos : [current]
    })
  },

  onQuickActionTap(e) {
    const id = safeText(e.currentTarget.dataset.id)
    const routeMap = {
      info: '/pages/my/shop-info/index',
      quote: '/pages/my/quote/index',
      atlas: '/pages/my/mine-atlas/index',
      video: '/pages/my/video/index',
      case: '/pages/my/case/index',
      city: '/pages/my/service-city/index'
    }
    const url = routeMap[id]
    if (!url) return
    wx.navigateTo({ url })
  },

  async fetchDetail() {
    this.setData({ loading: true, errorText: '' })
    try {
      const res = await network.xgwStoreInformation({})
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.message || res.msg)) || '加载店铺主页失败')
      }
      this.setData({
        detail: normalizeDetail(res.data),
        loading: false
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载店铺主页失败'
      })
    }
  }
})
