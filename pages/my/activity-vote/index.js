const network = require('../../../api/network.js')

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

Page({
  data: {
    url: '',
    loading: true,
    errorText: ''
  },

  onLoad(options) {
    const sharedUrl = safeStr(options && options.url)
    if (sharedUrl) {
      this.setData({
        url: decodeURIComponent(sharedUrl),
        loading: false,
        errorText: ''
      })
      wx.showShareMenu({
        menus: ['shareAppMessage', 'shareTimeline']
      })
      return
    }
    this.loadVoteUrl()
  },

  onPullDownRefresh() {
    this.loadVoteUrl().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadVoteUrl() {
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const res = await network.activityVoteUrl({})
      const url = safeStr(res && res.data)
      if (!res || res.code !== 0 || !url) {
        throw new Error((res && res.msg) || 'request failed')
      }
      this.setData({
        url,
        loading: false,
        errorText: ''
      })
      wx.showShareMenu({
        menus: ['shareAppMessage', 'shareTimeline']
      })
    } catch (err) {
      this.setData({
        url: '',
        loading: false,
        errorText: '活动投票地址加载失败，请稍后重试'
      })
    }
  },

  onShareAppMessage() {
    return {
      title: '活动投票',
      path: `/pages/my/activity-vote/index?url=${encodeURIComponent(this.data.url || '')}`
    }
  },

  onShareTimeline() {
    return {
      title: '活动投票',
      query: `url=${encodeURIComponent(this.data.url || '')}`
    }
  }
})
