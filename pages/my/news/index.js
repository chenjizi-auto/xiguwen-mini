const network = require('../../../api/network.js')

const TABS = [
  { label: '公告', type: 1 },
  { label: '新闻资讯', type: 2 }
]

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function formatTime(timestamp) {
  const value = asNumber(timestamp, 0)
  if (!value) return '--'
  const date = new Date(value * 1000)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function normalizeItem(item = {}, index = 0) {
  return {
    id: asNumber(item.columnid, 0) || index + 1,
    title: safeStr(item.title, '未命名资讯'),
    desc: safeStr(item.descr, ''),
    image: safeStr(item.img, '/images/default.webp'),
    timeText: formatTime(item.createtime),
    url: safeStr(item.content),
    source: safeStr(item.src),
    raw: item
  }
}

Page({
  data: {
    tabs: TABS,
    tabIndex: 0,
    list: [],
    page: 1,
    rows: 15,
    loading: false,
    finished: false,
    errorText: ''
  },

  onLoad() {
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
      page: 1,
      finished: false,
      errorText: ''
    })
    this.fetchList(true)
  },

  async fetchList(reset = false) {
    if (this.data.loading) return
    const nextPage = reset ? 1 : this.data.page
    const currentTab = (this.data.tabs || [])[this.data.tabIndex] || TABS[0]

    this.setData({
      loading: true,
      errorText: reset ? '' : this.data.errorText
    })

    try {
      const res = await network.weddingNewsList({
        type: currentTab.type,
        p: nextPage,
        rows: this.data.rows
      })
      if (!res || res.code !== 0) {
        throw new Error((res && res.msg) || 'request failed')
      }
      const source = Array.isArray(res.data) ? res.data : []
      const list = source.map((item, index) => normalizeItem(item, index))
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
        errorText: '婚礼新闻加载失败，请稍后重试'
      })
      if (reset) {
        this.setData({ list: [] })
      }
    }
  },

  onCardTap(e) {
    const index = asNumber(e && e.currentTarget ? e.currentTarget.dataset.index : -1, -1)
    const item = (this.data.list || [])[index]
    if (!item || !item.url) return
    wx.navigateTo({
      url:
        `/pages/my/news/detail/index?url=${encodeURIComponent(item.url)}` +
        `&title=${encodeURIComponent(item.title)}` +
        `&image=${encodeURIComponent(item.image || '')}`
    })
  }
})
