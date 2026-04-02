const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

function formatMoney(value, fallback = '0.00') {
  const num = Number(value)
  if (Number.isFinite(num)) {
    return num.toFixed(2)
  }
  const text = value == null ? '' : String(value).trim()
  return text || fallback
}

function padNumber(value) {
  return value < 10 ? `0${value}` : String(value)
}

function formatDateTime(value) {
  if (value == null || value === '') {
    return ''
  }
  const text = String(value).trim()
  if (/^\d+$/.test(text)) {
    let timestamp = Number(text)
    if (timestamp < 1000000000000) {
      timestamp *= 1000
    }
    const date = new Date(timestamp)
    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())} ${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`
    }
  }
  return text
}

function normalizeDetailItem(item = {}) {
  const tradeType = Number(item.trade_type) || 0
  const changeValue = tradeType === 1 ? formatMoney(item.inmoney) : formatMoney(item.outmoney)
  return {
    id: Number(item.id) || 0,
    subject: item.subject ? String(item.subject) : '余额变动',
    createdAtText: formatDateTime(item.created_at),
    aftermoneyText: formatMoney(item.aftermoney),
    amountText: `${tradeType === 1 ? '+' : '-'}${changeValue}`,
    tradeType
  }
}

Page({
  data: {
    list: [],
    page: 1,
    rows: 15,
    loaded: false,
    loading: false,
    noMore: false
  },

  onLoad() {
    this.ensureLogin()
    if (xgwAuth.isLogined()) {
      this.refreshList()
    }
  },

  onPullDownRefresh() {
    if (!xgwAuth.isLogined()) {
      wx.stopPullDownRefresh()
      return
    }
    this.refreshList()
  },

  onReachBottom() {
    this.loadMore()
  },

  ensureLogin() {
    if (xgwAuth.isLogined()) {
      return true
    }
    wx.showModal({
      title: '请先登录',
      content: '当前未登录，是否前往登录？',
      confirmText: '去登录',
      confirmColor: '#e64340',
      success: res => {
        if (!res.confirm) return
        wx.navigateTo({
          url: '/pages/login/index'
        })
      }
    })
    return false
  },

  refreshList() {
    this.fetchList(true)
  },

  loadMore() {
    if (this.data.loading || this.data.noMore) {
      return
    }
    this.fetchList(false)
  },

  async fetchList(isRefresh) {
    if (this.data.loading) {
      return
    }

    const nextPage = isRefresh ? 1 : this.data.page + 1
    this.setData({ loading: true })

    try {
      const res = await network.xgwBankSchedule({
        p: String(nextPage),
        rows: String(this.data.rows)
      })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '加载失败')
      }

      const incoming = Array.isArray(res.data) ? res.data.map(normalizeDetailItem) : []
      this.setData({
        list: isRefresh ? incoming : this.data.list.concat(incoming),
        page: nextPage,
        noMore: incoming.length < this.data.rows,
        loaded: true
      })
    } catch (e) {
      if (isRefresh) {
        this.setData({
          list: [],
          loaded: true,
          noMore: false
        })
      }
      wx.showToast({
        title: e && e.message ? e.message : '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  }
})
