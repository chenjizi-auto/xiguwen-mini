Page({
  onLoad() {
    wx.setNavigationBarTitle({
      title: '我的社团'
    })
  },

  onCreateTap() {
    wx.navigateTo({
      url: '/pages/my/team/create'
    })
  },

  onJoinTap() {
    wx.navigateTo({
      url: '/pages/my/team/join'
    })
  }
})
