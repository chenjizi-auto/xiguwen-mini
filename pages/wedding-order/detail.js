const network = require('../../api/network.js')

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function formatPrice(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return safeStr(v, '0.00')
  return n.toFixed(2)
}

function formatStatus(intentType, status) {
  const s = asNumber(status, -1)
  if (intentType === 2) {
    if (s === 10) return '待付款'
    if (s === 60) return '待接单'
    if (s === 70) return '待服务'
    if (s === 71) return '已服务未付尾款'
    if (s === 79) return '已服务'
    if (s === 80) return '待评价'
    if (s === 90) return '已完成'
    if (s === 20) return '已关闭'
    if (s === 100) return '退款单'
    return '订单状态'
  }
  if (s === 10) return '待付款'
  if (s === 60) return '待接单'
  if (s === 70) return '待服务'
  if (s === 79) return '已服务'
  if (s === 80) return '待评价'
  if (s === 90) return '已完成'
  if (s === 20) return '已关闭'
  return '订单状态'
}

function formatRefundStatus(tuihuo) {
  const t = asNumber(tuihuo, 0)
  if (t === 2) return '退款中'
  if (t === 3) return '同意退款'
  if (t === 4) return '拒绝退款'
  return ''
}

function buildAmountRows(detail = {}) {
  return [
    { label: '商品总价', value: `¥ ${formatPrice(detail.shangpingjongjia)}` },
    { label: '折扣抵扣', value: `¥ ${formatPrice(detail.dikouzongge)}` },
    { label: '订单总额', value: `¥ ${formatPrice(detail.dindanzongge)}` },
    { label: '应付总额', value: `¥ ${formatPrice(detail.yingfuzonge || detail.yingfuzongge)}` },
    { label: '本次应付', value: `¥ ${formatPrice(detail.yingfujine || detail.payjine)}` },
    { label: '已付总额', value: `¥ ${formatPrice(detail.yifuzonge)}` }
  ].filter(item => item.value !== '¥ ')
}

function buildInfoRows(detail = {}) {
  return [
    { label: '订单编号', value: safeStr(detail.pid) },
    { label: '下单时间', value: safeStr(detail.published) },
    { label: '初次付款时间', value: safeStr(detail.pay_time) },
    { label: '尾款付款时间', value: safeStr(detail.wkpay_time) },
    { label: '完成时间', value: safeStr(detail.sureok_time) }
  ].filter(item => item.value)
}

function buildActionButtons(intentType, detail = {}) {
  const status = asNumber(detail.status, -1)
  const tuihuo = asNumber(detail.tuihuo, 0)
  const paytype = asNumber(detail.paytype, 0)
  const buttons = []

  if (intentType === 0) {
    if (status === 10) {
      buttons.push({ key: 'cancel_order', text: '取消订单', style: 'ghost' })
    }
    if (status === 70 && tuihuo === 1) {
      buttons.push({ key: 'apply_refund', text: '申请退款', style: 'primary' })
    }
    if (status === 70 && tuihuo === 2) {
      buttons.push({ key: 'cancel_refund', text: '撤销退款', style: 'ghost' })
    }
    if (status === 70 && (tuihuo === 2 || tuihuo === 3 || tuihuo === 4)) {
      buttons.push({ key: 'refund_detail', text: '退款详情', style: 'ghost' })
    }
    if (status === 79) {
      buttons.push({ key: 'confirm_finish', text: '确认完成', style: 'primary' })
    }
    if (status === 80) {
      buttons.push({ key: 'evaluate', text: '立即评价', style: 'primary' })
    }
  }

  if (intentType === 2) {
    if (status === 10) {
      buttons.push({ key: 'modify_price', text: '修改价格', style: 'ghost' })
    }
    if (status === 60) {
      buttons.push({ key: 'refuse_order', text: '拒绝接单', style: 'ghost' })
      buttons.push({ key: 'accept_order', text: '立即接单', style: 'primary' })
    }
    if (status === 70 && tuihuo === 1) {
      buttons.push({
        key: paytype === 2 ? 'finish_service_choose_pay' : 'finish_service',
        text: '订单完成',
        style: 'primary'
      })
    }
    if (tuihuo === 2) {
      buttons.push({ key: 'refuse_refund', text: '拒绝退款', style: 'ghost' })
      buttons.push({ key: 'agree_refund', text: '同意退款', style: 'primary' })
    }
  }

  buttons.push({ key: 'copy_order', text: '复制订单号', style: 'ghost' })
  buttons.push({ key: 'call', text: '拨打电话', style: 'primary' })
  return buttons
}

Page({
  data: {
    id: 0,
    intentType: 0,
    title: '婚庆订单详情',
    loading: true,
    errorText: '',
    detail: null,
    amountRows: [],
    infoRows: [],
    statusText: '',
    refundText: '',
    contactTitle: '联系商家',
    contactName: '',
    phone: '',
    actionButtons: [],
    showReasonPopup: false,
    reasonPopupTitle: '',
    reasonAction: '',
    reasonText: '',
    refundAmount: '',
    reasonNeedAmount: false
  },

  onLoad(options) {
    const id = asNumber(options && options.id, 0)
    const intentType = asNumber(options && options.intentType, 0)
    const title = intentType === 2 ? '婚庆接单详情' : '婚庆订单详情'
    this.setData({
      id,
      intentType,
      title,
      contactTitle: intentType === 2 ? '联系买家' : '联系商家'
    })
    this._hasLoadedOnce = false
    wx.setNavigationBarTitle({ title })
    this.loadDetail()
  },

  onShow() {
    if (!this._hasLoadedOnce) {
      this._hasLoadedOnce = true
      return
    }
    this.loadDetail()
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadDetail() {
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const res = await network.weddingOrderDetail({ id: this.data.id })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && res.msg) || 'request failed')
      }
      const detail = res.data
      this.setData({
        loading: false,
        detail,
        amountRows: buildAmountRows(detail),
        infoRows: buildInfoRows(detail),
        statusText: formatStatus(this.data.intentType, detail.status),
        refundText: formatRefundStatus(detail.tuihuo),
        contactName: safeStr(this.data.intentType === 2 ? detail.buyer_name : detail.snickname),
        phone: safeStr(detail.mobile),
        refundAmount: safeStr(detail.yingfujine || detail.payjine || detail.order_amount),
        actionButtons: buildActionButtons(this.data.intentType, detail)
      })
      this._hasLoadedOnce = true
    } catch (err) {
      this.setData({
        loading: false,
        detail: null,
        amountRows: [],
        infoRows: [],
        errorText: '详情加载失败，请稍后重试',
        actionButtons: []
      })
    }
  },

  onCopyOrderNo() {
    const value = safeStr(this.data.detail && this.data.detail.pid)
    if (!value) return
    wx.setClipboardData({
      data: value
    })
  },

  onCallTap() {
    const phone = safeStr(this.data.phone)
    if (!phone) {
      wx.showToast({
        title: '暂无联系电话',
        icon: 'none'
      })
      return
    }
    wx.makePhoneCall({
      phoneNumber: phone
    })
  },

  onActionTap(e) {
    const key = safeStr(e && e.currentTarget ? e.currentTarget.dataset.key : '')
    if (!key) return
    if (key === 'copy_order') {
      this.onCopyOrderNo()
      return
    }
    if (key === 'call') {
      this.onCallTap()
      return
    }
    if (key === 'modify_price') {
      wx.navigateTo({
        url: `/pages/wedding-order/edit-price?id=${this.data.id}`
      })
      return
    }
    if (key === 'evaluate') {
      wx.navigateTo({
        url: `/pages/wedding-order/evaluate?id=${this.data.id}`
      })
      return
    }
    if (key === 'refund_detail') {
      wx.navigateTo({
        url: `/pages/wedding-order/refund-detail?id=${this.data.id}&intentType=${this.data.intentType}`
      })
      return
    }
    if (key === 'cancel_order') {
      this.confirmAndRun('确认取消该订单吗？', () =>
        this.runAction(() => network.weddingCancelOrder({ id: this.data.id }))
      )
      return
    }
    if (key === 'confirm_finish') {
      this.confirmAndRun('确认完成该订单吗？', () =>
        this.runAction(() => network.weddingFinishOrder({ id: this.data.id }))
      )
      return
    }
    if (key === 'accept_order') {
      this.confirmAndRun('确认接单吗？', () =>
        this.runAction(() => network.weddingAcceptOrder({ id: this.data.id }))
      )
      return
    }
    if (key === 'refuse_order') {
      this.confirmAndRun('确认拒绝接单吗？', () =>
        this.runAction(() => network.weddingRefuseOrder({ id: this.data.id }))
      )
      return
    }
    if (key === 'finish_service') {
      this.confirmAndRun('确认已完成该订单服务？', () =>
        this.runAction(() => network.weddingFinishOrderShop({ id: this.data.id }))
      )
      return
    }
    if (key === 'finish_service_choose_pay') {
      wx.showActionSheet({
        itemList: ['线上支付', '线下支付'],
        success: res => {
          const paymethod = asNumber(res.tapIndex, 0) + 1
          this.runAction(() => network.weddingFinishOrderShop({ id: this.data.id, paymethod }))
        }
      })
      return
    }
    if (key === 'agree_refund') {
      this.confirmAndRun('确认同意该订单的退款请求？', () =>
        this.runAction(() => network.weddingAgreeRefund({ id: this.data.id }))
      )
      return
    }
    if (key === 'refuse_refund') {
      this.setData({
        showReasonPopup: true,
        reasonPopupTitle: '拒绝退款',
        reasonAction: 'refuse_refund',
        reasonText: '',
        reasonNeedAmount: false
      })
      return
    }
    if (key === 'apply_refund') {
      this.setData({
        showReasonPopup: true,
        reasonPopupTitle: '申请退款',
        reasonAction: 'apply_refund',
        reasonText: '',
        reasonNeedAmount: true
      })
      return
    }
    if (key === 'cancel_refund') {
      this.confirmAndRun('确认撤销当前退款申请吗？', () =>
        this.runAction(() => network.weddingCancelRefund({ id: this.data.id }))
      )
    }
  },

  confirmAndRun(content, cb) {
    wx.showModal({
      title: '温馨提示',
      content,
      confirmColor: '#e64340',
      success: res => {
        if (!res.confirm) return
        cb()
      }
    })
  },

  async runAction(request) {
    wx.showLoading({ title: '处理中', mask: true })
    try {
      const res = await request()
      if (!res || res.code !== 0) {
        throw new Error((res && res.msg) || '操作失败')
      }
      wx.showToast({
        title: res.msg || '操作成功',
        icon: 'none'
      })
      this.loadDetail()
    } catch (err) {
      wx.showToast({
        title: err && err.message ? err.message : '操作失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  onReasonInput(e) {
    this.setData({
      reasonText: safeStr(e && e.detail ? e.detail.value : '')
    })
  },

  onRefundAmountInput(e) {
    this.setData({
      refundAmount: safeStr(e && e.detail ? e.detail.value : '')
    })
  },

  onCloseReasonPopup() {
    this.setData({
      showReasonPopup: false
    })
  },

  async onSubmitReasonPopup() {
    const action = this.data.reasonAction
    const reason = safeStr(this.data.reasonText).trim()
    const price = safeStr(this.data.refundAmount).trim()

    if (!reason) {
      wx.showToast({
        title: '请输入原因',
        icon: 'none'
      })
      return
    }

    if (action === 'apply_refund') {
      if (!price) {
        wx.showToast({
          title: '请输入退款金额',
          icon: 'none'
        })
        return
      }
      this.setData({ showReasonPopup: false })
      await this.runAction(() =>
        network.weddingApplyRefund({
          orderid: this.data.id,
          reason,
          price
        })
      )
      return
    }

    if (action === 'refuse_refund') {
      this.setData({ showReasonPopup: false })
      await this.runAction(() =>
        network.weddingRefuseRefund({
          id: this.data.id,
          text: reason
        })
      )
    }
  }
})
