const network = require('../../api/network.js')
const xgwAuth = require('../../utils/xgw-auth.js')
const APP = getApp()

function formatMoney(value, fallback = '0.00') {
  const num = Number(value)
  if (Number.isFinite(num)) {
    return num.toFixed(2)
  }
  const text = value == null ? '' : String(value).trim()
  return text || fallback
}

Page({
  data: {
    navHeight: 0,
    navTop: 0,
    heroPaddingTop: 88,
    displayBalance: '0.00',
    loading: false
  },

  onLoad() {
    this.initNavBar()
    const cachedMineHome = xgwAuth.getMineHome()
    this.setData({
      displayBalance: formatMoney(cachedMineHome && cachedMineHome.money)
    })
    this.ensureLogin()
  },

  onShow() {
    if (!xgwAuth.isLogined()) {
      return
    }
    this.loadBalance()
  },

  onPullDownRefresh() {
    if (!xgwAuth.isLogined()) {
      wx.stopPullDownRefresh()
      return
    }
    this.loadBalance()
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

      this.setData({
        navHeight,
        navTop,
        heroPaddingTop: navHeight + 24
      })
    } catch (e) {
      this.setData({
        navHeight: 64,
        navTop: 20,
        heroPaddingTop: 88
      })
    }
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

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({
        delta: 1
      })
      return
    }
    wx.switchTab({
      url: '/pages/my/index'
    })
  },

  goDetails() {
    if (!this.ensureLogin()) {
      return
    }
    wx.navigateTo({
      url: '/pages/asset/details/index'
    })
  },

  goWithdraw() {
    if (!this.ensureLogin()) {
      return
    }
    wx.navigateTo({
      url: '/pages/withdraw/index'
    })
  },

  async loadBalance() {
    if (this.data.loading) {
      return
    }

    this.setData({ loading: true })
    try {
      const res = await network.xgwBankBalance({})
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '加载失败')
      }
      const displayBalance = formatMoney(res.data)
      this.setData({ displayBalance })
      xgwAuth.updateMineHome({ money: displayBalance })
    } catch (e) {
      wx.showToast({
        title: e && e.message ? e.message : '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  }
})
