const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

const DEFAULT_COVER = '/images/load_img.png'

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
  const photos = Array.isArray(data.photourl)
    ? data.photourl.map(item => safeText(item && item.photo)).filter(Boolean)
    : []
  return {
    id: asNumber(data.id, 0),
    name: safeText(data.name, '未命名图册'),
    weight: safeText(data.weight, ''),
    synopsis: safeText(data.synopsis, ''),
    cover: safeText(data.cover, DEFAULT_COVER) || DEFAULT_COVER,
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
    statecontent: safeText(data.statecontent, ''),
    createTime: formatTime(data.create_ti),
    updateTime: formatTime(data.update_ti),
    photos
  }
}

function getActionConfig(detail) {
  if (!detail) {
    return {
      canEdit: false,
      canDelete: false,
      primaryText: '',
      primaryAction: ''
    }
  }

  if (detail.status === 1) {
    return {
      canEdit: true,
      canDelete: true,
      primaryText: '',
      primaryAction: ''
    }
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
    return {
      canEdit: true,
      canDelete: true,
      primaryText: '查看原因',
      primaryAction: 'reason'
    }
  }

  return {
    canEdit: true,
    canDelete: true,
    primaryText: '提交审核',
    primaryAction: 'submit'
  }
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
    this.atlasId = asNumber(options && options.id, 0)
    if (!this.atlasId) {
      wx.showToast({
        title: '缺少图册参数',
        icon: 'none'
      })
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
    if (this.data.detail) {
      this._shouldRefreshOnShow = true
    }
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
    if (!this.data.actionConfig.canEdit || !this.atlasId) return
    wx.navigateTo({
      url: `/pages/my/mine-atlas-edit/index?id=${this.atlasId}`
    })
  },

  async onDelete() {
    if (!this.data.actionConfig.canDelete || this.data.processing || !this.atlasId) return
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '删除图册',
        content: '删除后不可恢复，是否继续？',
        confirmColor: '#ff5b86',
        success: res => resolve(!!res.confirm),
        fail: () => resolve(false)
      })
    })
    if (!confirm) return

    this.setData({ processing: true })
    wx.showLoading({
      title: '删除中...',
      mask: true
    })

    try {
      const res = await network.xgwAtlasDelete({ id: this.atlasId })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '删除失败')
      }
      wx.hideLoading()
      wx.showToast({
        title: (res && (res.message || res.msg)) || '删除成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: getErrorMessage(err, '删除失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ processing: false })
    }
  },

  async onPrimaryAction() {
    const action = this.data.actionConfig.primaryAction
    if (!action || this.data.processing || !this.atlasId) return

    if (action === 'submit') {
      await this.submitAtlas()
      return
    }
    if (action === 'onShelf') {
      await this.updateAtlasStatus(1, '上架中...')
      return
    }
    if (action === 'offShelf') {
      await this.updateAtlasStatus(0, '下架中...')
      return
    }
    if (action === 'reason') {
      await this.showFailedReason()
    }
  },

  async submitAtlas() {
    this.setData({ processing: true })
    wx.showLoading({
      title: '提交中...',
      mask: true
    })
    try {
      const res = await network.xgwAtlasSubmit({ id: this.atlasId })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '提交失败')
      }
      wx.hideLoading()
      wx.showToast({
        title: (res && (res.message || res.msg)) || '提交成功',
        icon: 'success'
      })
      this.fetchDetail()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: getErrorMessage(err, '提交失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ processing: false })
    }
  },

  async updateAtlasStatus(status, loadingTitle) {
    this.setData({ processing: true })
    wx.showLoading({
      title: loadingTitle,
      mask: true
    })
    try {
      const res = await network.xgwAtlasStatus({
        id: this.atlasId,
        status
      })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '操作失败')
      }
      wx.hideLoading()
      wx.showToast({
        title: (res && (res.message || res.msg)) || '操作成功',
        icon: 'success'
      })
      this.fetchDetail()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: getErrorMessage(err, '操作失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ processing: false })
    }
  },

  async showFailedReason() {
    this.setData({ processing: true })
    wx.showLoading({
      title: '加载中...',
      mask: true
    })
    try {
      const res = await network.xgwAtlasReason({ id: this.atlasId })
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
      wx.showToast({
        title: getErrorMessage(err, '获取失败原因失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ processing: false })
    }
  },

  async fetchDetail() {
    this.setData({ loading: true })
    try {
      const res = await network.xgwAtlasDetail({ id: this.atlasId })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.message || res.msg)) || '加载图册详情失败')
      }
      const detail = normalizeDetail(res.data)
      this.setData({
        detail,
        actionConfig: getActionConfig(detail)
      })
    } catch (err) {
      wx.showToast({
        title: getErrorMessage(err, '加载图册详情失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  }
})
