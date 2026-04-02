const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

function safeStr(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function normalizeRegion(value) {
  const text = safeStr(value).trim()
  if (!text) return ''
  return text.replace(/^\/+/, '')
}

function normalizeFanItem(item = {}) {
  return {
    userid: Number(item.userid) || 0,
    head: safeStr(item.head),
    nickname: safeStr(item.nickname, '未命名用户'),
    occupation: safeStr(item.occupationid),
    region: normalizeRegion(item.diqu)
  }
}

Page({
  data: {
    defaultAvatar: '/images/default.png',
    load_img_erro: '/images/load_img_erro.png',
    fans: [],
    totalText: '全部粉丝(0)',
    loaded: false,
    loading: false
  },

  onLoad() {
    this.ensureLogin()
  },

  onShow() {
    if (!xgwAuth.isLogined()) {
      return
    }
    this.loadFans()
  },

  onPullDownRefresh() {
    if (!xgwAuth.isLogined()) {
      wx.stopPullDownRefresh()
      return
    }
    this.loadFans()
  },

  ensureLogin() {
    if (xgwAuth.isLogined()) {
      return true
    }
    wx.showModal({
      title: '请先登录',
      content: '当前未登录，是否前往登录？',
      confirmText: '去登录',
      confirmColor: '#e64340',
      success: res => {
        if (!res.confirm) return
        wx.navigateTo({
          url: '/pages/login/index'
        })
      }
    })
    return false
  },

  onAvatarError(e) {
    const index = e && e.currentTarget ? Number(e.currentTarget.dataset.index) : -1
    if (index < 0) return
    this.setData({
      [`fans[${index}].head`]: this.data.load_img_erro
    })
  },

  async loadFans() {
    if (this.data.loading) return

    this.setData({ loading: true })
    try {
      const res = await network.myFansList({})
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '加载失败')
      }
      const list = Array.isArray(res && res.data) ? res.data.map(normalizeFanItem) : []
      this.setData({
        fans: list,
        totalText: `全部粉丝(${list.length})`,
        loaded: true
      })
    } catch (e) {
      wx.showToast({
        title: e && e.message ? e.message : '加载失败',
        icon: 'none'
      })
      this.setData({
        fans: [],
        totalText: '全部粉丝(0)',
        loaded: true
      })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  }
})
