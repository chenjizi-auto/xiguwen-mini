const AUTH = require('../../utils/auth')
const xgwAuth = require('../../utils/xgw-auth')
const xgwLog = require('../../utils/xgw-log')

const ROUTE_MAP = {
  address: '/pages/settings/address/index',
  profile: '/pages/settings/profile/index',
  account: '/pages/settings/account/index',
  security: '/pages/settings/security/index',
  logs: '/pages/settings/logs/index'
}

Page({
  data: {
    showLogs: true
  },

  onLoad() {
    if (!xgwAuth.isLogined()) {
      this.promptXgwLogin()
    }
  },

  onShow() {
    if (!xgwAuth.isLogined()) {
      this.promptXgwLogin()
    }
  },

  promptXgwLogin() {
    if (this._loginPromptShown) {
      return
    }
    this._loginPromptShown = true
    wx.showModal({
      title: '请先登录',
      content: '当前账号未登录，是否前往登录页？',
      confirmText: '去登录',
      confirmColor: '#e64340',
      success: res => {
        this._loginPromptShown = false
        if (res.confirm) {
          wx.redirectTo({
            url: '/pages/login/index'
          })
          return
        }
        wx.switchTab({
          url: '/pages/my/index'
        })
      },
      fail: () => {
        this._loginPromptShown = false
      }
    })
  },

  handleMenuTap(e) {
    const action = e.currentTarget.dataset.action
    const url = ROUTE_MAP[action]
    if (!url) {
      return
    }
    if (!xgwAuth.isLogined()) {
      this.promptXgwLogin()
      return
    }
    wx.navigateTo({
      url
    })
  },

  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确认退出当前登录账号？',
      confirmText: '退出',
      confirmColor: '#e64340',
      success: res => {
        if (!res.confirm) {
          return
        }
        xgwLog.record('退出登录', `userid=${xgwAuth.getUserId()}`)
        xgwAuth.clearLogin()
        AUTH.loginOut()
        wx.showToast({
          title: '已退出登录',
          icon: 'success'
        })
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/my/index'
          })
        }, 200)
      }
    })
  }
})
