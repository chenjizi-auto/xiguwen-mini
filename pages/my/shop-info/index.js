const network = require('../../../api/network.js')

const DEFAULT_COVER = '/images/load_img.webp'

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function normalizeArray(list) {
  if (!Array.isArray(list)) return []
  return list.map(item => safeStr(item)).filter(Boolean)
}

function getTeamText(team) {
  const value = asNumber(team, 0)
  if (value === 1) return '个人商家'
  if (value === 2) return '团队商家'
  return '--'
}

function getStatusText(status) {
  const value = asNumber(status, 1)
  if (value === 2) return '下线'
  return '上线'
}

function normalizeDetail(data = {}) {
  const photos = normalizeArray(data.shopimg)
  const background = safeStr(data.background, DEFAULT_COVER) || DEFAULT_COVER
  return {
    background,
    shopId: safeStr(data.userid, '--'),
    name: safeStr(data.nickname, '--'),
    teamText: getTeamText(data.team),
    statusText: getStatusText(data.onlinestatus),
    occupation: safeStr(data.occupationid, '--'),
    areaText: `${safeStr(data.provinceid)}${safeStr(data.cityid)}${safeStr(data.countyid)}` || '--',
    address: safeStr(data.site, '--'),
    content: safeStr(data.content, ''),
    usertype: asNumber(data.usertype, 0),
    photos,
    previewUrls: [background].concat(photos)
  }
}

Page({
  data: {
    loading: true,
    errorText: '',
    detail: null,
    defaultCover: DEFAULT_COVER
  },

  onLoad() {
    this.fetchDetail()
  },

  onShow() {
    if (this._shouldRefreshOnShow) {
      this._shouldRefreshOnShow = false
      this.fetchDetail()
    }
  },

  onHide() {
    if (this.data.detail) {
      this._shouldRefreshOnShow = true
    }
  },

  onPullDownRefresh() {
    this.fetchDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async fetchDetail() {
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const res = await network.xgwStoreInformation({})
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && res.msg) || 'request failed')
      }
      this.setData({
        loading: false,
        detail: normalizeDetail(res.data),
        errorText: ''
      })
    } catch (err) {
      this.setData({
        loading: false,
        detail: null,
        errorText: '店铺信息加载失败，请稍后重试'
      })
    }
  },

  previewBackground() {
    const detail = this.data.detail
    if (!detail || !detail.background) return
    wx.previewImage({
      current: detail.background,
      urls: detail.previewUrls || [detail.background]
    })
  },

  previewPhoto(e) {
    const url = safeStr(e && e.currentTarget ? e.currentTarget.dataset.url : '')
    const detail = this.data.detail
    if (!url || !detail) return
    wx.previewImage({
      current: url,
      urls: detail.previewUrls || [url]
    })
  },

  goEdit() {
    if (!this.data.detail) return
    wx.navigateTo({
      url: '/pages/my/shop-info/edit/index'
    })
  }
})
