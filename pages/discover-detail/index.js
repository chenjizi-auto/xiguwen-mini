const network = require('../../api/network.js')
const xgwAuth = require('../../utils/xgw-auth.js')

const app = getApp()

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function normalizePhotos(list) {
  return safeArray(list)
    .map(item => {
      if (!item) return ''
      if (typeof item === 'string') return item
      return item.photourl || item.url || ''
    })
    .filter(Boolean)
}

function normalizeCommentChildren(list) {
  return safeArray(list).map(item => ({
    pid: item && item.pid ? item.pid : 0,
    nickname: safeText(item && item.nickname),
    comm: safeText(item && item.comm)
  }))
}

function normalizeComments(list) {
  return safeArray(list).map(item => ({
    id: item && item.id ? item.id : 0,
    head: safeText(item && item.head, '/images/default.webp'),
    nickname: safeText(item && item.nickname, '用户'),
    create_ti: safeText(item && item.create_ti),
    comm: safeText(item && item.comm),
    userid: item && item.userid ? item.userid : 0,
    pid: item && item.pid ? item.pid : 0,
    xiaji: normalizeCommentChildren(item && item.xiaji)
  }))
}

function normalizeLikes(list) {
  return safeArray(list).map(item => ({
    head: safeText(item && item.head, '/images/default.webp'),
    nickname: safeText(item && item.nickname, '用户')
  }))
}

function normalizeDetail(data = {}) {
  const photoUrls = normalizePhotos(data.photourl)
  const comments = normalizeComments(data.commentlist)
  const likes = normalizeLikes(data.zanlist)
  return {
    id: data.id || 0,
    userid: data.userid || 0,
    nickname: safeText(data.nickname, '用户'),
    head: safeText(data.head, '/images/default.webp'),
    occupation: safeText(data.occupation),
    theteam: safeText(data.theteam),
    create_ti: safeText(data.create_ti),
    content: safeText(data.content),
    pv: Number(data.pv || 0),
    zan: Number(data.zan || 0),
    commentnum: Number(data.commentnum || 0),
    myzan: Number(data.myzan || 0),
    photoUrls,
    commentlist: comments,
    zanlist: likes
  }
}

Page({
  data: {
    navHeight: 88,
    navTop: 44,
    menuHeight: 32,
    id: 0,
    type: 0,
    loading: true,
    activeTab: 'comment',
    detail: null,
    photoUrls: [],
    comments: [],
    likes: [],
    inputValue: '',
    sending: false,
    liking: false,
    isLiked: false,
    likeIcon: 'good-job-o',
    likeColor: '#666',
    replyingToId: -1,
    replyingToName: '',
    commentPlaceholder: '写评论...'
  },

  onLoad(options) {
    this.setNavMetrics()
    this.setData({
      id: Number(options && options.id) || 0,
      type: Number(options && options.type) || 0
    })
    if (!this.data.id) {
      wx.showToast({
        title: '动态不存在',
        icon: 'none'
      })
      return
    }
    this.loadDetail()
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  setNavMetrics() {
    const globalData = app.globalData || {}
    const menuButtonObject = globalData.menuButtonObject || {}
    const systemInfo = wx.getSystemInfoSync()
    const fallbackNavTop = systemInfo.statusBarHeight || 20
    const navTop = globalData.navTop || menuButtonObject.top || fallbackNavTop
    const menuHeight = menuButtonObject.height || 32
    const navHeight = globalData.navHeight || (navTop + menuHeight + (navTop - fallbackNavTop))
    this.setData({
      navHeight,
      navTop,
      menuHeight
    })
  },

  async loadDetail() {
    this.setData({
      loading: true
    })
    try {
      const res = await network.xgwDynamicDetail({ id: this.data.id })
      if (!res || res.code !== 0 || !res.data) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '加载失败',
          icon: 'none'
        })
        return
      }
      const detail = normalizeDetail(res.data)
      this.setData({
        detail,
        photoUrls: detail.photoUrls,
        comments: detail.commentlist,
        likes: detail.zanlist,
        isLiked: detail.myzan === 1,
        likeIcon: detail.myzan === 1 ? 'good-job' : 'good-job-o',
        likeColor: detail.myzan === 1 ? '#e64340' : '#666'
      })
    } catch (err) {
      wx.showToast({
        title: (err && (err.message || err.errMsg)) || '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({
        loading: false
      })
    }
  },

  handleBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({
      url: '/pages/category/category'
    })
  },

  switchTab(e) {
    const tab = e && e.currentTarget ? safeText(e.currentTarget.dataset.tab, 'comment') : 'comment'
    if (tab !== 'comment' && tab !== 'like') return
    this.setData({
      activeTab: tab
    })
  },

  previewImage(e) {
    const current = e && e.currentTarget ? safeText(e.currentTarget.dataset.url) : ''
    if (!current) return
    wx.previewImage({
      current,
      urls: this.data.photoUrls || []
    })
  },

  ensureLogin() {
    if (xgwAuth.isLogined()) {
      return true
    }
    wx.navigateTo({
      url: '/pages/login/index'
    })
    return false
  },

  onLikeTap() {
    if (!this.ensureLogin() || this.data.liking || !this.data.detail) return
    this.toggleLike()
  },

  async toggleLike() {
    const detail = this.data.detail
    if (!detail) return
    this.setData({
      liking: true
    })
    try {
      const req = detail.myzan === 1 ? network.xgwDynamicDislike : network.xgwDynamicLike
      const res = await req({ id: this.data.id })
      if (!res || res.code !== 0) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '操作失败',
          icon: 'none'
        })
        return
      }
      await this.loadDetail()
    } catch (err) {
      wx.showToast({
        title: (err && (err.message || err.errMsg)) || '操作失败',
        icon: 'none'
      })
    } finally {
      this.setData({
        liking: false
      })
    }
  },

  onCommentInput(e) {
    this.setData({
      inputValue: e.detail.value || ''
    })
  },

  onReplyTap(e) {
    if (!this.ensureLogin()) return
    const id = e && e.currentTarget ? Number(e.currentTarget.dataset.id) : -1
    const nickname = e && e.currentTarget ? safeText(e.currentTarget.dataset.nickname, '') : ''
    this.setData({
      replyingToId: id > 0 ? id : -1,
      replyingToName: nickname,
      commentPlaceholder: nickname ? `回复 ${nickname}` : '写评论...'
    })
  },

  resetReplyState() {
    this.setData({
      replyingToId: -1,
      replyingToName: '',
      commentPlaceholder: '写评论...'
    })
  },

  async onSendComment() {
    if (!this.ensureLogin() || this.data.sending) return
    const comm = safeText(this.data.inputValue).trim()
    if (!comm) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      })
      return
    }
    this.setData({
      sending: true
    })
    try {
      const payload = {
        id: this.data.id,
        comm
      }
      if (this.data.replyingToId > 0) {
        payload.pid = this.data.replyingToId
      }
      const res = await network.xgwDynamicComment(payload)
      if (!res || res.code !== 0) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '评论失败',
          icon: 'none'
        })
        return
      }
      this.setData({
        inputValue: ''
      })
      this.resetReplyState()
      await this.loadDetail()
      this.setData({
        activeTab: 'comment'
      })
    } catch (err) {
      wx.showToast({
        title: (err && (err.message || err.errMsg)) || '评论失败',
        icon: 'none'
      })
    } finally {
      this.setData({
        sending: false
      })
    }
  },

  onShareAppMessage() {
    const detail = this.data.detail || {}
    return {
      title: detail.nickname ? `${detail.nickname}的动态` : '动态详情',
      path: `/pages/discover-detail/index?id=${this.data.id}&type=${this.data.type}`
    }
  }
})
