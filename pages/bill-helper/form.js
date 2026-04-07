const network = require('../../api/network.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function getErrorMessage(res, fallback = '保存失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

function toTimestamp(dateText) {
  return Math.floor(new Date(`${dateText}T00:00:00`).getTime() / 1000)
}

Page({
  data: {
    id: 0,
    amount: '',
    remark: '',
    type: 1,
    date: '',
    saving: false
  },

  onLoad(options) {
    const raw = safeText(options && options.data)
    const month = safeText(options && options.month)
    let parsed = null
    if (raw) {
      try {
        parsed = JSON.parse(decodeURIComponent(raw))
      } catch (err) {
        parsed = null
      }
    }

    const id = asNumber(parsed && parsed.id, 0)
    wx.setNavigationBarTitle({
      title: id ? '编辑记账' : '新增记账'
    })

    const today = new Date()
    const fallback = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const initialDate = month ? `${month}-01` : fallback
    if (parsed) {
      this.setData({
        id,
        amount: safeText(parsed.amount),
        remark: safeText(parsed.remarks),
        type: asNumber(parsed.type, 1) === 2 ? 2 : 1,
        date: safeText(parsed.dateValue, initialDate) || initialDate
      })
      return
    }
    this.setData({ date: initialDate })
  },

  onAmountInput(e) {
    this.setData({
      amount: safeText(e.detail.value).replace(/[^\d.]/g, '').slice(0, 12)
    })
  },

  onRemarkInput(e) {
    this.setData({
      remark: safeText(e.detail.value).slice(0, 24)
    })
  },

  onTypeTap(e) {
    const type = Number(e.currentTarget.dataset.type)
    if (type !== 1 && type !== 2) return
    this.setData({ type })
  },

  onDateChange(e) {
    this.setData({
      date: safeText(e.detail.value)
    })
  },

  async onSaveTap() {
    const amount = this.data.amount.trim()
    const remark = this.data.remark.trim()
    const date = this.data.date.trim()
    if (!amount || Number(amount) <= 0) {
      wx.showToast({ title: '请输入正确金额', icon: 'none' })
      return
    }
    if (remark.length > 12) {
      wx.showToast({ title: '备注不能超过12个字', icon: 'none' })
      return
    }
    if (!date) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    if (this.data.saving) return

    this.setData({ saving: true })
    wx.showLoading({
      title: '保存中...',
      mask: true
    })
    try {
      const payload = {
        aftermoney: amount,
        occurrence: toTimestamp(date),
        remarks: remark,
        type: this.data.type
      }
      const res = this.data.id
        ? await network.xgwBillEdit(Object.assign({ id: this.data.id }, payload))
        : await network.xgwBillAdd(payload)
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res))
      }
      wx.showToast({
        title: this.data.id ? '修改成功' : '添加成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '保存失败',
        icon: 'none'
      })
    } finally {
      this.setData({ saving: false })
    }
  }
})
