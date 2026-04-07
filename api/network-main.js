const Network = require('miniprogram-network')
const api = require('./main-api.js')
const xgwAuth = require('../utils/xgw-auth.js')

Network.setConfig('baseURL', 'https://www.xiguwen520.com')
Network.REQUEST.Defaults.transformResponse = Network.transformRequestResponseOkData

function commonParam() {
  return {
    token: xgwAuth.getToken(),
    userid: xgwAuth.getUserId()
  }
}

function post(url, data, withAuth = true) {
  const params = withAuth ? Object.assign({}, data || {}, commonParam()) : (data || {})
  return new Promise((resolve, reject) => {
    Network.post(url, params).then(resolve).catch(reject)
  })
}

async function loginThrid(data) {
  return post(api.AuthLoginByWeixin, data, false)
}

async function accountLogin(data) {
  return post(api.AuthLogin, data, false)
}

async function mainPage(data) {
  return post(api.IndexUrl, data)
}

async function homeCategory(data) {
  return post(api.HomeCategory, data)
}

async function associationList(data) {
  return post(api.AssociationList, data)
}

async function caseList(data) {
  return post(api.CaseList, data)
}

async function cityList(data) {
  return post(api.CityList, data, false)
}

async function searchIndex(data) {
  return post(api.SearchIndex, data, false)
}

async function searchClearHistory(data) {
  return post(api.SearchClearHistory, data, false)
}

async function searchUniversal(data) {
  return post(api.SearchUniversal, data, false)
}

async function discoverWedding(data) {
  return post(api.DiscoverWedding, data)
}

async function discoverShops(data) {
  return post(api.DiscoverShops, data)
}

async function myHomeIndex(data) {
  return post(api.MyHomeIndex, data)
}

async function mallMerchantSearch(data) {
  return post(api.XgwMerchantSearch, data, xgwAuth.isLogined())
}

async function xgwShopFollowAdd(data) {
  return post(api.XgwShopFollowAdd, data)
}

async function xgwShopFollowDelete(data) {
  return post(api.XgwShopFollowDelete, data)
}

async function weddingCartInfo(data) {
  return post(api.WeddingCartInfo, data)
}

async function weddingCartRemove(data) {
  return post(api.WeddingCartRemove, data)
}

async function weddingCartUpdate(data) {
  return post(api.WeddingCartUpdate, data)
}

module.exports = {
  loginThrid,
  accountLogin,
  mainPage,
  homeCategory,
  associationList,
  caseList,
  cityList,
  searchIndex,
  searchClearHistory,
  searchUniversal,
  discoverWedding,
  discoverShops,
  myHomeIndex,
  mallMerchantSearch,
  xgwShopFollowAdd,
  xgwShopFollowDelete,
  weddingCartInfo,
  weddingCartRemove,
  weddingCartUpdate
}
