const network = require('../../../api/network.js')

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function getErrorMessage(res, fallback = '加载失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

function getRoleText(role) {
  if (role === 1) return '创始人'
  if (role === 2) return '管理员'
  return '成员'
}

function normalizeUser(item) {
  const role = asNumber(item && item.jiaose, 3)
  return {
    id: safeText(item && item.id),
    userId: asNumber(item && item.userid, 0),
    head: safeText(item && item.head),
    nickname: safeText(item && item.nickname, '未命名用户'),
    occupation: safeText(item && item.occupationid, '未设置职业'),
    address: safeText(item && item.dizhi, '未设置地区'),
    role,
    roleText: getRoleText(role)
  }
}

Page({
  data: {
    id: '',
    myRole: 3,
    loading: true,
    submittingId: '',
    keyword: '',
    list: [],
    errorText: ''
  },

  onLoad(options) {
    this.setData({
      id: safeText(options && options.id),
      myRole: asNumber(options && options.role, 3)
    })
    wx.setNavigationBarTitle({
      title: '成员管理'
    })
    this.fetchList()
  },

  onPullDownRefresh() {
    this.fetchList().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onSearchChange(e) {
    this.setData({
      keyword: safeText(e.detail)
    })
  },

  onSearch() {
    this.fetchList()
  },

  async fetchList() {
    if (!this.data.id) {
      this.setData({
        loading: false,
        errorText: '团队参数有误'
      })
      return
    }
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const res = await network.xgwCommunityManagerList({
        id: this.data.id,
        name: this.data.keyword.trim()
      })
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res))
      }
      const list = Array.isArray(res.data) ? res.data : []
      this.setData({
        loading: false,
        list: list.map(normalizeUser)
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载失败，请稍后重试',
        list: []
      })
    }
  },

  canSetAdmin(item) {
    return this.data.myRole === 1 && item.role === 3
  },

  canCancelAdmin(item) {
    return this.data.myRole === 1 && item.role === 2
  },

  canRemove(item) {
    if (this.data.myRole === 1) {
      return item.role !== 1
    }
    if (this.data.myRole === 2) {
      return item.role === 3
    }
    return false
  },

  async onSetAdminTap(e) {
    const id = safeText(e.currentTarget.dataset.id)
    const index = asNumber(e.currentTarget.dataset.index, -1)
    const item = this.data.list[index]
    if (!id || !item || !this.canSetAdmin(item) || this.data.submittingId) return

    await this.runUpdate(id, 'setAdmin', index)
  },

  async onCancelAdminTap(e) {
    const id = safeText(e.currentTarget.dataset.id)
    const index = asNumber(e.currentTarget.dataset.index, -1)
    const item = this.data.list[index]
    if (!id || !item || !this.canCancelAdmin(item) || this.data.submittingId) return

    await this.runUpdate(id, 'cancelAdmin', index)
  },

  async onDeleteTap(e) {
    const id = safeText(e.currentTarget.dataset.id)
    const index = asNumber(e.currentTarget.dataset.index, -1)
    const item = this.data.list[index]
    if (!id || !item || !this.canRemove(item) || this.data.submittingId) return

    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '确定移除该成员吗？',
        content: '移除后该成员将退出当前社团。',
        success: res => resolve(!!res.confirm),
        fail: () => resolve(false)
      })
    })
    if (!confirmed) return

    await this.runUpdate(id, 'delete', index)
  },

  async runUpdate(id, type, index) {
    const item = this.data.list[index]
    if (!item) return
    this.setData({ submittingId: id })
    try {
      let request = null
      let successText = '操作成功'
      if (type === 'setAdmin') {
        request = network.xgwCommunityManagerSetAdmin
        successText = '已设为管理员'
      } else if (type === 'cancelAdmin') {
        request = network.xgwCommunityManagerCancelAdmin
        successText = '已取消管理员'
      } else {
        request = network.xgwCommunityManagerDelete
        successText = '已移除成员'
      }
      const res = await request({ id })
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res, '操作失败'))
      }
      const list = this.data.list.slice()
      if (type === 'setAdmin') {
        list[index] = Object.assign({}, item, { role: 2, roleText: '管理员' })
      } else if (type === 'cancelAdmin') {
        list[index] = Object.assign({}, item, { role: 3, roleText: '成员' })
      } else {
        list.splice(index, 1)
      }
      this.setData({ list })
      wx.showToast({
        title: successText,
        icon: 'success'
      })
    } catch (err) {
      wx.showToast({
        title: err && err.message ? err.message : '操作失败',
        icon: 'none'
      })
    } finally {
      this.setData({ submittingId: '' })
    }
  }
})
