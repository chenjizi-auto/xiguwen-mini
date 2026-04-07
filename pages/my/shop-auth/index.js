const network = require('../../../api/network.js')

const TABS = [
  { key: 'platform', label: '平台认证' },
  { key: 'integrity', label: '诚信认证' },
  { key: 'academy', label: '学院认证' }
]

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function formatMoney(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : safeStr(v, '0.00')
}

function mapPlatformItem(item = {}) {
  const state = asNumber(item.state, 0)
  let actionText = ''
  let actionType = ''
  let statusText = ''
  if (state === 0 || state === 5) {
    actionText = '立即认证'
    actionType = 'pay'
    statusText = state === 5 ? '已退款' : '未认证'
  } else if (state === 2) {
    statusText = '审核中'
  } else if (state === 4) {
    statusText = '已认证'
  }
  return {
    id: asNumber(item.id, 0),
    title: safeStr(item.parameter1, '平台认证'),
    subtitle: `认证费用 ¥${formatMoney(item.parameter2)}`,
    badge: statusText,
    actionText,
    actionType,
    raw: item
  }
}

function mapIntegrityItem(item = {}) {
  const state = asNumber(item.state, 0)
  let actionText = ''
  let actionType = ''
  let statusText = ''
  if (state === 0 || state === 5) {
    actionText = '立即认证'
    actionType = 'pay'
    statusText = state === 5 ? '已退款' : '未认证'
  } else if (state === 2) {
    actionText = '退保证金'
    actionType = 'refund'
    statusText = '审核中'
  } else if (state === 4) {
    actionText = '退保证金'
    actionType = 'refund'
    statusText = '已认证'
  }
  const options = Array.isArray(item.jine)
    ? item.jine.map(opt => `${safeStr(opt.parameter1)} ¥${formatMoney(opt.parameter2)}`)
    : []
  return {
    id: asNumber(item.id, 0),
    title: '诚信认证',
    subtitle: options.length ? options.join(' / ') : `认证费用 ¥${formatMoney(item.parameter2)}`,
    badge: statusText,
    actionText,
    actionType,
    raw: item
  }
}

function mapAcademyItem(item = {}) {
  const state = asNumber(item.state, 0)
  let actionText = ''
  let actionType = ''
  let statusText = ''
  if (state === 0) {
    actionText = '立即报名'
    actionType = 'pay'
    statusText = '未认证'
  } else if (state === 4) {
    actionText = '提交资料'
    actionType = 'submit_material'
    statusText = '已缴费，未提交材料'
  } else if (state === 3) {
    actionText = '查看资料'
    actionType = 'watch_material'
    statusText = '审核中'
  } else if (state === 2) {
    actionText = '重新报名'
    actionType = 'resubmit_material'
    statusText = '审核失败'
  } else if (state === 1) {
    statusText = '已通过'
  }
  return {
    id: asNumber(item.id, 0),
    title: safeStr(item.parameter1, '学院认证'),
    subtitle: safeStr(item.parameter3, ''),
    badge: statusText,
    actionText,
    actionType,
    star: asNumber(item.star, 0),
    raw: item
  }
}

Page({
  data: {
    tabs: TABS,
    tabIndex: 0,
    loading: true,
    errorText: '',
    platformList: [],
    integrityList: [],
    academyList: []
  },

  onLoad() {
    this.fetchData()
  },

  onShow() {
    if (this._refreshOnShow) {
      this._refreshOnShow = false
      this.fetchData()
    }
  },

  onPullDownRefresh() {
    this.fetchData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onTabChange(e) {
    this.setData({
      tabIndex: asNumber(e && e.detail ? e.detail.index : 0, 0)
    })
  },

  getCurrentList() {
    const key = ((this.data.tabs || [])[this.data.tabIndex] || {}).key
    if (key === 'integrity') return this.data.integrityList || []
    if (key === 'academy') return this.data.academyList || []
    return this.data.platformList || []
  },

  async fetchData() {
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const res = await network.xgwShopAuthInfo({})
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.msg || res.message)) || 'request failed')
      }
      const data = res.data || {}
      this.setData({
        loading: false,
        platformList: data.pingtai ? [mapPlatformItem(data.pingtai)] : [],
        integrityList: data.chengxin ? [mapIntegrityItem(data.chengxin)] : [],
        academyList: Array.isArray(data.xueyuan) ? data.xueyuan.map(mapAcademyItem) : [],
        errorText: ''
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: '店铺认证信息加载失败，请稍后重试',
        platformList: [],
        integrityList: [],
        academyList: []
      })
    }
  },

  async onActionTap(e) {
    const index = asNumber(e && e.currentTarget ? e.currentTarget.dataset.index : -1, -1)
    const list = this.getCurrentList()
    const item = list[index]
    if (!item || !item.actionType) return

    if (item.actionType === 'refund') {
      const ok = await new Promise(resolve => {
        wx.showModal({
          title: '退保证金',
          content: '确定要申请退保证金吗？',
          confirmColor: '#e64340',
          success: res => resolve(!!res.confirm),
          fail: () => resolve(false)
        })
      })
      if (!ok) return
      wx.showLoading({ title: '提交中...', mask: true })
      try {
        const res = await network.xgwShopAuthRefund({ id: item.id })
        wx.hideLoading()
        if (!res || res.code !== 0) {
          throw new Error((res && (res.msg || res.message)) || '退款失败')
        }
        wx.showToast({
          title: (res && (res.msg || res.message)) || '退款成功',
          icon: 'success'
        })
        this.fetchData()
      } catch (err) {
        wx.hideLoading()
        wx.showToast({
          title: safeStr(err && err.message, '退款失败'),
          icon: 'none'
        })
      }
      return
    }

    if (item.actionType === 'submit_material' || item.actionType === 'watch_material' || item.actionType === 'resubmit_material') {
      const mode =
        item.actionType === 'submit_material'
          ? 'submit'
          : item.actionType === 'watch_material'
            ? 'watch'
            : 'resubmit'
      this._refreshOnShow = true
      wx.navigateTo({
        url: `/pages/my/shop-auth/material/index?id=${item.id}&title=${encodeURIComponent(item.title)}&mode=${mode}`
      })
      return
    }

    wx.showToast({
      title: '支付暂未接入',
      icon: 'none'
    })
  }
})
