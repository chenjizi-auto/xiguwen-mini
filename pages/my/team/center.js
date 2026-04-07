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

Page({
  data: {
    loading: true,
    loadError: '',
    teamInfo: null,
    quitting: false
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '团队中心'
    })
  },

  onShow() {
    this.fetchTeamCenter()
  },

  async fetchTeamCenter() {
    this.setData({
      loading: true,
      loadError: ''
    })
    try {
      const res = await network.xgwCommunityCenter({})
      if (!res || res.code !== 0 || !res.data) {
        throw new Error(getErrorMessage(res))
      }
      const data = res.data
      this.setData({
        loading: false,
        teamInfo: {
          id: safeText(data.id),
          userId: asNumber(data.userid, 0),
          role: asNumber(data.jiaose, 3),
          name: safeText(data.name, ''),
          type: safeText(data.type, ''),
          location: safeText(data.dizhi || data.address, ''),
          logo: safeText(data.logourl),
          memberCount: safeText(data.chengyuan, '0'),
          todayNew: safeText(data.jrxinzeng, '0'),
          todayOrder: safeText(data.jryoudan, '0'),
          scheduleCount: safeText(data.cydangqi, '0'),
          profile: safeText(data.profile, '')
        }
      })
    } catch (err) {
      this.setData({
        loading: false,
        loadError: err && err.message ? err.message : '加载失败，请稍后重试',
        teamInfo: null
      })
    }
  },

  requireAdmin(actionName) {
    if (!this.data.teamInfo) return false
    if (asNumber(this.data.teamInfo.role, 3) === 3) {
      wx.showToast({
        title: `您不是管理员，无法${actionName}`,
        icon: 'none'
      })
      return false
    }
    return true
  },

  onMenuTap(e) {
    const action = e.currentTarget.dataset.action
    if (!action) return
    if (action === 'home') {
      if (!this.data.teamInfo || !this.data.teamInfo.id) return
      wx.navigateTo({
        url: `/pages/team/detail?id=${this.data.teamInfo.id}&from=center`
      })
      return
    }
    if (action === 'invite') {
      if (!this.requireAdmin('邀请成员')) return
      if (!this.data.teamInfo || !this.data.teamInfo.id) return
      wx.navigateTo({
        url: `/pages/my/team/invite?id=${this.data.teamInfo.id}&name=${encodeURIComponent(this.data.teamInfo.name || '')}`
      })
      return
    }
    if (action === 'pending') {
      if (!this.requireAdmin('审核成员')) return
      if (!this.data.teamInfo || !this.data.teamInfo.id) return
      wx.navigateTo({
        url: `/pages/my/team/pending?id=${this.data.teamInfo.id}`
      })
      return
    }
    if (action === 'manager') {
      if (!this.requireAdmin('管理成员')) return
      if (!this.data.teamInfo || !this.data.teamInfo.id) return
      wx.navigateTo({
        url: `/pages/my/team/manage?id=${this.data.teamInfo.id}&role=${this.data.teamInfo.role}`
      })
      return
    }
  },

  onStatTap(e) {
    const action = safeText(e.currentTarget.dataset.action)
    const teamInfo = this.data.teamInfo
    if (!action || !teamInfo || !teamInfo.id) return
    if (action === 'schedule') {
      wx.navigateTo({
        url: `/pages/my/team/schedule?id=${teamInfo.id}`
      })
      return
    }
    if (action === 'todayNew' || action === 'todayOrder') {
      wx.navigateTo({
        url: `/pages/my/team/day-list?id=${teamInfo.id}&mode=${action}`
      })
    }
  },

  async onQuitTap() {
    const teamInfo = this.data.teamInfo
    if (!teamInfo || !teamInfo.id || this.data.quitting) return

    const isFounder = asNumber(teamInfo.role, 3) === 1
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: isFounder ? '你是创始人，确定要退出团队吗？' : '确定要退出团队吗？',
        content: isFounder ? '创始人退出后整个团队都会解散。' : '',
        confirmText: '确认退出',
        cancelText: '我点错了',
        success: res => resolve(!!res.confirm),
        fail: () => resolve(false)
      })
    })
    if (!confirmed) return

    this.setData({ quitting: true })
    wx.showLoading({
      title: '退出中...',
      mask: true
    })
    try {
      const res = await network.xgwCommunityOut({ id: teamInfo.id })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: getErrorMessage(res, '退出失败'),
          icon: 'none'
        })
        return
      }
      wx.showToast({
        title: '退出成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '退出失败',
        icon: 'none'
      })
    } finally {
      this.setData({ quitting: false })
    }
  }
})
