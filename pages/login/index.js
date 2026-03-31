const network = require('../../api/network.js')
const xgwAuth = require('../../utils/xgw-auth.js')
const xgwLog = require('../../utils/xgw-log.js')

const app = getApp()

function getErrorMessage(err, fallback = '操作失败，请稍后重试') {
  if (!err) return fallback
  if (typeof err === 'string') return err
  return err.message || err.errMsg || fallback
}

async function cacheMineDataAfterLogin(loginRes) {
  xgwAuth.saveMineHomeFromLoginResult(loginRes)
  try {
    const mineRes = await network.myHomeIndex({})
    if (mineRes && mineRes.code === 0 && mineRes.data) {
      xgwAuth.saveMineHome(mineRes.data)
    }
  } catch (err) {
    // Ignore cache refresh failures and fall back to login payload.
  }
}

Page({
  data: {
    navHeight: 88,
    navTop: 44,
    menuHeight: 32,
    menuRight: 12,
    step: 'welcome',
    phone: '',
    password: '',
    agreed: false,
    submitting: false,
    showAgreementDialog: false,
    logo: '/images/login-app-icon.png',
    appName: '喜顾问'
  },

  onLoad() {
    const globalData = app.globalData || {}
    const menuButtonObject = globalData.menuButtonObject || {}
    const systemInfo = wx.getSystemInfoSync()
    const fallbackNavTop = systemInfo.statusBarHeight || 20
    const navTop = globalData.navTop || menuButtonObject.top || fallbackNavTop
    const menuHeight = menuButtonObject.height || 32
    const navHeight = globalData.navHeight || (navTop + menuHeight + (navTop - fallbackNavTop))
    const windowWidth = systemInfo.windowWidth || 375
    const menuRight = menuButtonObject.right ? Math.max(windowWidth - menuButtonObject.right, 12) : 12

    this.setData({
      navHeight,
      navTop,
      menuHeight,
      menuRight
    })
  },

  onShow() {
    if (xgwAuth.isLogined()) {
      this.finishLogin()
    }
  },

  handleBack() {
    if (this.data.step === 'mobile') {
      this.setData({
        step: 'welcome'
      })
      return
    }
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({
      url: '/pages/my/index'
    })
  },

  toMobileLogin() {
    this.setData({
      step: 'mobile'
    })
  },

  onPhoneInput(e) {
    const value = e.detail.value.replace(/\D/g, '').slice(0, 11)
    this.setData({
      phone: value
    })
  },

  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },

  toggleAgreement() {
    this.setData({
      agreed: !this.data.agreed
    })
  },

  openAgreement(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    wx.navigateTo({
      url: `/pages/about/index?key=${key}`
    })
  },

  showAgreementConfirm() {
    this.setData({
      showAgreementDialog: true
    })
  },

  closeAgreementConfirm() {
    this.setData({
      showAgreementDialog: false
    })
  },

  agreeAndClose() {
    this.setData({
      agreed: true,
      showAgreementDialog: false
    })
  },

  preventTouchMove() {},

  ensureAgreementAccepted() {
    if (this.data.agreed) {
      return true
    }
    this.showAgreementConfirm()
    return false
  },

  finishLogin() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({
      url: '/pages/my/index'
    })
  },

  async onWechatLogin() {
    if (!this.ensureAgreementAccepted() || this.data.submitting) {
      return
    }
    this.setData({
      submitting: true
    })

    try {
      const loginCode = await new Promise((resolve, reject) => {
        wx.login({
          success: res => resolve(res.code || ''),
          fail: reject
        })
      })

      const profile = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善会员资料',
          lang: 'zh_CN',
          success: resolve,
          fail: reject
        })
      })

      const res = await network.loginThrid({
        nickname: profile.userInfo.nickName || '',
        head: profile.userInfo.avatarUrl || '',
        sex: String(profile.userInfo.gender || 0),
        type: 3,
        thirdSystemId: profile.signature || loginCode || '',
        registrationid: ''
      })

      if (res && res.code === 0 && xgwAuth.saveLoginResult(res)) {
        await cacheMineDataAfterLogin(res)
        xgwLog.record('微信登录成功', xgwAuth.getUserId())
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        setTimeout(() => {
          this.finishLogin()
        }, 300)
        return
      }

      if (res && res.code === 908) {
        wx.showModal({
          title: '提示',
          content: '当前微信尚未绑定账号，请使用手机号登录。',
          showCancel: false,
          success: () => {
            this.setData({
              step: 'mobile'
            })
          }
        })
        return
      }

      wx.showToast({
        title: (res && (res.message || res.msg)) || '微信登录失败',
        icon: 'none'
      })
    } catch (err) {
      wx.showToast({
        title: getErrorMessage(err, '微信登录失败'),
        icon: 'none'
      })
    } finally {
      this.setData({
        submitting: false
      })
    }
  },

  async onMobileLogin() {
    if (!this.ensureAgreementAccepted() || this.data.submitting) {
      return
    }

    if (!/^1\d{10}$/.test(this.data.phone)) {
      wx.showToast({
        title: '请输入正确手机号',
        icon: 'none'
      })
      return
    }

    if (!this.data.password) {
      wx.showToast({
        title: '请输入登录密码',
        icon: 'none'
      })
      return
    }

    this.setData({
      submitting: true
    })

    try {
      const res = await network.accountLogin({
        mobile: this.data.phone,
        password: this.data.password,
        type: 0,
        login_id: '',
        registrationid: ''
      })

      if (res && res.code === 0 && xgwAuth.saveLoginResult(res)) {
        await cacheMineDataAfterLogin(res)
        xgwLog.record('手机号登录成功', this.data.phone)
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        setTimeout(() => {
          this.finishLogin()
        }, 300)
        return
      }

      wx.showToast({
        title: (res && (res.message || res.msg)) || '登录失败',
        icon: 'none'
      })
    } catch (err) {
      wx.showToast({
        title: getErrorMessage(err, '登录失败'),
        icon: 'none'
      })
    } finally {
      this.setData({
        submitting: false
      })
    }
  }
})
