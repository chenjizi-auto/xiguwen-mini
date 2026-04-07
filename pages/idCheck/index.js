const xgwAuth = require('../../utils/xgw-auth.js')

function getUserType() {
  const mineHome = xgwAuth.getMineHome() || {}
  const userInfo = xgwAuth.getUserInfo() || {}
  const userType = Number(mineHome.usertype || userInfo.usertype || 3)
  return [1, 2, 3].includes(userType) ? userType : 3
}

Page({
  data: {
    userType: 3,
    typeList: []
  },

  onShow() {
    const userType = getUserType()
    const typeList = [
      {
        key: 'person',
        title: '个人认证',
        desc: '提交姓名、身份证和手持证件照进行审核',
        icon: '/images/mine/shimingrenzheng_icon.png'
      }
    ]

    if (userType === 1 || userType === 2) {
      typeList.push({
        key: 'company',
        title: '企业认证',
        desc: '提交法人身份信息与营业执照进行审核',
        icon: '/images/mine/dianpurenzheng_icon.png'
      })
    }

    this.setData({
      userType,
      typeList
    })
  },

  onChooseType(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    wx.navigateTo({
      url: `/pages/idCheck/${key}/index`
    })
  }
})
