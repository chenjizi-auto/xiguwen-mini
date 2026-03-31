const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')
const xgwLog = require('../../../utils/xgw-log.js')

function parseAddress(options) {
  if (!options || !options.data) {
    return null
  }
  try {
    return JSON.parse(decodeURIComponent(options.data))
  } catch (err) {
    return null
  }
}

function buildRegionText(region) {
  return (region || []).filter(Boolean).join(' ')
}

Page({
  data: {
    isEdit: false,
    id: '',
    username: '',
    mobile: '',
    region: [],
    regionText: '',
    site: '',
    hot: false,
    submitting: false
  },

  onLoad(options) {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({
        url: '/pages/login/index'
      })
      return
    }
    const item = parseAddress(options)
    if (!item) {
      return
    }
    const region = [item.province || '', item.city || '', item.county || ''].filter(Boolean)
    this.setData({
      isEdit: true,
      id: item.id || '',
      username: item.username || '',
      mobile: item.mobile || '',
      region,
      regionText: buildRegionText(region),
      site: item.site || '',
      hot: Number(item.hot) === 1
    })
    wx.setNavigationBarTitle({
      title: '修改收货地址'
    })
  },

  onNameInput(e) {
    this.setData({
      username: e.detail.value
    })
  },

  onMobileInput(e) {
    this.setData({
      mobile: e.detail.value.replace(/\D/g, '').slice(0, 11)
    })
  },

  onSiteInput(e) {
    this.setData({
      site: e.detail.value
    })
  },

  onRegionChange(e) {
    const region = e.detail.value || []
    this.setData({
      region,
      regionText: buildRegionText(region)
    })
  },

  onDefaultChange(e) {
    this.setData({
      hot: !!e.detail.value
    })
  },

  async onSubmit() {
    if (this.data.submitting) {
      return
    }
    if (!this.data.username || !/^1\d{10}$/.test(this.data.mobile) || this.data.region.length !== 3 || !this.data.site) {
      wx.showToast({
        title: '请填写完整且正确的信息',
        icon: 'none'
      })
      return
    }

    const payload = {
      username: this.data.username.trim(),
      mobile: this.data.mobile,
      provinceid: this.data.region[0],
      cityid: this.data.region[1],
      countyid: this.data.region[2],
      site: this.data.site.trim(),
      hot: this.data.hot ? '1' : '0'
    }

    if (this.data.isEdit) {
      payload.id = this.data.id
    }

    this.setData({
      submitting: true
    })
    wx.showLoading({
      title: ''
    })

    try {
      const res = this.data.isEdit
        ? await network.xgwAddressUpdate(payload)
        : await network.xgwAddressAdd(payload)
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '保存失败',
          icon: 'none'
        })
        return
      }
      xgwLog.record(this.data.isEdit ? '修改收货地址' : '新增收货地址', payload.username)
      wx.showToast({
        title: this.data.isEdit ? '修改成功' : '添加成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack({
          delta: 1
        })
      }, 200)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      this.setData({
        submitting: false
      })
    }
  }
})
