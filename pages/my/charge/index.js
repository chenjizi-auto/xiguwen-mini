const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function toPayRequest(payData = {}) {
  return {
    timeStamp: safeText(payData.timestamp),
    nonceStr: safeText(payData.noncestr),
    package: safeText(payData.packageX) || 'Sign=WXPay',
    signType: 'MD5',
    paySign: safeText(payData.sign)
  }
}

Page({
  data: {
    amount: '',
    remark: '',
    paying: false,
    selectedPreset: '',
    presetAmounts: ['100', '200', '500', '1000']
  },

  onLoad() {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({ url: '/pages/login/index' })
    }
  },

  onAmountInput(e) {
    const raw = safeText(e.detail.value)
    let value = raw.replace(/[^\d.]/g, '')
    const firstDot = value.indexOf('.')
    if (firstDot >= 0) {
      value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, '').slice(0, 2)
    }
    const amount = value.slice(0, 10)
    this.setData({
      amount,
      selectedPreset: this.data.presetAmounts.includes(amount) ? amount : ''
    })
  },

  onRemarkInput(e) {
    this.setData({
      remark: safeText(e.detail.value).slice(0, 50)
    })
  },

  onPresetTap(e) {
    const amount = safeText(e.currentTarget.dataset.amount)
    if (!amount) return
    this.setData({
      amount,
      selectedPreset: amount
    })
  },

  async onSubmit() {
    if (this.data.paying) return
    const amount = Number(this.data.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      wx.showToast({ title: '请输入正确金额', icon: 'none' })
      return
    }
    if (!safeText(this.data.remark).trim()) {
      wx.showToast({ title: '请输入备注', icon: 'none' })
      return
    }
    this.setData({ paying: true })
    wx.showLoading({ title: '拉起支付中...', mask: true })
    try {
      const res = await network.xgwChargePay({
        money: this.data.amount,
        beizhu: this.data.remark.trim(),
        paytype: 'wxpay'
      })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.message || res.msg)) || '充值下单失败')
      }
      wx.hideLoading()
      await wx.requestPayment(toPayRequest(res.data))
      wx.showToast({ title: '支付成功', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 400)
    } catch (err) {
      wx.hideLoading()
      if (err && err.errMsg && err.errMsg.includes('requestPayment:fail cancel')) {
        wx.showToast({ title: '已取消支付', icon: 'none' })
      } else {
        wx.showToast({ title: err && err.message ? err.message : '支付失败', icon: 'none' })
      }
    } finally {
      this.setData({ paying: false })
    }
  }
})
