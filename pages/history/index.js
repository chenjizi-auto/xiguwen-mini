const api = require('../../api/api.js')
const network = require('../../api/network.js')

const PAGE_SIZE = 20
const TIME_SLOTS = [
  { value: '1', label: '上午' },
  { value: '2', label: '中午' },
  { value: '3', label: '下午' },
  { value: '4', label: '晚上' }
]

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function absoluteUrl(url = '') {
  const text = safeText(url).trim()
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text
  if (text.startsWith('/')) return `${api.ApiRoot}${text}`
  return text
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatPrice(value) {
  const text = safeText(value).trim()
  if (!text || text === '0' || text === '0.00') return '面议'
  return `￥${text}`
}

function getSelectedCity() {
  const selected = wx.getStorageSync('selectedCity')
  return {
    id: asNumber(selected && selected.id, 273),
    name: safeText(selected && selected.name, '成都')
  }
}

function extractArray(data) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.data)) return data.data
  if (data && Array.isArray(data.list)) return data.list
  if (data && Array.isArray(data.shangjia)) return data.shangjia
  return []
}

function normalizeCategories(list = []) {
  return extractArray(list)
    .map(item => ({
      id: safeText(item && item.occupationid),
      name: safeText(item && item.proname, '未命名职业')
    }))
    .filter(item => item.name)
}

function normalizeHistoryList(list = []) {
  return extractArray(list)
    .map(item => {
      const userid = safeText(item && item.userid)
      const price = formatPrice(item && item.zuidijia)
      return {
        id: userid,
        head: absoluteUrl(item && item.head) || '/images/default.webp',
        nickname: safeText(item && item.nickname, '婚礼商家'),
        occupation: safeText(item && item.occupationid, '婚礼商家'),
        price: price === '面议' ? price : `${price}起`,
        goodRate: safeText(item && item.haopinl, '0'),
        commentCount: safeText(item && item.evaluate, '0'),
        fans: safeText(item && item.fans, '0'),
        isVip: asNumber(item && item.isshopvip, 0) === 1,
        sincerity: asNumber(item && item.sincerity, 0) === 1,
        platform: asNumber(item && item.platform, 0) === 1,
        realname: asNumber(item && item.shiming, 0) === 1,
        team: asNumber(item && (item.team || item.team2), 0) === 1,
        collegeName: safeText(item && item.xueyuanname)
      }
    })
    .filter(item => item.id)
}

function getErrorMessage(res, fallback = '加载失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

Page({
  data: {
    cityId: 273,
    cityName: '成都',
    defaultPickerDate: '',
    selectedDate: '',
    selectedTimeslot: '',
    timeSlots: TIME_SLOTS,
    categories: [],
    activeCategoryId: '',
    activeCategoryName: '',
    tabIntoView: '',
    loading: false,
    loaded: false,
    loadError: '',
    list: [],
    page: 1,
    hasMore: true,
    footerLoading: false,
    footerNoMore: false
  },

  onLoad() {
    this.touchGesture = {
      startX: 0,
      startY: 0
    }
    const city = getSelectedCity()
    const today = formatDate(new Date())
    this.setData({
      cityId: city.id,
      cityName: city.name,
      defaultPickerDate: today
    })
    this.fetchCategories()
  },

  onShow() {
    const city = getSelectedCity()
    if (city.id === this.data.cityId && city.name === this.data.cityName) return
    this.setData({
      cityId: city.id,
      cityName: city.name
    })
    if (this.data.activeCategoryId || this.data.activeCategoryId === '0') {
      this.fetchList(true)
    }
  },

  onPullDownRefresh() {
    this.fetchList(true).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.loading || !this.data.hasMore) return
    this.fetchList(false)
  },

  async fetchCategories() {
    try {
      const res = await network.xgwHistoryCategoryList({})
      let categories = normalizeCategories(res && res.data)

      if (!categories.length) {
        const fallbackRes = await network.homeCategory({})
        categories = normalizeCategories(fallbackRes && fallbackRes.data)
      }

      if (!categories.length) {
        throw new Error('职业分类加载失败')
      }

      const currentId = safeText(this.data.activeCategoryId)
      const matched = categories.find(item => item.id === currentId)
      const active = matched || categories[0]

      this.setData({
        categories,
        activeCategoryId: active ? active.id : '',
        activeCategoryName: active ? active.name : '',
        tabIntoView: active ? `history-tab-${active.id}` : ''
      })

      if (active && (active.id || active.id === '0')) {
        await this.fetchList(true)
      }
    } catch (err) {
      this.setData({
        loading: false,
        loaded: true,
        loadError: err && err.message ? err.message : '职业分类加载失败'
      })
    }
  },

  buildParams(page) {
    const params = {
      p: page,
      rows: PAGE_SIZE,
      cityid: this.data.cityId || 273,
      occupationid: this.data.activeCategoryId
    }
    if (this.data.selectedDate) {
      params.date = this.data.selectedDate
    }
    if (this.data.selectedDate && this.data.selectedTimeslot) {
      params.timeslot = this.data.selectedTimeslot
    }
    return params
  },

  async fetchList(reset) {
    if (!this.data.activeCategoryId && this.data.activeCategoryId !== '0') {
      return Promise.resolve()
    }

    const nextPage = reset ? 1 : this.data.page + 1
    const nextState = {
      loading: true,
      loaded: reset ? false : this.data.loaded,
      loadError: reset ? '' : this.data.loadError,
      footerLoading: !reset && this.data.list.length > 0,
      footerNoMore: false
    }
    if (reset) {
      nextState.list = []
      nextState.page = 1
      nextState.hasMore = true
    }
    this.setData(nextState)

    try {
      const res = await network.xgwHistoryList(this.buildParams(nextPage))
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res))
      }

      const incoming = normalizeHistoryList(res.data)
      const list = reset ? incoming : this.data.list.concat(incoming)
      const hasMore = incoming.length >= PAGE_SIZE

      this.setData({
        list,
        page: nextPage,
        hasMore,
        loading: false,
        loaded: true,
        footerLoading: false,
        footerNoMore: !hasMore && list.length > 0,
        loadError: ''
      })
    } catch (err) {
      const message = err && err.message ? err.message : '加载失败，请稍后重试'
      const errorState = {
        loading: false,
        loaded: true,
        footerLoading: false,
        footerNoMore: false,
        loadError: reset ? message : this.data.loadError
      }
      if (reset) {
        errorState.list = []
        errorState.page = 1
        errorState.hasMore = true
      }
      this.setData(errorState)
      if (!reset) {
        wx.showToast({
          title: message,
          icon: 'none'
        })
      }
    }
  },

  onDateChange(e) {
    const value = safeText(e && e.detail ? e.detail.value : '')
    if (!value) return
    this.setData(
      {
        selectedDate: value,
        selectedTimeslot: ''
      },
      () => {
        this.fetchList(true)
      }
    )
  },

  onClearDate() {
    this.setData(
      {
        selectedDate: '',
        selectedTimeslot: ''
      },
      () => {
        this.fetchList(true)
      }
    )
  },

  onTimeslotTap(e) {
    const value = safeText(e && e.currentTarget ? e.currentTarget.dataset.value : '')
    if (!this.data.selectedDate) {
      wx.showToast({
        title: '请先选择日期',
        icon: 'none'
      })
      return
    }
    if (!value || value === this.data.selectedTimeslot) return
    this.setData(
      {
        selectedTimeslot: value
      },
      () => {
        this.fetchList(true)
      }
    )
  },

  onCategoryTap(e) {
    const id = safeText(e && e.currentTarget ? e.currentTarget.dataset.id : '')
    const name = safeText(e && e.currentTarget ? e.currentTarget.dataset.name : '')
    if (!name || id === this.data.activeCategoryId) return
    this.switchCategory(id, name)
  },

  switchCategory(id, name) {
    this.setData(
      {
        activeCategoryId: id,
        activeCategoryName: name,
        tabIntoView: `history-tab-${id}`
      },
      () => {
        this.fetchList(true)
      }
    )
  },

  onTouchStart(e) {
    const touch = e && e.changedTouches && e.changedTouches[0]
    if (!touch) return
    this.touchGesture = {
      startX: Number(touch.clientX) || 0,
      startY: Number(touch.clientY) || 0
    }
  },

  onTouchEnd(e) {
    const touch = e && e.changedTouches && e.changedTouches[0]
    if (!touch) return
    const startX = this.touchGesture ? this.touchGesture.startX : 0
    const startY = this.touchGesture ? this.touchGesture.startY : 0
    const deltaX = (Number(touch.clientX) || 0) - startX
    const deltaY = (Number(touch.clientY) || 0) - startY

    if (Math.abs(deltaX) < 60) return
    if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return

    const categories = Array.isArray(this.data.categories) ? this.data.categories : []
    const currentIndex = categories.findIndex(item => item.id === this.data.activeCategoryId)
    if (currentIndex < 0) return

    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1
    if (nextIndex < 0 || nextIndex >= categories.length) return

    const nextItem = categories[nextIndex]
    if (!nextItem || !nextItem.name) return
    this.switchCategory(nextItem.id, nextItem.name)
  },

  onMerchantTap(e) {
    const userid = safeText(e && e.currentTarget ? e.currentTarget.dataset.userid : '')
    if (!userid) return
    wx.navigateTo({
      url: `/packageWedding/pages/merchant/detail?userid=${encodeURIComponent(userid)}`
    })
  }
})
