const xgwAuth = require('../../../utils/xgw-auth.js')

function maskMobile(mobile) {
  const text = mobile ? String(mobile) : ''
  return /^1\d{10}$/.test(text) ? `${text.slice(0, 3)}****${text.slice(7)}` : ''
}

Page({
  data: {
    mobile: '',
    mobileText: '未绑定',
    tipText: '密码修改后会即时生效'
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '安全设置'
    })
  },

  onShow() {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({
        url: '/pages/login/index'
      })
      return
    }
    this.setData({
      mobile: xgwAuth.getMobile(),
      mobileText: maskMobile(xgwAuth.getMobile()) || '未绑定',
      tipText: xgwAuth.getMobile() ? '当前已启用手机号安全校验' : '建议先绑定手机号再修改密码'
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
