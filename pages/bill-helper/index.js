const network = require('../../api/network.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function getErrorMessage(res, fallback = '加载失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

function formatMonthText(date) {
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`
}

function getMonthStartTimestamp(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

function formatAmount(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return safeText(value, '0')
  return num % 1 === 0 ? String(num) : num.toFixed(2)
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function formatDateValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function resolveDateValue(rawOccurrence, rawGroupDate, pickerMonth) {
  const text = safeText(rawOccurrence).trim()
  if (/^\d{10,13}$/.test(text)) {
    const timestamp = text.length === 13 ? Number(text) : Number(text) * 1000
    return formatDateValue(new Date(timestamp))
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(text)) return text.replace(/\//g, '-')
  if (/^\d{2}-\d{2}$/.test(text) && pickerMonth) return `${pickerMonth}-${text.slice(3, 5)}`

  const groupDate = safeText(rawGroupDate).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(groupDate)) return groupDate
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(groupDate)) return groupDate.replace(/\//g, '-')
  if (/^\d{2}-\d{2}$/.test(groupDate) && pickerMonth) return `${pickerMonth}-${groupDate.slice(3, 5)}`

  return pickerMonth ? `${pickerMonth}-01` : ''
}

function normalizeGroups(data, pickerMonth) {
  const groups = Array.isArray(data && data.list) ? data.list : []
  return groups.map(group => ({
    date: safeText(group && group.riqi, '--'),
    total: formatAmount(group && group.ritongji),
    items: (Array.isArray(group && group.tian) ? group.tian : []).map(item => {
      const type = asNumber(item && item.type, 1)
      return {
        id: asNumber(item && item.id, 0),
        type,
        typeText: type === 2 ? '收入' : '支出',
        amount: formatAmount(item && item.aftermoney),
        remarks: safeText(item && item.remarks, '无备注'),
        occurrence: safeText(item && item.occurrence, '--'),
        dateValue: resolveDateValue(item && item.occurrence, group && group.riqi, pickerMonth)
      }
    })
  }))
}

Page({
  data: {
    currentMonthText: '',
    pickerMonth: '',
    currentTimestamp: 0,
    loading: true,
    loadError: '',
    summaryIncome: '0',
    summaryExpense: '0',
    groups: []
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '记账助手'
    })
    const now = new Date()
    this.setMonth(now)
  },

  onShow() {
    if (this.data.currentTimestamp) {
      this.fetchList()
    }
  },

  onPullDownRefresh() {
    this.fetchList().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  setMonth(date) {
    this.setData({
      currentMonthText: formatMonthText(date),
      pickerMonth: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      currentTimestamp: getMonthStartTimestamp(date)
    })
    this.fetchList()
  },

  onMonthChange(e) {
    const value = safeText(e.detail.value)
    if (!value) return
    const parts = value.split('-')
    if (parts.length !== 2) return
    const year = Number(parts[0])
    const month = Number(parts[1]) - 1
    if (!Number.isFinite(year) || !Number.isFinite(month)) return
    this.setMonth(new Date(year, month, 1))
  },

  async fetchList() {
    this.setData({
      loading: true,
      loadError: ''
    })
    try {
      const res = await network.xgwBillList({
        p: 1,
        rows: 200,
        shijian: this.data.currentTimestamp
      })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error(getErrorMessage(res))
      }
      this.setData({
        loading: false,
        summaryIncome: formatAmount(res.data.dshuru),
        summaryExpense: formatAmount(res.data.dzhichu),
        groups: normalizeGroups(res.data, this.data.pickerMonth)
      })
    } catch (err) {
      this.setData({
        loading: false,
        loadError: err && err.message ? err.message : '加载失败，请稍后重试',
        groups: []
      })
    }
  },

  onAddTap() {
    wx.navigateTo({
      url: `/pages/bill-helper/form?month=${encodeURIComponent(this.data.pickerMonth)}`
    })
  },

  onEditTap(e) {
    const bill = e.currentTarget.dataset.bill
    if (!bill || !bill.id) return
    const encoded = encodeURIComponent(JSON.stringify(bill))
    wx.navigateTo({
      url: `/pages/bill-helper/form?month=${encodeURIComponent(this.data.pickerMonth)}&data=${encoded}`
    })
  },

  async onDeleteTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '是否删除该记录？',
        success: res => resolve(!!res.confirm),
        fail: () => resolve(false)
      })
    })
    if (!confirmed) return
    wx.showLoading({
      title: '删除中...',
      mask: true
    })
    try {
      const res = await network.xgwBillDelete({ id })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res, '删除失败'))
      }
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      this.fetchList()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '删除失败',
        icon: 'none'
      })
    }
  }
})
