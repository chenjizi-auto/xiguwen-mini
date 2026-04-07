const network = require('../../../api/network.js')

const TABS = [
  { label: '全部', status: 0 },
  { label: '进行中', status: 1 },
  { label: '已结束', status: 2 }
]

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function getErrorMessage(res, fallback = '加载失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

function isSuccessResponse(res) {
  return asNumber(res && res.code, -1) === 0
}

function formatPrice(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return safeText(value, '0')
  }
  return num % 1 === 0 ? String(num) : num.toFixed(2)
}

function formatCreateTime(value) {
  const text = safeText(value)
  if (!text) return '--'
  return text.length >= 16 ? text.slice(0, 16) : text
}

function formatCountDown(seconds) {
  const totalSeconds = Math.max(0, asNumber(seconds, 0))
  if (!totalSeconds) return '00:00'
  const totalMinutes = Math.floor((totalSeconds + 59) / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function mapNeedItem(item = {}) {
  const status = asNumber(item.status, 0)
  return {
    id: asNumber(item.id, 0),
    status,
    title: `${asNumber(item.type, 0) === 2 ? '[商城] ' : '[婚庆] '}${safeText(item.title, '未命名需求')}`,
    priceText: `¥ ${formatPrice(item.price)}`,
    createTime: formatCreateTime(item.create_ti),
    browseText: `浏览：${asNumber(item.browsingvolume, 0)}`,
    joinText: `参与：${asNumber(item.renshu, 0)}`,
    countDownText: formatCountDown(item.countdown),
    isActive: status === 1,
    isEnded: status === 2,
    raw: item
  }
}

Page({
  data: {
    tabs: TABS,
    tabIndex: 0,
    currentLabel: '全部',
    list: [],
    page: 1,
    rows: 10,
    loading: false,
    finished: false,
    errorText: ''
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '我的需求'
    })
    this.fetchList(true)
  },

  onShow() {
    if (!wx.getStorageSync('xgwNeedListShouldRefresh')) {
      return
    }
    wx.removeStorageSync('xgwNeedListShouldRefresh')
    this.fetchList(true)
  },

  onPullDownRefresh() {
    this.fetchList(true).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.loading || this.data.finished) return
    this.fetchList(false)
  },

  onTabChange(e) {
    const index = asNumber(e && e.detail ? e.detail.index : 0, 0)
    this.setData({
      tabIndex: index,
      currentLabel: (this.data.tabs[index] || {}).label || '全部',
      page: 1,
      list: [],
      finished: false,
      errorText: ''
    })
    this.fetchList(true)
  },

  getCurrentStatus() {
    const current = (this.data.tabs || [])[this.data.tabIndex] || {}
    return asNumber(current.status, 0)
  },

  async fetchList(reset = false) {
    if (this.data.loading) return
    const nextPage = reset ? 1 : this.data.page
    this.setData({
      loading: true,
      errorText: reset ? '' : this.data.errorText
    })

    try {
      const res = await network.xgwMyNeedList({
        status: this.getCurrentStatus(),
        p: nextPage,
        rows: this.data.rows
      })
      if (!isSuccessResponse(res)) {
        throw new Error(getErrorMessage(res))
      }

      const source = Array.isArray(res.data) ? res.data : []
      const list = source.map(mapNeedItem)
      this.setData({
        list: reset ? list : (this.data.list || []).concat(list),
        page: nextPage + 1,
        finished: list.length < this.data.rows,
        loading: false,
        errorText: ''
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载失败，请稍后重试'
      })
      if (reset) {
        this.setData({ list: [] })
      }
    }
  },

  onItemTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    wx.navigateTo({
      url: `/pages/my/needs/detail?id=${id}`
    })
  },

  onEditTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    const index = asNumber(e.currentTarget.dataset.index, -1)
    if (!id || index < 0) return
    const current = ((this.data.list || [])[index] || {}).raw || null
    if (current) {
      wx.setStorageSync('xgwNeedEditDraft', current)
    }
    wx.navigateTo({
      url: `/pages/my/needs/form?id=${id}`
    })
  },

  async onCloseTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    const confirm = await this.confirmAction('是否关闭此条需求？', '确定关闭')
    if (!confirm) return
    this.submitAction(id, 'close')
  },

  async onDeleteTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    const confirm = await this.confirmAction('是否删除此条需求？', '确定删除')
    if (!confirm) return
    this.submitAction(id, 'delete')
  },

  confirmAction(content, confirmText) {
    return new Promise(resolve => {
      wx.showModal({
        title: '提示',
        content,
        confirmText,
        cancelText: '取消',
        success: res => resolve(!!res.confirm),
        fail: () => resolve(false)
      })
    })
  },

  async submitAction(id, action) {
    wx.showLoading({
      title: action === 'close' ? '关闭中...' : '删除中...',
      mask: true
    })
    try {
      const request = action === 'close' ? network.xgwCloseMyNeed : network.xgwDeleteMyNeed
      const res = await request({ id })
      wx.hideLoading()
      if (!isSuccessResponse(res)) {
        wx.showToast({
          title: getErrorMessage(res, action === 'close' ? '关闭失败' : '删除失败'),
          icon: 'none'
        })
        return
      }

      wx.showToast({
        title: action === 'close' ? '关闭成功' : '删除成功',
        icon: 'success'
      })

      if (action === 'delete') {
        this.setData({
          list: (this.data.list || []).filter(item => item.id !== id)
        })
        return
      }

      this.fetchList(true)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : (action === 'close' ? '关闭失败' : '删除失败'),
        icon: 'none'
      })
    }
  }
})
