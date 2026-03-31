const TOKEN_KEY = 'xgwToken'
const USER_KEY = 'xgwUserInfo'
const MINE_HOME_KEY = 'xgwMineHome'

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

function getUserInfo() {
  return wx.getStorageSync(USER_KEY) || {}
}

function getUserId() {
  const userInfo = getUserInfo()
  return userInfo && userInfo.userid ? userInfo.userid : ''
}

function getMobile() {
  const userInfo = getUserInfo()
  return userInfo && userInfo.mobile ? String(userInfo.mobile) : ''
}

function isWechatBound() {
  const userInfo = getUserInfo()
  return !!(userInfo && userInfo.wachat_openid)
}

function normalizeMineHome(data) {
  if (!data) {
    return null
  }
  return {
    head: data.head || '',
    nickname: data.nickname || '',
    association: data.association || '',
    fans: Number.isFinite(Number(data.fans)) ? Number(data.fans) : 0,
    follownumber: Number.isFinite(Number(data.follownumber)) ? Number(data.follownumber) : 0,
    money: data.money == null ? '0' : String(data.money),
    vouchers: data.vouchers == null ? '0' : String(data.vouchers),
    usertype: Number.isFinite(Number(data.usertype)) ? Number(data.usertype) : 3,
    isuserivip: Number.isFinite(Number(data.isuserivip)) ? Number(data.isuserivip) : 0,
    isshopvip: Number.isFinite(Number(data.isshopvip)) ? Number(data.isshopvip) : 0
  }
}

function getMineHome() {
  return wx.getStorageSync(MINE_HOME_KEY) || null
}

function saveMineHome(data) {
  const normalized = normalizeMineHome(data)
  if (!normalized) {
    return false
  }
  wx.setStorageSync(MINE_HOME_KEY, normalized)
  return true
}

function saveMineHomeFromLoginResult(res) {
  const data = res && res.data ? res.data : {}
  const user = data.user || {}
  const cachedMineHome = getMineHome() || {}
  return saveMineHome({
    association: cachedMineHome.association || '',
    follownumber: cachedMineHome.follownumber || 0,
    head: user.head,
    nickname: user.nickname,
    fans: user.fans,
    money: user.money,
    vouchers: user.vouchers,
    usertype: user.usertype,
    isuserivip: user.isuserivip,
    isshopvip: user.isshopvip
  })
}

function isLogined() {
  return !!(getToken() && getUserId())
}

function saveUserInfo(userInfo) {
  if (!userInfo || typeof userInfo !== 'object') {
    return false
  }
  const current = getUserInfo()
  wx.setStorageSync(USER_KEY, Object.assign({}, current, userInfo))
  return true
}

function updateMineHome(patch) {
  const current = getMineHome() || {}
  return saveMineHome(Object.assign({}, current, patch || {}))
}

function saveLoginResult(res) {
  const data = res && res.data ? res.data : {}
  const tokenInfo = data.token || {}
  const user = Object.assign({}, data.user || {})
  if (!user.userid && tokenInfo.userid) {
    user.userid = tokenInfo.userid
  }
  if (!tokenInfo.token || !user.userid) {
    return false
  }
  wx.setStorageSync(TOKEN_KEY, tokenInfo.token)
  wx.setStorageSync(USER_KEY, user)
  return true
}

function clearLogin() {
  wx.removeStorageSync(TOKEN_KEY)
  wx.removeStorageSync(USER_KEY)
  wx.removeStorageSync(MINE_HOME_KEY)
}

module.exports = {
  MINE_HOME_KEY,
  TOKEN_KEY,
  USER_KEY,
  getToken,
  getUserInfo,
  getUserId,
  getMobile,
  getMineHome,
  isLogined,
  isWechatBound,
  saveUserInfo,
  saveLoginResult,
  saveMineHome,
  saveMineHomeFromLoginResult,
  updateMineHome,
  clearLogin
}
