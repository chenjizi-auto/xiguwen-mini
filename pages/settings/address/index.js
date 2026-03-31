const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')
const xgwLog = require('../../../utils/xgw-log.js')

Page({
  data: {
    loading: false,
    manageMode: false,
    list: []
  },

  onShow() {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({
        url: '/pages/login/index'
      })
      return
    }
    this.loadList()
  },

  onManageTap() {
    this.setData({
      manageMode: !this.data.manageMode
    })
  },

  async loadList() {
    this.setData({
      loading: true
    })
    try {
      const res = await network.xgwAddressList({})
      this.setData({
        list: res && res.code === 0 && Array.isArray(res.data) ? res.data : []
      })
    } catch (err) {
      wx.showToast({
        title: '加载地址失败',
        icon: 'none'
      })
    } finally {
      this.setData({
        loading: false
      })
    }
  },

  onAddTap() {
    wx.navigateTo({
      url: '/pages/settings/address-edit/index'
    })
  },

  onEditTap(e) {
    const item = this.getItemByIndex(e)
    if (!item) {
      return
    }
    wx.navigateTo({
      url: `/pages/settings/address-edit/index?data=${encodeURIComponent(JSON.stringify(item))}`
    })
  },

  onSetDefaultTap(e) {
    const item = this.getItemByIndex(e)
    if (!item || Number(item.hot) === 1) {
      return
    }
    wx.showLoading({
      title: ''
    })
    network.xgwAddressDefault({
      id: item.id
    }).then(res => {
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '设置失败',
          icon: 'none'
        })
        return
      }
      xgwLog.record('设置默认收货地址', `${item.username || ''} ${item.mobile || ''}`.trim())
      this.loadList()
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({
        title: '设置失败',
        icon: 'none'
      })
    })
  },

  onDeleteTap(e) {
    const item = this.getItemByIndex(e)
    if (!item) {
      return
    }
    wx.showModal({
      title: '删除地址',
      content: '确认删除这条收货地址吗？',
      confirmColor: '#e64340',
      success: res => {
        if (!res.confirm) {
          return
        }
        wx.showLoading({
          title: ''
        })
        network.xgwAddressDelete({
          id: item.id
        }).then(result => {
          wx.hideLoading()
          if (!result || result.code !== 0) {
            wx.showToast({
              title: (result && (result.message || result.msg)) || '删除失败',
              icon: 'none'
            })
            return
          }
          xgwLog.record('删除收货地址', `${item.username || ''} ${item.mobile || ''}`.trim())
          this.loadList()
        }).catch(() => {
          wx.hideLoading()
          wx.showToast({
            title: '删除失败',
            icon: 'none'
          })
        })
      }
    })
  },

  getItemByIndex(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (!Number.isInteger(index) || index < 0) {
      return null
    }
    return this.data.list[index] || null
  }
})
