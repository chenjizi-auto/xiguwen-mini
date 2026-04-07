const network = require('../../api/network.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function getErrorMessage(res, fallback = '加载失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

function formatDateText(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function weekdayText(dateText) {
  const date = new Date(`${dateText}T00:00:00`)
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return Number.isNaN(date.getTime()) ? '' : labels[date.getDay()]
}

function normalizeItem(item) {
  const status = asNumber(item && item.isend, 2)
  return {
    id: asNumber(item && item.id, 0),
    content: safeText(item && item.conn, '未填写日程内容'),
    date: safeText(item && item.riqi),
    startTime: safeText(item && item.statime, '--:--'),
    endTime: safeText(item && item.endtime, '--:--'),
    status,
    statusText: status === 1 ? '已完成' : '未完成'
  }
}

Page({
  data: {
    currentDate: '',
    weekText: '',
    loading: true,
    loadError: '',
    unfinishedList: [],
    finishedList: []
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '日程安排' })
    const today = formatDateText(new Date())
    this.setData({
      currentDate: today,
      weekText: weekdayText(today)
    })
  },

  onShow() {
    this.fetchList()
  },

  onPullDownRefresh() {
    this.fetchList().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onDateChange(e) {
    const currentDate = safeText(e.detail.value)
    if (!currentDate) return
    this.setData({
      currentDate,
      weekText: weekdayText(currentDate)
    })
    this.fetchList()
  },

  async fetchList() {
    if (!this.data.currentDate) return
    this.setData({
      loading: true,
      loadError: ''
    })
    try {
      const res = await network.xgwScheduleList({
        riqi: this.data.currentDate
      })
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res))
      }
      const list = (Array.isArray(res.data) ? res.data : []).map(normalizeItem)
      this.setData({
        loading: false,
        unfinishedList: list.filter(item => item.status !== 1),
        finishedList: list.filter(item => item.status === 1)
      })
    } catch (err) {
      this.setData({
        loading: false,
        loadError: err && err.message ? err.message : '加载失败，请稍后重试',
        unfinishedList: [],
        finishedList: []
      })
    }
  },

  onAddTap() {
    wx.navigateTo({
      url: `/pages/schedule/form?date=${encodeURIComponent(this.data.currentDate)}`
    })
  },

  onEditTap(e) {
    const item = e.currentTarget.dataset.item
    if (!item || !item.id) return
    wx.navigateTo({
      url: `/pages/schedule/form?data=${encodeURIComponent(JSON.stringify(item))}`
    })
  },

  async onStatusTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    const currentStatus = asNumber(e.currentTarget.dataset.status, 2)
    if (!id) return
    const nextStatus = currentStatus === 1 ? 2 : 1
    wx.showLoading({
      title: '提交中...',
      mask: true
    })
    try {
      const res = await network.xgwScheduleStatus({
        id,
        status: nextStatus
      })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res, '操作失败'))
      }
      wx.showToast({
        title: nextStatus === 1 ? '已标记完成' : '已取消完成',
        icon: 'success'
      })
      this.fetchList()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '操作失败',
        icon: 'none'
      })
    }
  },

  async onDeleteTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '确定删除该日程吗？',
        content: '删除后将不能恢复。',
        success: res => resolve(!!res.confirm),
        fail: () => resolve(false)
      })
    })
    if (!confirmed) return
    wx.showLoading({
      title: '删除中...',
      mask: true
    })
    try {
      const res = await network.xgwScheduleDelete({ id })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res, '删除失败'))
      }
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      this.fetchList()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '删除失败',
        icon: 'none'
      })
    }
  }
})
