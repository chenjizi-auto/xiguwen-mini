const network = require('../../api/network.js')
const xgwAuth = require('../../utils/xgw-auth.js')

const app = getApp()
const DRAFT_KEY = 'xgwDiscoverPublishDraft'
const MAX_IMAGE_COUNT = 9

function getErrorMessage(err, fallback = '操作失败，请稍后重试') {
  if (!err) return fallback
  if (typeof err === 'string') return err
  return err.message || err.errMsg || fallback
}

Page({
  data: {
    navHeight: 88,
    navTop: 44,
    menuHeight: 32,
    menuRight: 12,
    content: '',
    images: [],
    submitting: false,
    canPublish: false,
    placeholder: '分享这一刻的想法…',
    maxImageCount: MAX_IMAGE_COUNT
  },

  onLoad() {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({
        url: '/pages/login/index'
      })
      return
    }
    this.setNavMetrics()
    this.restoreDraft()
  },

  onUnload() {
    if (this._skipDraftSave) {
      return
    }
    this.saveDraft()
  },

  setNavMetrics() {
    const globalData = app.globalData || {}
    const menuButtonObject = globalData.menuButtonObject || {}
    const systemInfo = wx.getSystemInfoSync()
    const fallbackNavTop = systemInfo.statusBarHeight || 20
    const navTop = globalData.navTop || menuButtonObject.top || fallbackNavTop
    const menuHeight = menuButtonObject.height || 32
    const navHeight = globalData.navHeight || (navTop + menuHeight + (navTop - fallbackNavTop))
    const windowWidth = systemInfo.windowWidth || 375
    const menuRight = menuButtonObject.right ? Math.max(windowWidth - menuButtonObject.right, 12) : 12

    this.setData({
      navHeight,
      navTop,
      menuHeight,
      menuRight
    })
  },

  restoreDraft() {
    const draft = wx.getStorageSync(DRAFT_KEY) || {}
    const content = typeof draft.content === 'string' ? draft.content : ''
    const images = Array.isArray(draft.images) ? draft.images.slice(0, MAX_IMAGE_COUNT) : []
    this.setData({
      content,
      images
    })
    this.syncPublishState()
  },

  saveDraft() {
    const content = (this.data.content || '').trim()
    const images = Array.isArray(this.data.images) ? this.data.images : []
    if (!content && images.length === 0) {
      wx.removeStorageSync(DRAFT_KEY)
      return
    }
    wx.setStorageSync(DRAFT_KEY, {
      content: this.data.content || '',
      images
    })
  },

  clearDraft() {
    wx.removeStorageSync(DRAFT_KEY)
  },

  syncPublishState() {
    this.setData({
      canPublish: !!(this.data.content || '').trim()
    })
  },

  handleBack() {
    this.saveDraft()
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({
      url: '/pages/category/category'
    })
  },

  onContentInput(e) {
    this.setData({
      content: e.detail.value || ''
    })
    this.syncPublishState()
  },

  async onAddImage() {
    const remain = MAX_IMAGE_COUNT - this.data.images.length
    if (remain <= 0) {
      wx.showToast({
        title: `最多上传${MAX_IMAGE_COUNT}张`,
        icon: 'none'
      })
      return
    }

    const tapIndex = await new Promise(resolve => {
      wx.showActionSheet({
        itemList: ['拍照', '从相册选择'],
        success: res => resolve(res.tapIndex),
        fail: () => resolve(-1)
      })
    })

    if (tapIndex < 0) return

    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: tapIndex === 0 ? ['camera'] : ['album'],
      success: res => {
        const tempFilePaths = (res && res.tempFilePaths) || []
        if (!tempFilePaths.length) return
        this.setData({
          images: this.data.images.concat(tempFilePaths).slice(0, MAX_IMAGE_COUNT)
        })
        this.saveDraft()
      }
    })
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.url
    if (!current) return
    wx.previewImage({
      current,
      urls: this.data.images
    })
  },

  removeImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(index) || index < 0) return
    const images = this.data.images.slice()
    images.splice(index, 1)
    this.setData({ images })
    this.saveDraft()
  },

  async onPublish() {
    if (this.data.submitting) return

    const content = (this.data.content || '').trim()
    if (!content) {
      wx.showToast({
        title: '请输入发表内容',
        icon: 'none'
      })
      return
    }

    this.setData({
      submitting: true
    })
    wx.showLoading({
      title: '发布中...'
    })

    try {
      const res = await network.xgwDynamicPublish(content, this.data.images)
      wx.hideLoading()

      if (!res || res.code !== 0) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '发布失败',
          icon: 'none'
        })
        return
      }

      this._skipDraftSave = true
      this.clearDraft()

      const pages = getCurrentPages()
      const prevPage = pages.length > 1 ? pages[pages.length - 2] : null
      if (prevPage && typeof prevPage.refreshDiscover === 'function') {
        prevPage.refreshDiscover()
      }

      wx.showToast({
        title: (res && (res.message || res.msg)) || '发布成功',
        icon: 'success'
      })

      setTimeout(() => {
        if (getCurrentPages().length > 1) {
          wx.navigateBack()
        } else {
          wx.switchTab({
            url: '/pages/category/category'
          })
        }
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: getErrorMessage(err, '发布失败'),
        icon: 'none'
      })
    } finally {
      this.setData({
        submitting: false
      })
    }
  }
})
