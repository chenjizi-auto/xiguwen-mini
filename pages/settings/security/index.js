const xgwAuth = require('../../../utils/xgw-auth.js')

Page({
  data: {
    mobile: ''
  },

  onShow() {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({
        url: '/pages/login/index'
      })
      return
    }
    this.setData({
      mobile: xgwAuth.getMobile()
    })
  },

  onLoginPasswordTap() {
    wx.navigateTo({
      url: '/pages/settings/password/index?kind=login'
    })
  },

  onPayPasswordTap() {
    wx.navigateTo({
      url: '/pages/settings/password/index?kind=pay'
    })
  }
})
