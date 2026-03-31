const network = require('../../../api/network.js')
const AUTH = require('../../../utils/auth.js')
const xgwAuth = require('../../../utils/xgw-auth.js')
const xgwLog = require('../../../utils/xgw-log.js')

function startCountdown(page, key) {
  if (page[`${key}Timer`]) {
    clearInterval(page[`${key}Timer`])
  }
  page.setData({
    [key]: 60
  })
  page[`${key}Timer`] = setInterval(() => {
    const next = page.data[key] - 1
    if (next <= 0) {
      clearInterval(page[`${key}Timer`])
      page[`${key}Timer`] = null
      page.setData({
        [key]: 0
      })
      return
    }
    page.setData({
      [key]: next
    })
  }, 1000)
}

Page({
  data: {
    step: 1,
    oldPhone: '',
    oldPhoneReadonly: false,
    oldCode: '',
    newPhone: '',
    newCode: '',
    oldCountdown: 0,
    newCountdown: 0
  },

  onLoad() {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({
        url: '/pages/login/index'
      })
      return
    }
    const mobile = xgwAuth.getMobile()
    this.setData({
      oldPhone: mobile,
      oldPhoneReadonly: !!mobile
    })
  },

  onUnload() {
    if (this.oldCountdownTimer) {
      clearInterval(this.oldCountdownTimer)
    }
    if (this.newCountdownTimer) {
      clearInterval(this.newCountdownTimer)
    }
  },

  onOldPhoneInput(e) {
    this.setData({
      oldPhone: e.detail.value.replace(/\D/g, '').slice(0, 11)
    })
  },

  onOldCodeInput(e) {
    this.setData({
      oldCode: e.detail.value.replace(/\D/g, '').slice(0, 6)
    })
  },

  onNewPhoneInput(e) {
    this.setData({
      newPhone: e.detail.value.replace(/\D/g, '').slice(0, 11)
    })
  },

  onNewCodeInput(e) {
    this.setData({
      newCode: e.detail.value.replace(/\D/g, '').slice(0, 6)
    })
  },

  async sendCode(type) {
    const isOld = type === 'old'
    const phone = isOld ? this.data.oldPhone : this.data.newPhone
    const countdownKey = isOld ? 'oldCountdown' : 'newCountdown'
    if (this.data[countdownKey] > 0) {
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({
        title: '请输入正确手机号',
        icon: 'none'
      })
      return
    }
    try {
      const res = await network.xgwGetVerifyCode({
        mobile: phone
      })
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
      startCountdown(this, countdownKey)
    } catch (err) {
      wx.showToast({
        title: '发送失败',
        icon: 'none'
      })
    }
  },

  onSendOldCode() {
    this.sendCode('old')
  },

  onSendNewCode() {
    this.sendCode('new')
  },

  async onVerifyOld() {
    if (!/^1\d{10}$/.test(this.data.oldPhone) || !this.data.oldCode) {
      wx.showToast({
        title: '请填写原手机号和验证码',
        icon: 'none'
      })
      return
    }
    wx.showLoading({
      title: ''
    })
    try {
      const res = await network.xgwPhoneVerify({
        mobile: this.data.oldPhone,
        code: this.data.oldCode
      })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '校验失败',
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
        title: '校验失败',
        icon: 'none'
      })
    }
  },

  async onSubmitNewPhone() {
    if (!/^1\d{10}$/.test(this.data.newPhone) || !this.data.newCode) {
      wx.showToast({
        title: '请填写新手机号和验证码',
        icon: 'none'
      })
      return
    }
    wx.showLoading({
      title: ''
    })
    try {
      const res = await network.xgwPhoneUpdate({
        mobile: this.data.oldPhone,
        code: this.data.oldCode,
        xmobile: this.data.newPhone,
        xcode: this.data.newCode
      })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '改绑失败',
          icon: 'none'
        })
        return
      }
      xgwLog.record('改绑手机号', `${this.data.oldPhone} -> ${this.data.newPhone}`)
      xgwAuth.clearLogin()
      AUTH.loginOut()
      wx.showModal({
        title: '改绑成功',
        content: '手机号已更新，请重新登录。',
        showCancel: false,
        success: () => {
          wx.redirectTo({
            url: '/pages/login/index'
          })
        }
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '改绑失败',
        icon: 'none'
      })
    }
  }
})
