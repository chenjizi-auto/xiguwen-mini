const network = require('../../../api/network.js')

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
    userId: safeText(item && item.userid),
    head: safeText(item && item.head),
    nickname: safeText(item && item.nickname, '未命名用户'),
    mobile: safeText(item && item.mobile),
    occupation: safeText(item && item.occupationid, '未设置职业')
  }
}

Page({
  data: {
    id: '',
    teamName: '',
    keyword: '',
    loading: true,
    invitingId: '',
    errorText: '',
    list: [],
    shareImage: ''
  },

  onLoad(options) {
    this.setData({
      id: safeText(options && options.id),
      teamName: decodeURIComponent(safeText(options && options.name))
    })
    wx.setNavigationBarTitle({
      title: '邀请新成员'
    })
    wx.showShareMenu({
      menus: ['shareAppMessage']
    })
    this.fetchShareInfo()
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

  async fetchShareInfo() {
    try {
      const res = await network.invitationFriend({})
      if (!res || res.code !== 0 || !res.data) return
      this.setData({
        shareImage: safeText(res.data.erweima)
      })
    } catch (err) {}
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
      const res = await network.xgwCommunityInviteList({
        id: this.data.id,
        name: this.data.keyword.trim()
      })
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res))
      }
      this.setData({
        loading: false,
        list: (Array.isArray(res.data) ? res.data : []).map(normalizeUser)
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载失败，请稍后重试',
        list: []
      })
    }
  },

  async onInviteTap(e) {
    const userId = safeText(e.currentTarget.dataset.userid)
    if (!userId || this.data.invitingId) return
    this.setData({ invitingId: userId })
    try {
      const res = await network.xgwCommunityInviteSend({
        id: this.data.id,
        yid: userId
      })
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res, '邀请失败'))
      }
      wx.showToast({
        title: '邀请已发送',
        icon: 'success'
      })
    } catch (err) {
      wx.showToast({
        title: err && err.message ? err.message : '邀请失败',
        icon: 'none'
      })
    } finally {
      this.setData({ invitingId: '' })
    }
  },

  onShareAppMessage() {
    const teamName = this.data.teamName || '我的社团'
    const payload = {
      title: `我用喜顾问创建了“${teamName}”`,
      path: `/pages/team/detail?id=${this.data.id}`
    }
    if (this.data.shareImage) {
      payload.imageUrl = this.data.shareImage
    }
    return payload
  }
})
