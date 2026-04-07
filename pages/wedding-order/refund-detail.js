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

function mapRefundStatus(intentType, status) {
  const s = asNumber(status, 0)
  if (s === 1) return '等待处理'
  if (s === 2) return '退款成功'
  if (s === 3) return '退款失败'
  if (s === 4) return '已撤销'
  if (intentType === 2 && s === 5) return '等待处理'
  return '退款详情'
}

function mapRefundDesc(intentType, refund = {}) {
  const s = asNumber(refund.status, 0)
  if (s === 1) return intentType === 2 ? '等待商家处理退款申请' : '等待商家处理退款申请'
  if (s === 2) return '退款金额已原路退回'
  if (s === 3) return '商家已拒绝本次退款'
  if (s === 4) return '本次退款申请已撤销'
  return '查看退款处理进度'
}

function buildActionButtons(intentType, status) {
  const s = asNumber(status, 0)
  if (intentType === 0 && s === 1) {
    return [{ key: 'cancel_refund', text: '撤销退款', style: 'ghost' }]
  }
  if (intentType === 2 && s === 1) {
    return [
      { key: 'refuse_refund', text: '拒绝退款', style: 'ghost' },
      { key: 'agree_refund', text: '同意退款', style: 'primary' }
    ]
  }
  return []
}

Page({
  data: {
    id: 0,
    intentType: 0,
    loading: true,
    errorText: '',
    refund: null,
    order: null,
    statusText: '',
    statusDesc: '',
    contactTitle: '联系商家',
    contactName: '',
    phone: '',
    infoRows: [],
    actionButtons: [],
    showReasonPopup: false,
    reasonText: ''
  },

  onLoad(options) {
    const id = asNumber(options && options.id, 0)
    const intentType = asNumber(options && options.intentType, 0)
    this.setData({
      id,
      intentType,
      contactTitle: intentType === 2 ? '联系买家' : '联系商家'
    })
    this._hasLoadedOnce = false
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
    this.loadDetail().finally(() => wx.stopPullDownRefresh())
  },

  async loadDetail() {
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const request = this.data.intentType === 2 ? network.weddingJiedanRefundDetail : network.weddingRefundDetail
      const res = await request({ id: this.data.id })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && res.msg) || 'request failed')
      }
      const refund = res.data.tuikuan || {}
      const order = res.data.orderinfo || {}
      const statusText = mapRefundStatus(this.data.intentType, refund.status)
      this.setData({
        loading: false,
        refund,
        order,
        statusText,
        statusDesc: mapRefundDesc(this.data.intentType, refund),
        contactName: safeStr(this.data.intentType === 2 ? order.buyer_name : order.snickname),
        phone: safeStr(this.data.intentType === 2 ? order.mobile : (order.shopmobile || order.mobile)),
        infoRows: [
          { label: '退款编号', value: safeStr(refund.fund_id) },
          { label: '退款原因', value: safeStr(refund.tui_yuanyin) },
          { label: '退款金额', value: `¥ ${formatPrice(refund.tui_amount)}` },
          { label: '退款申请时间', value: safeStr(refund.created_at) },
          { label: '处理时间', value: safeStr(refund.gcldated_at || refund.cldated_at) },
          { label: '商家说明', value: safeStr(refund.shangjajj_yuanyin) }
        ].filter(item => item.value),
        actionButtons: buildActionButtons(this.data.intentType, refund.status)
      })
      this._hasLoadedOnce = true
    } catch (err) {
      this.setData({
        loading: false,
        errorText: '退款详情加载失败，请稍后重试',
        refund: null,
        order: null,
        infoRows: [],
        actionButtons: []
      })
    }
  },

  onCallTap() {
    const phone = safeStr(this.data.phone)
    if (!phone) {
      wx.showToast({ title: '暂无联系电话', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },

  onActionTap(e) {
    const key = safeStr(e && e.currentTarget ? e.currentTarget.dataset.key : '')
    if (!key) return
    if (key === 'call') {
      this.onCallTap()
      return
    }
    if (key === 'cancel_refund') {
      this.confirmAndRun('确认撤销退款吗？', () =>
        this.runAction(() => network.weddingCancelRefund({ id: this.data.refund.fund_id }))
      )
      return
    }
    if (key === 'agree_refund') {
      this.confirmAndRun('确认同意该订单的退款请求？', () =>
        this.runAction(() => network.weddingAgreeRefund({ id: this.data.refund.fund_id }))
      )
      return
    }
    if (key === 'refuse_refund') {
      this.setData({
        showReasonPopup: true,
        reasonText: ''
      })
    }
  },

  confirmAndRun(content, cb) {
    wx.showModal({
      title: '温馨提示',
      content,
      confirmColor: '#e64340',
      success: res => {
        if (res.confirm) cb()
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

  onCloseReasonPopup() {
    this.setData({
      showReasonPopup: false
    })
  },

  async onSubmitReasonPopup() {
    const reason = safeStr(this.data.reasonText).trim()
    if (!reason) {
      wx.showToast({ title: '请输入原因', icon: 'none' })
      return
    }
    this.setData({ showReasonPopup: false })
    await this.runAction(() =>
      network.weddingRefuseRefund({
        id: this.data.refund.fund_id,
        text: reason
      })
    )
  }
})
