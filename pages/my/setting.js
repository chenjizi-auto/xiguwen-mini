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

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function maskMobile(mobile) {
  const text = safeText(mobile)
  return /^1\d{10}$/.test(text) ? `${text.slice(0, 3)}****${text.slice(7)}` : ''
}

Page({
  data: {
    showLogs: true,
    userCard: {
      head: '',
      nickname: '未登录',
      mobileText: '未绑定手机号',
      statusText: ''
    },
    menuMeta: {
      address: '管理常用收货地址',
      profile: '头像、昵称与基础资料',
      account: '手机号、微信绑定与注销',
      security: '登录密码与支付密码',
      logs: '查看本地操作记录'
    }
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '设置'
    })
    if (!xgwAuth.isLogined()) {
      this.promptXgwLogin()
    }
  },

  onShow() {
    if (!xgwAuth.isLogined()) {
      this.promptXgwLogin()
      return
    }
    this.refreshUserCard()
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

  refreshUserCard() {
    const mineHome = xgwAuth.getMineHome() || {}
    const userInfo = xgwAuth.getUserInfo() || {}
    const mobileText = maskMobile(userInfo.mobile) || '未绑定手机号'
    this.setData({
      userCard: {
        head: safeText(mineHome.head || userInfo.head),
        nickname: safeText(mineHome.nickname || userInfo.nickname, '喜顾问用户'),
        mobileText,
        statusText: xgwAuth.isLogined() ? '已登录' : '未登录'
      }
    })
  },

  onProfileCardTap() {
    if (!xgwAuth.isLogined()) {
      this.promptXgwLogin()
      return
    }
    wx.navigateTo({
      url: ROUTE_MAP.profile
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
