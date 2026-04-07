const network = require('../../../../api/network.js')
const xgwAuth = require('../../../../utils/xgw-auth.js')

const DEFAULT_COVER = '/images/load_img.webp'

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function formatPrice(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return safeText(value, '0')
  return num % 1 === 0 ? String(num) : num.toFixed(2)
}

function splitImages(value) {
  if (Array.isArray(value)) return value.map(item => safeText(item)).filter(Boolean)
  const text = safeText(value)
  return text ? text.split(',').map(item => item.trim()).filter(Boolean) : []
}

function getErrorMessage(err, fallback = '操作失败，请稍后重试') {
  if (!err) return fallback
  if (typeof err === 'string') return err
  return err.message || err.errMsg || fallback
}

function normalizeDetail(data = {}) {
  const state = asNumber(data.state, 0)
  const status = asNumber(data.status, 0)
  const photos = splitImages(data.shopimg)
  return {
    id: asNumber(data.shopid, 0),
    title: safeText(data.shopname, '未命名商品'),
    type1Text: safeText(data.pcolumnname, '--'),
    type2Text: safeText(data.columnname, '--'),
    priceText: formatPrice(data.price),
    unitText: safeText(data.company, '--'),
    couponsText: safeText(data.coupons_price, '0'),
    weightText: safeText(data.weigh, '--'),
    freightText: safeText(data.expressname, '--'),
    areaText: [safeText(data.province), safeText(data.city), safeText(data.county)].filter(Boolean).join(' ') || '--',
    cover: photos[0] || DEFAULT_COVER,
    photos,
    state,
    status,
    statusLabel:
      state === 1
        ? '审核中'
        : state === 2
          ? status === 1 ? '审核通过 · 已上架' : '审核通过 · 未上架'
          : state === 3
            ? '审核未通过'
            : '待完善',
    raw: data
  }
}

function getActionConfig(detail) {
  if (!detail) return { canEdit: false, canDelete: false, primaryText: '', primaryAction: '' }
  if (detail.state === 1) return { canEdit: true, canDelete: true, primaryText: '', primaryAction: '' }
  if (detail.state === 2) {
    return {
      canEdit: detail.status !== 1,
      canDelete: detail.status !== 1,
      primaryText: detail.status === 1 ? '下架' : '上架',
      primaryAction: detail.status === 1 ? 'offShelf' : 'onShelf'
    }
  }
  if (detail.state === 3) {
    return { canEdit: true, canDelete: true, primaryText: '查看原因', primaryAction: 'reason' }
  }
  return { canEdit: true, canDelete: true, primaryText: '', primaryAction: '' }
}

Page({
  data: {
    detail: null,
    actionConfig: getActionConfig(null),
    loading: true,
    processing: false,
    defaultCover: DEFAULT_COVER
  },

  onLoad(options) {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    this.shopId = asNumber(options && options.id, 0)
    if (!this.shopId) {
      wx.showToast({ title: '缺少商品参数', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 300)
      return
    }
    this.fetchDetail()
  },

  onShow() {
    if (this._shouldRefreshOnShow) {
      this._shouldRefreshOnShow = false
      this.fetchDetail()
    }
  },

  onHide() {
    if (this.data.detail) this._shouldRefreshOnShow = true
  },

  previewImage(e) {
    const current = safeText(e.currentTarget.dataset.url)
    if (!current) return
    const detail = this.data.detail || {}
    wx.previewImage({
      current,
      urls: (detail.photos || []).length ? detail.photos : [current]
    })
  },

  goEdit() {
    if (!this.data.actionConfig.canEdit || !this.shopId) return
    wx.navigateTo({ url: `/pages/my/commodity/form/index?id=${this.shopId}` })
  },

  async onDelete() {
    if (!this.data.actionConfig.canDelete || this.data.processing || !this.shopId) return
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '删除商品',
        content: '删除后不可恢复，是否继续？',
        confirmColor: '#ff5b86',
        success: res => resolve(!!res.confirm),
        fail: () => resolve(false)
      })
    })
    if (!confirm) return
    this.setData({ processing: true })
    wx.showLoading({ title: '删除中...', mask: true })
    try {
      const res = await network.xgwCommodityDelete({ shopid: this.shopId })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '删除失败')
      }
      wx.hideLoading()
      wx.showToast({ title: (res && (res.message || res.msg)) || '删除成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: getErrorMessage(err, '删除失败'), icon: 'none' })
    } finally {
      this.setData({ processing: false })
    }
  },

  async onPrimaryAction() {
    const action = this.data.actionConfig.primaryAction
    if (!action || this.data.processing || !this.shopId) return
    if (action === 'onShelf') {
      await this.updateStatus(1, '上架中...')
      return
    }
    if (action === 'offShelf') {
      await this.updateStatus(0, '下架中...')
      return
    }
    if (action === 'reason') {
      await this.showFailedReason()
    }
  },

  async updateStatus(status, title) {
    this.setData({ processing: true })
    wx.showLoading({ title, mask: true })
    try {
      const res = await network.xgwCommodityStatus({ shopid: this.shopId, status })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '操作失败')
      }
      wx.hideLoading()
      wx.showToast({ title: (res && (res.message || res.msg)) || '操作成功', icon: 'success' })
      this.fetchDetail()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: getErrorMessage(err, '操作失败'), icon: 'none' })
    } finally {
      this.setData({ processing: false })
    }
  },

  async showFailedReason() {
    this.setData({ processing: true })
    wx.showLoading({ title: '加载中...', mask: true })
    try {
      const res = await network.xgwCommodityReason({ shopid: this.shopId })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '获取失败原因失败')
      }
      wx.showModal({
        title: '审核失败原因',
        content: safeText(res.data, '暂无失败原因'),
        showCancel: false,
        confirmColor: '#ff5b86'
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: getErrorMessage(err, '获取失败原因失败'), icon: 'none' })
    } finally {
      this.setData({ processing: false })
    }
  },

  async fetchDetail() {
    this.setData({ loading: true })
    try {
      const res = await network.xgwCommodityDetail({ shopid: this.shopId })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.message || res.msg)) || '加载商品详情失败')
      }
      const detail = normalizeDetail(res.data)
      this.setData({
        detail,
        actionConfig: getActionConfig(detail)
      })
    } catch (err) {
      wx.showToast({ title: getErrorMessage(err, '加载商品详情失败'), icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
