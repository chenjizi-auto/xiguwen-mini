const network = require('../../../api/network.js')
const AUTH = require('../../../utils/auth.js')
const xgwAuth = require('../../../utils/xgw-auth.js')
const xgwLog = require('../../../utils/xgw-log.js')

function maskMobile(mobile) {
  const text = mobile ? String(mobile) : ''
  return /^1\d{10}$/.test(text) ? `${text.slice(0, 3)}****${text.slice(7)}` : ''
}

Page({
  data: {
    mobile: '',
    mobileText: '未绑定',
    wechatBound: false,
    wechatText: '未绑定'
  },

  onShow() {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({
        url: '/pages/login/index'
      })
      return
    }
    this.refreshState()
  },

  refreshState() {
    const userInfo = xgwAuth.getUserInfo()
    const mobile = userInfo.mobile || ''
    const wechatBound = !!userInfo.wachat_openid
    this.setData({
      mobile,
      mobileText: mobile ? maskMobile(mobile) : '未绑定',
      wechatBound,
      wechatText: wechatBound ? '已绑定' : '未绑定'
    })
  },

  onPhoneTap() {
    wx.navigateTo({
      url: '/pages/settings/bind-phone/index'
    })
  },

  onWechatTap() {
    if (this.data.wechatBound) {
      wx.showToast({
        title: '当前微信已绑定',
        icon: 'none'
      })
      return
    }
    wx.login({
      success: async res => {
        if (!res.code) {
          wx.showToast({
            title: '获取微信授权失败',
            icon: 'none'
          })
          return
        }
        wx.showLoading({
          title: ''
        })
        try {
          const result = await network.xgwBindOther({
            thirdSystemId: res.code,
            type: 3
          })
          wx.hideLoading()
          if (!result || result.code !== 0) {
            wx.showToast({
              title: (result && (result.message || result.msg)) || '绑定失败',
              icon: 'none'
            })
            return
          }
          xgwAuth.saveUserInfo({
            wachat_openid: res.code
          })
          xgwLog.record('绑定微信账号', '设置页完成微信绑定')
          this.refreshState()
          wx.showToast({
            title: '绑定成功',
            icon: 'success'
          })
        } catch (err) {
          wx.hideLoading()
          wx.showToast({
            title: '绑定失败',
            icon: 'none'
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '获取微信授权失败',
          icon: 'none'
        })
      }
    })
  },

  onCancelTap() {
    wx.showModal({
      title: '注销账号',
      content: '账号注销后无法恢复，确认继续吗？',
      confirmText: '确认注销',
      confirmColor: '#e64340',
      success: res => {
        if (!res.confirm) {
          return
        }
        this.cancelAccount()
      }
    })
  },

  async cancelAccount() {
    wx.showLoading({
      title: ''
    })
    try {
      const res = await network.xgwUserCancel({
        userid: xgwAuth.getUserId(),
        status: '2'
      })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '注销失败',
          icon: 'none'
        })
        return
      }
      xgwLog.record('注销账号', `userid=${xgwAuth.getUserId()}`)
      xgwAuth.clearLogin()
      AUTH.loginOut()
      wx.showToast({
        title: '账号已注销',
        icon: 'success'
      })
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/login/index'
        })
      }, 250)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '注销失败',
        icon: 'none'
      })
    }
  }
})
