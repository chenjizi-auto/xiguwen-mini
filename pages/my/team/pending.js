const network = require('../../../api/network.js')

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

function normalizeUser(item) {
  return {
    id: safeText(item && item.id),
    userId: asNumber(item && item.userid, 0),
    head: safeText(item && item.head),
    nickname: safeText(item && item.nickname, '未命名用户'),
    occupation: safeText(item && item.occupationid, '未设置职业'),
    address: safeText(item && item.dizhi, '未设置地区'),
    role: asNumber(item && item.jiaose, 3)
  }
}

Page({
  data: {
    id: '',
    loading: true,
    submittingId: '',
    keyword: '',
    list: [],
    errorText: ''
  },

  onLoad(options) {
    this.setData({
      id: safeText(options && options.id)
    })
    wx.setNavigationBarTitle({
      title: '待通过成员'
    })
    this.fetchList()
  },

  onPullDownRefresh() {
    this.fetchList().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onSearchChange(e) {
    this.setData({
      keyword: safeText(e.detail)
    })
  },

  onSearch() {
    this.fetchList()
  },

  async fetchList() {
    if (!this.data.id) {
      this.setData({
        loading: false,
        errorText: '团队参数有误'
      })
      return
    }
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const res = await network.xgwCommunityPendingList({
        id: this.data.id,
        name: this.data.keyword.trim()
      })
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res))
      }
      const list = Array.isArray(res.data) ? res.data : []
      this.setData({
        loading: false,
        list: list.map(normalizeUser)
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载失败，请稍后重试',
        list: []
      })
    }
  },

  async onActionTap(e) {
    const id = safeText(e.currentTarget.dataset.id)
    const action = safeText(e.currentTarget.dataset.action)
    if (!id || !action || this.data.submittingId) return

    this.setData({ submittingId: id })
    try {
      const request = action === 'agree' ? network.xgwCommunityPendingAgree : network.xgwCommunityPendingRefuse
      const successText = action === 'agree' ? '已同意加入' : '已拒绝加入'
      const res = await request({ id })
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res, '操作失败'))
      }
      wx.showToast({
        title: successText,
        icon: 'success'
      })
      this.setData({
        list: this.data.list.filter(item => item.id !== id)
      })
    } catch (err) {
      wx.showToast({
        title: err && err.message ? err.message : '操作失败',
        icon: 'none'
      })
    } finally {
      this.setData({ submittingId: '' })
    }
  }
})
