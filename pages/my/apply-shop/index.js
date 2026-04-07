const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

Page({
  data: {
    selectedType: 2,
    submitting: false,
    options: [
      { id: 2, title: '婚庆商家', desc: '接婚礼服务、档期、报价与案例管理' },
      { id: 1, title: '商城商家', desc: '发布商城商品并进行店铺经营' }
    ]
  },

  onLoad() {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({ url: '/pages/login/index' })
    }
  },

  onOptionTap(e) {
    const id = Number(e.currentTarget.dataset.id || 2)
    this.setData({ selectedType: id })
  },

  async onSubmit() {
    if (this.data.submitting) return
    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...', mask: true })
    try {
      const res = await network.xgwApplyShop({
        type: this.data.selectedType
      })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '申请失败')
      }
      wx.showModal({
        title: '申请已提交',
        content: (res && (res.message || res.msg)) || '申请成功，请重新登录查看身份变化。',
        showCancel: false,
        success: () => {
          xgwAuth.clearLogin()
          wx.reLaunch({
            url: '/pages/login/index'
          })
        }
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err && err.message ? err.message : '申请失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
