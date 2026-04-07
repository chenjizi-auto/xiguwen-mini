const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

const STATUS_ON = 0
const STATUS_PASS = 1
const STATUS_UNPASS = 2

function emptyImageSlot() {
  return {
    localPath: '',
    url: ''
  }
}

function getImageSource(slot) {
  return (slot && (slot.localPath || slot.url)) || ''
}

function getMessage(res, fallback) {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

function isValidIdCard(value) {
  return /^(^\d{15}$)|(^\d{17}(\d|X|x)$)$/.test(String(value || '').trim())
}

function getUserType() {
  const mineHome = xgwAuth.getMineHome() || {}
  const userInfo = xgwAuth.getUserInfo() || {}
  const userType = Number(mineHome.usertype || userInfo.usertype || 3)
  return [1, 2, 3].includes(userType) ? userType : 3
}

Page({
  data: {
    loading: false,
    submitting: false,
    auditState: -1,
    name: '',
    idcard: '',
    front: emptyImageSlot(),
    back: emptyImageSlot(),
    license: emptyImageSlot()
  },

  onLoad() {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    if (getUserType() === 3) {
      wx.showToast({
        title: '当前账号仅支持个人认证',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
      return
    }
    wx.setNavigationBarTitle({
      title: '企业实名认证'
    })
    this.fetchStatus()
  },

  onNameInput(e) {
    this.setData({
      name: String(e.detail.value || '').trimStart()
    })
  },

  onIdCardInput(e) {
    this.setData({
      idcard: String(e.detail.value || '').trim().toUpperCase()
    })
  },

  async fetchStatus() {
    this.setData({ loading: true })
    wx.showLoading({
      title: '加载中...',
      mask: true
    })

    try {
      const res = await network.xgwGetCompanyCertification({})
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: getMessage(res, '获取认证状态失败'),
          icon: 'none'
        })
        return
      }

      const data = res.data
      if (!data) return

      const state = Number(data.state)
      this.setData({ auditState: state })
      if (state === STATUS_ON) {
        await this.showNotice('资料提交成功！', '我们会尽快完成您提供的企业认证资料审核～', '我知道了')
        wx.navigateBack()
        return
      }
      if (state === STATUS_PASS) {
        await this.showNotice('恭喜您，实名认证成功！', '', '我知道了')
        wx.navigateBack()
        return
      }

      this.fillForm(data)
      if (state === STATUS_UNPASS) {
        await this.showNotice('很抱歉，实名认证未通过！', data.content || '请修改后重新提交', '修改提交')
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '获取认证状态失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  fillForm(data) {
    this.setData({
      name: data.name || '',
      idcard: data.identitynum || '',
      front: {
        localPath: '',
        url: data.identitya || ''
      },
      back: {
        localPath: '',
        url: data.identityb || ''
      },
      license: {
        localPath: '',
        url: data.imga || data.shou_chi_SFZ || ''
      }
    })
  },

  showNotice(title, content, confirmText = '我知道了') {
    return new Promise(resolve => {
      wx.showModal({
        title,
        content: content || '',
        showCancel: false,
        confirmText,
        success: resolve,
        fail: resolve
      })
    })
  },

  chooseImage(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const filePath = (res.tempFilePaths || [])[0]
        if (!filePath) return
        this.setData({
          [`${key}.localPath`]: filePath,
          [`${key}.url`]: ''
        })
      }
    })
  },

  previewImage(e) {
    const key = e.currentTarget.dataset.key
    const current = getImageSource(this.data[key])
    if (!current) return
    wx.previewImage({
      current,
      urls: [current]
    })
  },

  async uploadSlot(key, label) {
    const slot = this.data[key]
    if (!slot) {
      throw new Error(`请上传${label}`)
    }
    if (slot.localPath) {
      const res = await network.xgwUploadImage(slot.localPath, 1)
      if (!res || res.code !== 0 || !res.data) {
        throw new Error(getMessage(res, `${label}上传失败`))
      }
      this.setData({
        [`${key}.url`]: res.data,
        [`${key}.localPath`]: ''
      })
      return res.data
    }
    if (slot.url) {
      return slot.url
    }
    throw new Error(`请上传${label}`)
  },

  validateForm() {
    const name = String(this.data.name || '').trim()
    const idcard = String(this.data.idcard || '').trim().toUpperCase()
    if (!name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return false
    }
    if (!idcard) {
      wx.showToast({ title: '请输入身份证号码', icon: 'none' })
      return false
    }
    if (!isValidIdCard(idcard)) {
      wx.showToast({ title: '身份证号码格式有误', icon: 'none' })
      return false
    }
    if (!getImageSource(this.data.front)) {
      wx.showToast({ title: '请上传身份证正面照', icon: 'none' })
      return false
    }
    if (!getImageSource(this.data.back)) {
      wx.showToast({ title: '请上传身份证反面照', icon: 'none' })
      return false
    }
    if (!getImageSource(this.data.license)) {
      wx.showToast({ title: '请上传营业执照', icon: 'none' })
      return false
    }
    return true
  },

  async submit() {
    if (this.data.submitting || !this.validateForm()) {
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({
      title: '提交中...',
      mask: true
    })

    try {
      const identitya = await this.uploadSlot('front', '身份证正面照')
      const identityb = await this.uploadSlot('back', '身份证反面照')
      const imga = await this.uploadSlot('license', '营业执照')
      const res = await network.xgwSubmitCompanyCertification({
        name: String(this.data.name || '').trim(),
        identitynum: String(this.data.idcard || '').trim().toUpperCase(),
        identitya,
        identityb,
        imga
      })

      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: getMessage(res, '提交失败'),
          icon: 'none'
        })
        return
      }

      await this.showNotice('资料提交成功！', '我们会尽快完成您提供的企业认证资料审核～', '我知道了')
      wx.navigateBack()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '提交失败',
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
