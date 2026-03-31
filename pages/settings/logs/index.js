const xgwLog = require('../../../utils/xgw-log.js')

Page({
  data: {
    logs: []
  },

  onShow() {
    this.loadLogs()
  },

  loadLogs() {
    this.setData({
      logs: xgwLog.list()
    })
  },

  onCopyLatest() {
    const latest = xgwLog.latest()
    if (!latest) {
      wx.showToast({
        title: '暂无日志',
        icon: 'none'
      })
      return
    }
    wx.setClipboardData({
      data: `[${latest.timeText}] ${latest.title}${latest.detail ? `\n${latest.detail}` : ''}`
    })
  },

  onCopyAll() {
    const content = xgwLog.exportText()
    if (!content) {
      wx.showToast({
        title: '暂无日志',
        icon: 'none'
      })
      return
    }
    wx.setClipboardData({
      data: content
    })
  },

  onClearLogs() {
    wx.showModal({
      title: '清空日志',
      content: '确认清空本地日志中心内容吗？',
      confirmColor: '#e64340',
      success: res => {
        if (!res.confirm) {
          return
        }
        xgwLog.clear()
        this.loadLogs()
        wx.showToast({
          title: '已清空',
          icon: 'success'
        })
      }
    })
  }
})
