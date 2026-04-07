const network = require('../../api/network.js')

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function normalizeMoney(value = '') {
  const raw = String(value).replace(/[^\d.]/g, '')
  if (!raw) return ''
  const parts = raw.split('.')
  const integer = parts[0] ? String(Number(parts[0])) : '0'
  if (parts.length === 1) return integer
  const decimal = (parts[1] || '').slice(0, 2)
  return decimal ? `${integer}.${decimal}` : integer
}

function isValidMoney(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0
}

Page({
  data: {
    id: 0,
    loading: true,
    errorText: '',
    detail: null,
    paytype: 1,
    orderPrice: '',
    depositPrice: '',
    tailPrice: ''
  },

  onLoad(options) {
    const id = asNumber(options && options.id, 0)
    this.setData({ id })
    this.loadDetail()
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
        paytype: asNumber(detail.paytype, 1),
        orderPrice: safeStr(detail.price || detail.dindanzongge || detail.order_amount),
        depositPrice: safeStr(detail.yuandingjin || detail.order_amount),
        tailPrice: safeStr(detail.order_lastamount)
      })
    } catch (err) {
      this.setData({
        loading: false,
        detail: null,
        errorText: '价格信息加载失败，请稍后重试'
      })
    }
  },

  onOrderPriceInput(e) {
    this.setData({
      orderPrice: normalizeMoney(e && e.detail ? e.detail.value : '')
    })
  },

  onDepositPriceInput(e) {
    this.setData({
      depositPrice: normalizeMoney(e && e.detail ? e.detail.value : '')
    })
  },

  onTailPriceInput(e) {
    this.setData({
      tailPrice: normalizeMoney(e && e.detail ? e.detail.value : '')
    })
  },

  onSubmit() {
    if (this.data.paytype === 2) {
      if (!this.data.depositPrice || !this.data.tailPrice) {
        wx.showToast({ title: '请输入定金和尾款', icon: 'none' })
        return
      }
      if (!isValidMoney(this.data.depositPrice) || !isValidMoney(this.data.tailPrice)) {
        wx.showToast({ title: '请输入正确金额', icon: 'none' })
        return
      }
      wx.showModal({
        title: '温馨提示',
        content: `确认定金修改为：￥${this.data.depositPrice}\n确认尾款修改为：￥${this.data.tailPrice}`,
        confirmColor: '#e64340',
        success: res => {
          if (res.confirm) {
            this.submitPrice(this.data.depositPrice, this.data.tailPrice)
          }
        }
      })
      return
    }

    if (!this.data.orderPrice) {
      wx.showToast({ title: '请输入要修改的价格', icon: 'none' })
      return
    }
    if (!isValidMoney(this.data.orderPrice)) {
      wx.showToast({ title: '请输入正确金额', icon: 'none' })
      return
    }
    wx.showModal({
      title: '温馨提示',
      content: `确认订单金额修改为：￥${this.data.orderPrice}`,
      confirmColor: '#e64340',
      success: res => {
        if (res.confirm) {
          this.submitPrice(this.data.orderPrice, '')
        }
      }
    })
  },

  async submitPrice(price, weikuanprice) {
    wx.showLoading({ title: '提交中', mask: true })
    try {
      const payload = {
        id: this.data.id,
        price
      }
      if (weikuanprice) {
        payload.weikuanprice = weikuanprice
      }
      const res = await network.weddingModifyPrice(payload)
      if (!res || res.code !== 0) {
        throw new Error((res && res.msg) || '提交失败')
      }
      wx.showToast({
        title: res.msg || '修改成功',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 600)
    } catch (err) {
      wx.showToast({
        title: err && err.message ? err.message : '提交失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  }
})
