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

function statusText(status) {
  const value = asNumber(status, 0)
  if (value === 1) return '退出社团'
  if (value === 21) return '已加入'
  if (value === 22) return '等待同意'
  return '申请加入'
}

function isDisabled(status) {
  return [21, 22].includes(asNumber(status, 0))
}

Page({
  data: {
    keyword: '',
    page: 1,
    rows: 10,
    loading: false,
    finished: false,
    errorText: '',
    list: [],
    actionLoadingId: ''
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '加入社团'
    })
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

  onKeywordInput(e) {
    this.setData({
      keyword: safeText(e.detail.value).trim()
    })
  },

  onSearchTap() {
    this.fetchList(true)
  },

  async fetchList(reset = false) {
    if (this.data.loading) return
    const nextPage = reset ? 1 : this.data.page
    this.setData({
      loading: true,
      errorText: reset ? '' : this.data.errorText
    })

    try {
      const res = await network.xgwCommunityJoinList({
        name: this.data.keyword,
        p: nextPage,
        rows: this.data.rows
      })
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res))
      }
      const source = Array.isArray(res.data) ? res.data : []
      const list = source.map(item => ({
        id: safeText(item.id),
        name: safeText(item.name, '未命名社团'),
        type: safeText(item.type, ''),
        logo: safeText(item.logourl),
        cover: safeText(item.appphotourl),
        profile: safeText(item.profiled || item.profile, ''),
        region: safeText(item.addressd, ''),
        address: safeText(item.address, ''),
        memberCount: safeText(item.renshu, '0'),
        mobile: safeText(item.mobile),
        status: asNumber(item.status, 0),
        statusText: statusText(item.status),
        disabled: isDisabled(item.status)
      }))
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

  async onActionTap(e) {
    const id = safeText(e.currentTarget.dataset.id)
    const status = asNumber(e.currentTarget.dataset.status, 0)
    if (!id || this.data.actionLoadingId) return

    const isOut = status === 1
    if (isDisabled(status) && !isOut) return

    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: isOut ? '退出社团' : '申请加入',
        content: isOut ? '是否退出当前社团？' : '是否申请加入该社团？',
        confirmText: isOut ? '退出' : '申请',
        cancelText: '取消',
        success: res => resolve(!!res.confirm),
        fail: () => resolve(false)
      })
    })
    if (!confirmed) return

    this.setData({ actionLoadingId: id })
    wx.showLoading({
      title: isOut ? '退出中...' : '申请中...',
      mask: true
    })
    try {
      const request = isOut ? network.xgwCommunityOut : network.xgwCommunityJoinApply
      const res = await request({ id })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: getErrorMessage(res, isOut ? '退出失败' : '申请失败'),
          icon: 'none'
        })
        return
      }
      wx.showToast({
        title: isOut ? '退出成功' : '申请成功',
        icon: 'success'
      })
      this.fetchList(true)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : (isOut ? '退出失败' : '申请失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ actionLoadingId: '' })
    }
  }
})
