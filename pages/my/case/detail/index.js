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

function getErrorMessage(err, fallback = '操作失败，请稍后重试') {
  if (!err) return fallback
  if (typeof err === 'string') return err
  return err.message || err.errMsg || fallback
}

function formatTime(timestamp) {
  const time = asNumber(timestamp, 0)
  if (!time) return ''
  const date = new Date(time * 1000)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function normalizeDetail(data = {}) {
  const status = asNumber(data.status, 0)
  const putaway = asNumber(data.putaway, 0)
  const photos = Array.isArray(data.phtupian)
    ? data.phtupian.map(item => safeText(item && item.photourl)).filter(Boolean)
    : []
  return {
    id: asNumber(data.id, 0),
    title: safeText(data.title, '未命名案例'),
    weight: safeText(data.weigh, ''),
    cover: safeText(data.weddingcover, DEFAULT_COVER) || DEFAULT_COVER,
    description: safeText(data.weddingdescribe, ''),
    weddingTime: safeText(data.weddingtime, ''),
    weddingPlace: safeText(data.weddingplace, ''),
    weddingExpenses: safeText(data.weddingexpenses, ''),
    weddingTypeId: asNumber(data.weddingtypeid, 0),
    weddingEnvironmentId: asNumber(data.weddingenvironmentid, 0),
    status,
    putaway,
    statusLabel:
      status === 1
        ? '审核中'
        : status === 2
          ? putaway === 1 ? '审核通过 · 已上架' : '审核通过 · 未上架'
          : status === 3
            ? '审核未通过'
            : '待提交',
    createTime: formatTime(data.create_ti),
    updateTime: formatTime(data.update_ti),
    photos
  }
}

function getActionConfig(detail) {
  if (!detail) {
    return { canEdit: false, canDelete: false, primaryText: '', primaryAction: '' }
  }
  if (detail.status === 1) {
    return { canEdit: true, canDelete: true, primaryText: '', primaryAction: '' }
  }
  if (detail.status === 2) {
    return {
      canEdit: detail.putaway !== 1,
      canDelete: detail.putaway !== 1,
      primaryText: detail.putaway === 1 ? '下架' : '上架',
      primaryAction: detail.putaway === 1 ? 'offShelf' : 'onShelf'
    }
  }
  if (detail.status === 3) {
    return { canEdit: true, canDelete: true, primaryText: '查看原因', primaryAction: 'reason' }
  }
  return { canEdit: true, canDelete: true, primaryText: '提交审核', primaryAction: 'submit' }
}

Page({
  data: {
    detail: null,
    typeMap: {},
    environmentMap: {},
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
    this.caseId = asNumber(options && options.id, 0)
    if (!this.caseId) {
      wx.showToast({ title: '缺少案例参数', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 300)
      return
    }
    this.fetchBaseData()
  },

  onShow() {
    if (this._shouldRefreshOnShow) {
      this._shouldRefreshOnShow = false
      this.fetchBaseData()
    }
  },

  onHide() {
    if (this.data.detail) this._shouldRefreshOnShow = true
  },

  previewCover() {
    const detail = this.data.detail
    if (!detail || !detail.cover) return
    wx.previewImage({
      current: detail.cover,
      urls: [detail.cover].concat(detail.photos || [])
    })
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
    if (!this.data.actionConfig.canEdit || !this.caseId) return
    wx.navigateTo({ url: `/pages/my/case/form/index?id=${this.caseId}` })
  },

  async onDelete() {
    if (!this.data.actionConfig.canDelete || this.data.processing || !this.caseId) return
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '删除案例',
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
      const res = await network.xgwCaseDelete({ id: this.caseId })
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
    if (!action || this.data.processing || !this.caseId) return
    if (action === 'submit') {
      await this.submitCase()
      return
    }
    if (action === 'onShelf') {
      await this.updateCaseStatus(1, '上架中...')
      return
    }
    if (action === 'offShelf') {
      await this.updateCaseStatus(0, '下架中...')
      return
    }
    if (action === 'reason') {
      await this.showFailedReason()
    }
  },

  async submitCase() {
    this.setData({ processing: true })
    wx.showLoading({ title: '提交中...', mask: true })
    try {
      const res = await network.xgwCaseSubmit({ id: this.caseId })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '提交失败')
      }
      wx.hideLoading()
      wx.showToast({ title: (res && (res.message || res.msg)) || '提交成功', icon: 'success' })
      this.fetchBaseData()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: getErrorMessage(err, '提交失败'), icon: 'none' })
    } finally {
      this.setData({ processing: false })
    }
  },

  async updateCaseStatus(status, loadingTitle) {
    this.setData({ processing: true })
    wx.showLoading({ title: loadingTitle, mask: true })
    try {
      const res = await network.xgwCaseStatus({ id: this.caseId, status })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '操作失败')
      }
      wx.hideLoading()
      wx.showToast({ title: (res && (res.message || res.msg)) || '操作成功', icon: 'success' })
      this.fetchBaseData()
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
      const res = await network.xgwCaseReason({ id: this.caseId })
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

  async fetchBaseData() {
    this.setData({ loading: true })
    try {
      const [typeRes, envRes, detailRes] = await Promise.all([
        network.xgwWeddingTypeList({}),
        network.xgwWeddingEnvironmentList({}),
        network.xgwCaseDetail({ id: this.caseId })
      ])
      if (!detailRes || detailRes.code !== 0 || !detailRes.data) {
        throw new Error((detailRes && (detailRes.message || detailRes.msg)) || '加载案例详情失败')
      }
      const typeMap = {}
      const environmentMap = {}
      ;(Array.isArray(typeRes && typeRes.data) ? typeRes.data : []).forEach(item => {
        typeMap[asNumber(item.id, 0)] = safeText(item.title)
      })
      ;(Array.isArray(envRes && envRes.data) ? envRes.data : []).forEach(item => {
        environmentMap[asNumber(item.id, 0)] = safeText(item.title)
      })
      const detail = normalizeDetail(detailRes.data)
      detail.typeText = typeMap[detail.weddingTypeId] || '--'
      detail.environmentText = environmentMap[detail.weddingEnvironmentId] || '--'
      this.setData({
        typeMap,
        environmentMap,
        detail,
        actionConfig: getActionConfig(detail)
      })
    } catch (err) {
      wx.showToast({ title: getErrorMessage(err, '加载案例详情失败'), icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
