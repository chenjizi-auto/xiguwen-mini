const LOG_KEY = 'xgwLocalLogs'
const MAX_LOGS = 200

function list() {
  const data = wx.getStorageSync(LOG_KEY)
  return Array.isArray(data) ? data : []
}

function save(logs) {
  wx.setStorageSync(LOG_KEY, logs.slice(0, MAX_LOGS))
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

function record(title, detail = '') {
  const timestamp = Date.now()
  const logs = list()
  logs.unshift({
    id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    title: title || '系统日志',
    detail: detail || '',
    timestamp,
    timeText: formatTime(timestamp)
  })
  save(logs)
}

function clear() {
  wx.removeStorageSync(LOG_KEY)
}

function latest() {
  const logs = list()
  return logs.length ? logs[0] : null
}

function exportText() {
  return list()
    .map(item => `[${item.timeText}] ${item.title}${item.detail ? `\n${item.detail}` : ''}`)
    .join('\n\n')
}

module.exports = {
  LOG_KEY,
  list,
  clear,
  latest,
  record,
  exportText
}
