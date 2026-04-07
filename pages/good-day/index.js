const JUHE_CALENDAR_URL = 'https://v.juhe.cn/calendar/day'
const JUHE_CALENDAR_KEY = '0a164998cb748dd67a0609e4ff29ab60'

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function formatDate(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function formatMonthTitle(year, month) {
  return `${year}年${month + 1}月`
}

function formatSelectedDate(year, month, day) {
  return `${year}年${month + 1}月${day}日`
}

function getWeekdayText(year, month, day) {
  const date = new Date(year, month, day)
  return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()]
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function buildCalendarDays(year, month, selectedDay, today) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = getDaysInMonth(year, month)
  const list = []

  for (let i = 0; i < firstDay; i += 1) {
    list.push({
      key: `empty-${i}`,
      day: '',
      disabled: true,
      isToday: false,
      checked: false
    })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const isToday =
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    list.push({
      key: `day-${day}`,
      day,
      disabled: false,
      isToday,
      checked: day === selectedDay
    })
  }

  return list
}

function normalizeLuckDay(data) {
  if (!data) return null
  return {
    date: safeText(data.date),
    weekday: safeText(data.weekday),
    animalsYear: safeText(data.animalsYear),
    suit: safeText(data.suit).replace(/\./g, '  ').trim() || '暂无',
    avoid: safeText(data.avoid).replace(/\./g, '  ').trim() || '暂无',
    lunar: safeText(data.lunar),
    lunarYear: safeText(data.lunarYear)
  }
}

Page({
  data: {
    year: 0,
    month: 0,
    day: 0,
    monthTitle: '',
    pickerDate: '',
    selectedDateText: '',
    lunarText: '',
    calendarDays: [],
    loading: false,
    loadError: '',
    luckDay: null
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '黄道吉日'
    })
    const now = new Date()
    this.setCurrentDate(now.getFullYear(), now.getMonth(), now.getDate(), true)
  },

  onPullDownRefresh() {
    this.fetchLuckDay().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  setCurrentDate(year, month, day, shouldFetch = false) {
    const today = new Date()
    const calendarDays = buildCalendarDays(year, month, day, today)
    this.setData({
      year,
      month,
      day,
      monthTitle: formatMonthTitle(year, month),
      pickerDate: `${year}-${pad2(month + 1)}-${pad2(day)}`,
      selectedDateText: formatSelectedDate(year, month, day),
      lunarText: getWeekdayText(year, month, day),
      calendarDays
    })
    if (shouldFetch) {
      this.fetchLuckDay()
    }
  },

  onPrevMonth() {
    const current = new Date(this.data.year, this.data.month, 1)
    current.setMonth(current.getMonth() - 1)
    const nextDay = Math.min(this.data.day, getDaysInMonth(current.getFullYear(), current.getMonth()))
    this.setCurrentDate(current.getFullYear(), current.getMonth(), nextDay, true)
  },

  onNextMonth() {
    const current = new Date(this.data.year, this.data.month, 1)
    current.setMonth(current.getMonth() + 1)
    const nextDay = Math.min(this.data.day, getDaysInMonth(current.getFullYear(), current.getMonth()))
    this.setCurrentDate(current.getFullYear(), current.getMonth(), nextDay, true)
  },

  onDatePick(e) {
    const value = safeText(e.detail && e.detail.value)
    if (!value) return
    const parts = value.split('-')
    if (parts.length !== 3) return
    const year = Number(parts[0])
    const month = Number(parts[1]) - 1
    const day = Number(parts[2])
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return
    this.setCurrentDate(year, month, day, true)
  },

  onCalendarDayTap(e) {
    const day = Number(e.currentTarget.dataset.day)
    if (!Number.isFinite(day) || day <= 0) return
    this.setCurrentDate(this.data.year, this.data.month, day, true)
  },

  fetchLuckDay() {
    const date = formatDate(new Date(this.data.year, this.data.month, this.data.day))
    this.setData({
      loading: true,
      loadError: ''
    })
    return new Promise(resolve => {
      wx.request({
        url: JUHE_CALENDAR_URL,
        method: 'GET',
        data: {
          date,
          key: JUHE_CALENDAR_KEY
        },
        success: res => {
          const body = res && res.data ? res.data : {}
          if (Number(body.error_code) !== 0 || !body.result || !body.result.data) {
            this.setData({
              loading: false,
              loadError: safeText(body.reason, '黄道吉日加载失败'),
              luckDay: null
            })
            resolve()
            return
          }
          const luckDay = normalizeLuckDay(body.result.data)
          this.setData({
            loading: false,
            luckDay,
            loadError: '',
            lunarText: `${safeText(luckDay.lunarYear)} ${safeText(luckDay.lunar)} ${safeText(luckDay.weekday)}`.trim()
          })
          resolve()
        },
        fail: () => {
          this.setData({
            loading: false,
            loadError: '网络请求失败，请稍后重试',
            luckDay: null
          })
          resolve()
        }
      })
    })
  }
})
