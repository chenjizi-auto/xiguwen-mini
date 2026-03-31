const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

const DEFAULT_COVER = '/images/load_img.png'
const PAGE_SIZE = 15
const STATUS_TABS = [
  { key: 1, title: '审核中' },
  { key: 2, title: '审核通过' },
  { key: 3, title: '审核未通过' }
]

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function getErrorMessage(err, fallback = '加载失败，请稍后重试') {
  if (!err) return fallback
  if (typeof err === 'string') return err
  return err.message || err.errMsg || fallback
}

function formatTime(timestamp) {
  const time = asNumber(timestamp, 0)
  if (!time) return ''
  const date = new Date(time * 1000)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getStatusMeta(item = {}) {
  const status = asNumber(item.status, 0)
  const putaway = asNumber(item.putaway, 0)

  if (status === 1) {
    return { text: '审核中', tone: 'pending' }
  }
  if (status === 2) {
    return {
      text: putaway === 1 ? '审核通过 · 已上架' : '审核通过 · 未上架',
      tone: putaway === 1 ? 'success' : 'warning'
    }
  }
  if (status === 3) {
    return { text: '审核未通过', tone: 'danger' }
  }
  return { text: '待提交', tone: 'draft' }
}

function normalizeItem(item = {}) {
  const statusMeta = getStatusMeta(item)
  return {
    id: asNumber(item.id, 0),
    name: safeText(item.name, '未命名图册'),
    synopsis: safeText(item.synopsis, ''),
    cover: safeText(item.cover, DEFAULT_COVER) || DEFAULT_COVER,
    coverFallback: DEFAULT_COVER,
    weight: safeText(item.weight, ''),
    createDate: formatTime(item.create_ti),
    status: asNumber(item.status, 0),
    putaway: asNumber(item.putaway, 0),
    statusText: statusMeta.text,
    statusTone: statusMeta.tone
  }
}

Page({
  data: {
    tabs: STATUS_TABS,
    activeStatus: 1,
    list: [],
    page: 1,
    rows: PAGE_SIZE,
    loading: false,
    loadingMore: false,
    finished: false,
    loadError: '',
    defaultCover: DEFAULT_COVER
  },

  onLoad(options) {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    const activeStatus = asNumber(options && options.status, 1)
    this.setData({
      activeStatus: STATUS_TABS.some(item => item.key === activeStatus) ? activeStatus : 1
    })
    this.loadList(true)
  },

  onShow() {
    if (this._shouldRefreshOnShow) {
      this._shouldRefreshOnShow = false
      this.loadList(true)
    }
  },

  onHide() {
    if (this._hasLoaded) {
      this._shouldRefreshOnShow = true
    }
  },

  onPullDownRefresh() {
    this.loadList(true)
  },

  onReachBottom() {
    this.loadList(false)
  },

  onTabTap(e) {
    const nextStatus = asNumber(e.currentTarget.dataset.status, 1)
    if (nextStatus === this.data.activeStatus) return
    this.setData({
      activeStatus: nextStatus,
      loadError: ''
    })
    this.loadList(true)
  },

  goAdd() {
    wx.navigateTo({
      url: '/pages/my/mine-atlas-edit/index'
    })
  },

  goDetail(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    wx.navigateTo({
      url: `/pages/my/mine-atlas-detail/index?id=${id}`
    })
  },

  handleImageError(e) {
    const index = asNumber(e.currentTarget.dataset.index, -1)
    if (index < 0) return
    const list = this.data.list.slice()
    if (!list[index]) return
    list[index].cover = DEFAULT_COVER
    this.setData({ list })
  },

  async loadList(isRefresh) {
    if (isRefresh && this.data.loading) return
    if (!isRefresh && (this.data.loading || this.data.loadingMore || this.data.finished)) return

    this._listRequestId = (this._listRequestId || 0) + 1
    const requestId = this._listRequestId

    this.setData({
      loading: isRefresh,
      loadingMore: !isRefresh,
      loadError: isRefresh ? '' : this.data.loadError
    })

    try {
      const page = isRefresh ? 1 : this.data.page
      const res = await network.xgwAtlasList({
        p: page,
        rows: this.data.rows,
        status: this.data.activeStatus
      })

      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '加载失败')
      }

      if (requestId !== this._listRequestId) return

      const rows = Array.isArray(res.data) ? res.data.map(normalizeItem) : []
      const list = isRefresh ? rows : this.data.list.concat(rows)
      this._hasLoaded = true

      this.setData({
        list,
        page: page + 1,
        finished: rows.length < this.data.rows
      })
    } catch (err) {
      if (requestId !== this._listRequestId) return
      const message = getErrorMessage(err)
      this.setData({
        loadError: message
      })
      if (!this.data.list.length) {
        wx.showToast({
          title: message,
          icon: 'none'
        })
      }
    } finally {
      if (requestId !== this._listRequestId) return
      this.setData({
        loading: false,
        loadingMore: false
      })
      wx.stopPullDownRefresh()
    }
  }
})
