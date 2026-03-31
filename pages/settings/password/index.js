const network = require('../../../api/network.js')
const AUTH = require('../../../utils/auth.js')
const xgwAuth = require('../../../utils/xgw-auth.js')
const xgwLog = require('../../../utils/xgw-log.js')

function startCountdown(page) {
  if (page.countdownTimer) {
    clearInterval(page.countdownTimer)
  }
  page.setData({
    countdown: 60
  })
  page.countdownTimer = setInterval(() => {
    const next = page.data.countdown - 1
    if (next <= 0) {
      clearInterval(page.countdownTimer)
      page.countdownTimer = null
      page.setData({
        countdown: 0
      })
      return
    }
    page.setData({
      countdown: next
    })
  }, 1000)
}

Page({
  data: {
    kind: 'login',
    title: '修改登录密码',
    step: 1,
    mobile: '',
    mobileReadonly: false,
    code: '',
    countdown: 0,
    password: '',
    password2: ''
  },

  onLoad(options) {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({
        url: '/pages/login/index'
      })
      return
    }
    const kind = options && options.kind === 'pay' ? 'pay' : 'login'
    const title = kind === 'pay' ? '修改支付密码' : '修改登录密码'
    const mobile = xgwAuth.getMobile()
    this.setData({
      kind,
      title,
      mobile,
      mobileReadonly: !!mobile
    })
    wx.setNavigationBarTitle({
      title
    })
  },

  onUnload() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }
  },

  onMobileInput(e) {
    this.setData({
      mobile: e.detail.value.replace(/\D/g, '').slice(0, 11)
    })
  },

  onCodeInput(e) {
    this.setData({
      code: e.detail.value.replace(/\D/g, '').slice(0, 6)
    })
  },

  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },

  onPassword2Input(e) {
    this.setData({
      password2: e.detail.value
    })
  },

  async onSendCode() {
    if (this.data.countdown > 0) {
      return
    }
    if (!/^1\d{10}$/.test(this.data.mobile)) {
      wx.showToast({
        title: '请输入正确手机号',
        icon: 'none'
      })
      return
    }
    const payload = {
      mobile: this.data.mobile
    }
    if (this.data.kind === 'login') {
      payload.type = 'findpwd'
    }
    try {
      const res = await network.xgwGetVerifyCode(payload)
      if (!res || res.code !== 0) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '发送失败',
          icon: 'none'
        })
        return
      }
      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      })
      startCountdown(this)
    } catch (err) {
      wx.showToast({
        title: '发送失败',
        icon: 'none'
      })
    }
  },

  async onVerifyCode() {
    if (!/^1\d{10}$/.test(this.data.mobile) || !this.data.code) {
      wx.showToast({
        title: '请填写手机号和验证码',
        icon: 'none'
      })
      return
    }
    wx.showLoading({
      title: ''
    })
    try {
      const res = await network.xgwPasswordVerify({
        mobile: this.data.mobile,
        code: this.data.code
      })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '验证码校验失败',
          icon: 'none'
        })
        return
      }
      this.setData({
        step: 2
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '验证码校验失败',
        icon: 'none'
      })
    }
  },

  async onSubmitPassword() {
    if (!this.data.password || !this.data.password2) {
      wx.showToast({
        title: '请输入完整密码',
        icon: 'none'
      })
      return
    }
    if (this.data.password !== this.data.password2) {
      wx.showToast({
        title: '两次密码输入不一致',
        icon: 'none'
      })
      return
    }
    wx.showLoading({
      title: ''
    })
    try {
      const res = this.data.kind === 'pay'
        ? await network.xgwPayPasswordReset({
          mobile: this.data.mobile,
          code: this.data.code,
          password: this.data.password,
          repassword: this.data.password2
        })
        : await network.xgwPasswordReset({
          mobile: this.data.mobile,
          code: this.data.code,
          password: this.data.password
        })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '修改失败',
          icon: 'none'
        })
        return
      }

      xgwLog.record(this.data.kind === 'pay' ? '修改支付密码' : '修改登录密码', this.data.mobile)
      if (this.data.kind === 'login') {
        xgwAuth.clearLogin()
        AUTH.loginOut()
        wx.showModal({
          title: '修改成功',
          content: '登录密码已修改，请重新登录。',
          showCancel: false,
          success: () => {
            wx.redirectTo({
              url: '/pages/login/index'
            })
          }
        })
        return
      }

      wx.showToast({
        title: '修改成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack({
          delta: 1
        })
      }, 250)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '修改失败',
        icon: 'none'
      })
    }
  }
})
