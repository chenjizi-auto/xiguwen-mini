const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function formatDate(seconds) {
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0) return '--'
  const date = new Date(value * 1000)
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
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
    type: 'shop',
    title: '商家VIP',
    loading: true,
    paying: false,
    vipInfo: null,
    selectedIndex: 0,
    plans: [],
    benefits: []
  },

  onLoad(options) {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    const type = safeText(options && options.type, 'shop') === 'user' ? 'user' : 'shop'
    this.setData({
      type,
      title: type === 'shop' ? '商家VIP' : '用户VIP',
      benefits: type === 'shop'
        ? ['商家会员标识', '更高展示优先级', '婚嫁场景曝光增强', '店铺经营身份更清晰']
        : ['会员身份标识', '专属用户权益', '优先体验平台活动', '筹婚服务体验升级']
    })
    wx.setNavigationBarTitle({
      title: type === 'shop' ? '商家VIP' : '用户VIP'
    })
    this.fetchInfo()
  },

  async fetchInfo() {
    this.setData({ loading: true })
    try {
      if (this.data.type === 'shop') {
        const res = await network.xgwShopVipInfo({})
        if (!res || res.code !== 0 || !res.data) {
          throw new Error((res && (res.message || res.msg)) || '加载失败')
        }
        const data = res.data || {}
        this.setData({
          vipInfo: {
            opened: asNumber(data.isshopvip, 0) === 1,
            startDate: formatDate(data.shopivipstat),
            endDate: formatDate(data.shopivipendt)
          },
          plans: [
            { label: '12个月', months: '12', price: safeText(data.vipsmoney12, '0.00') },
            { label: '24个月', months: '24', price: safeText(data.vipsmoney24, '0.00') },
            { label: '36个月', months: '36', price: safeText(data.vipsmoney36, '0.00') }
          ],
          selectedIndex: 0,
          loading: false
        })
      } else {
        const res = await network.xgwUserVipInfo({})
        if (!res || res.code !== 0 || !res.data) {
          throw new Error((res && (res.message || res.msg)) || '加载失败')
        }
        const data = res.data || {}
        this.setData({
          vipInfo: {
            opened: asNumber(data.isuserivip, 0) === 1
          },
          plans: [
            { label: '年度用户VIP', months: '12', price: safeText(data.vipmoney, '0.00') }
          ],
          selectedIndex: 0,
          loading: false
        })
      }
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err && err.message ? err.message : 'VIP信息加载失败', icon: 'none' })
    }
  },

  onPlanTap(e) {
    const index = asNumber(e.currentTarget.dataset.index, 0)
    this.setData({ selectedIndex: index })
  },

  async onOpenVip() {
    if (this.data.paying || (this.data.vipInfo && this.data.vipInfo.opened)) return
    const plan = (this.data.plans || [])[this.data.selectedIndex]
    if (!plan) return
    this.setData({ paying: true })
    wx.showLoading({ title: '拉起支付中...', mask: true })
    try {
      const res = this.data.type === 'shop'
        ? await network.xgwShopVipPay({
            money: plan.price,
            shopivipstat: plan.months,
            type: 'wxpay'
          })
        : await network.xgwUserVipPay({
            money: plan.price,
            type: 'wxpay'
          })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.message || res.msg)) || '创建订单失败')
      }
      wx.hideLoading()
      await wx.requestPayment(toPayRequest(res.data))
      wx.showToast({ title: '支付成功', icon: 'success' })
      this.fetchInfo()
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
