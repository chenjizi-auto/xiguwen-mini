const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')
const xgwLog = require('../../../utils/xgw-log.js')

const SEX_OPTIONS = ['男', '女']

function asDateString(value) {
  if (!value && value !== 0) {
    return ''
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  let timestamp = Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return ''
  }
  if (String(Math.trunc(timestamp)).length === 10) {
    timestamp *= 1000
  }
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function calcAge(dateText) {
  if (!dateText) {
    return ''
  }
  const birth = new Date(`${dateText}T00:00:00`)
  if (Number.isNaN(birth.getTime())) {
    return ''
  }
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1
  }
  return age >= 0 ? String(age) : ''
}

function toBirthdayTimestamp(dateText) {
  const date = new Date(`${dateText}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return String(Math.floor(date.getTime() / 1000))
}

function normalizeUserInfo(data = {}) {
  const birthdayDate = asDateString(data.birthday)
  const region = [data.provinceid || '', data.cityid || '', data.countyid || ''].filter(Boolean)
  return {
    head: data.head || '',
    nickname: data.nickname || '',
    sex: data.sex || '',
    birthdayDate,
    age: data.age || calcAge(birthdayDate),
    height: data.height == null ? '' : String(data.height),
    weight: data.weight == null ? '' : String(data.weight),
    region,
    address: data.address || ''
  }
}

Page({
  data: {
    loading: false,
    submitting: false,
    sexOptions: SEX_OPTIONS,
    avatarUrl: '',
    avatarTempFile: '',
    nickname: '',
    sex: '',
    sexIndex: -1,
    birthdayDate: '',
    age: '',
    height: '',
    weight: '',
    region: [],
    regionText: '',
    address: ''
  },

  onLoad() {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({
        url: '/pages/login/index'
      })
      return
    }
    this.loadUserInfo()
  },

  async loadUserInfo() {
    this.setData({
      loading: true
    })
    try {
      const res = await network.xgwUserInfo({})
      const info = normalizeUserInfo(res && res.code === 0 ? res.data || {} : {})
      const fallbackUser = xgwAuth.getUserInfo()
      this.setData({
        avatarUrl: info.head || fallbackUser.head || '',
        avatarTempFile: '',
        nickname: info.nickname || fallbackUser.nickname || '',
        sex: info.sex || '',
        sexIndex: SEX_OPTIONS.indexOf(info.sex),
        birthdayDate: info.birthdayDate,
        age: info.age || '',
        height: info.height,
        weight: info.weight,
        region: info.region,
        regionText: info.region.join(' '),
        address: info.address
      })
    } catch (err) {
      wx.showToast({
        title: '加载资料失败',
        icon: 'none'
      })
    } finally {
      this.setData({
        loading: false
      })
    }
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file || !file.tempFilePath) {
          return
        }
        this.setData({
          avatarUrl: file.tempFilePath,
          avatarTempFile: file.tempFilePath
        })
      }
    })
  },

  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    })
  },

  onSexChange(e) {
    const sexIndex = Number(e.detail.value)
    this.setData({
      sexIndex,
      sex: SEX_OPTIONS[sexIndex] || ''
    })
  },

  onBirthdayChange(e) {
    const birthdayDate = e.detail.value
    this.setData({
      birthdayDate,
      age: calcAge(birthdayDate)
    })
  },

  onHeightInput(e) {
    this.setData({
      height: e.detail.value.replace(/[^\d.]/g, '').slice(0, 5)
    })
  },

  onWeightInput(e) {
    this.setData({
      weight: e.detail.value.replace(/[^\d.]/g, '').slice(0, 5)
    })
  },

  onRegionChange(e) {
    const region = e.detail.value || []
    this.setData({
      region,
      regionText: region.join(' ')
    })
  },

  onAddressInput(e) {
    this.setData({
      address: e.detail.value
    })
  },

  async onSubmit() {
    if (this.data.submitting) {
      return
    }
    if (!this.data.nickname) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    this.setData({
      submitting: true
    })
    wx.showLoading({
      title: ''
    })

    try {
      let head = ''
      if (this.data.avatarTempFile) {
        const uploadRes = await network.xgwUploadImage(this.data.avatarTempFile, 1)
        if (!uploadRes || uploadRes.code !== 0 || !uploadRes.data) {
          wx.hideLoading()
          wx.showToast({
            title: (uploadRes && (uploadRes.message || uploadRes.msg)) || '头像上传失败',
            icon: 'none'
          })
          return
        }
        head = uploadRes.data
      }

      const payload = {
        nickname: this.data.nickname.trim(),
        sex: this.data.sex,
        birthday: this.data.birthdayDate ? toBirthdayTimestamp(this.data.birthdayDate) : '',
        age: this.data.age,
        height: this.data.height,
        weight: this.data.weight,
        provinceid: this.data.region[0] || '',
        cityid: this.data.region[1] || '',
        countyid: this.data.region[2] || '',
        address: this.data.address.trim()
      }
      if (head) {
        payload.head = head
      }

      const res = await network.xgwUserInfoUpdate(payload)
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '保存失败',
          icon: 'none'
        })
        return
      }

      xgwAuth.saveUserInfo({
        head: head || this.data.avatarUrl,
        nickname: this.data.nickname.trim()
      })
      xgwAuth.updateMineHome({
        head: head || this.data.avatarUrl,
        nickname: this.data.nickname.trim()
      })
      xgwLog.record('保存个人资料', this.data.nickname.trim())
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack({
          delta: 1
        })
      }, 250)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      this.setData({
        submitting: false,
        avatarTempFile: ''
      })
    }
  }
})
