const Network = require('miniprogram-network');
// 也可使用 es6 import 写法
// setConfig设置所有网络请求的全局默认配置,一次定义，所有文件中使用均生效
Network.setConfig('baseURL','https://www.xiguwen520.com')
Network.REQUEST.Defaults.transformResponse = Network.transformRequestResponseOkData

const api = require('./api.js');
const xgwAuth = require('../utils/xgw-auth.js')

function commonParam(){
  return {
    token: xgwAuth.getToken(),
    userid: xgwAuth.getUserId()
  }
}

function post(url, data, withAuth = true) {
  const params = withAuth ? Object.assign({}, data || {}, commonParam()) : (data || {})
  return new Promise((resolve, reject) => {
    Network.post(url, params).then(res => {
      resolve(res)
    }).catch(err => {
      reject(err)
    })
  })
}

function joinComma(values) {
  if (Array.isArray(values)) {
    return values.filter(Boolean).join(',')
  }
  return values || ''
}

function uploadFile(url, filePath, formData = {}) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url,
      filePath,
      name: 'img',
      formData,
      success: res => {
        try {
          const data = JSON.parse(res.data || '{}')
          resolve(data)
        } catch (err) {
          reject(err)
        }
      },
      fail: reject
    })
  })
}

function utf8ToArrayBuffer(text = '') {
  const encoded = unescape(encodeURIComponent(String(text)))
  const array = new Uint8Array(encoded.length)
  for (let i = 0; i < encoded.length; i += 1) {
    array[i] = encoded.charCodeAt(i)
  }
  return array.buffer
}

function concatArrayBuffers(buffers) {
  const totalLength = (buffers || []).reduce((sum, item) => {
    if (!item) return sum
    return sum + (item.byteLength || 0)
  }, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  ;(buffers || []).forEach(item => {
    if (!item) return
    const view = item instanceof Uint8Array ? item : new Uint8Array(item)
    result.set(view, offset)
    offset += view.byteLength
  })
  return result.buffer
}

function getMimeType(filePath = '') {
  const ext = String(filePath).split('.').pop().toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'heic') return 'image/heic'
  return 'image/jpeg'
}

function getFileName(filePath = '', index = 0) {
  const parts = String(filePath).split('/')
  const fileName = parts[parts.length - 1]
  return fileName || `image_${index}.jpg`
}

function readFileAsArrayBuffer(filePath) {
  const fs = wx.getFileSystemManager()
  return new Promise((resolve, reject) => {
    fs.readFile({
      filePath,
      success: res => resolve(res.data),
      fail: reject
    })
  })
}

async function multipartRequest(url, fields = {}, files = [], fileFieldName = 'file') {
  const boundary = `----xgw-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const chunks = []

  Object.keys(fields || {}).forEach(key => {
    const value = fields[key] == null ? '' : String(fields[key])
    chunks.push(
      utf8ToArrayBuffer(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
          `${value}\r\n`
      )
    )
  })

  for (let i = 0; i < files.length; i += 1) {
    const filePath = files[i]
    if (!filePath) continue
    const fileData = await readFileAsArrayBuffer(filePath)
    chunks.push(
      utf8ToArrayBuffer(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${fileFieldName}"; filename="${getFileName(filePath, i)}"\r\n` +
          `Content-Type: ${getMimeType(filePath)}\r\n\r\n`
      )
    )
    chunks.push(fileData)
    chunks.push(utf8ToArrayBuffer('\r\n'))
  }

  chunks.push(utf8ToArrayBuffer(`--${boundary}--\r\n`))

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'POST',
      data: concatArrayBuffers(chunks),
      header: {
        'content-type': `multipart/form-data; boundary=${boundary}`
      },
      success: res => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data || '{}') : res.data
          resolve(data)
        } catch (err) {
          reject(err)
        }
      },
      fail: reject
    })
  })
}

async function loginThrid(data){
  return post(api.AuthLoginByWeixin, data, false)
}

async function accountLogin(data) {
  return post(api.AuthLogin, data, false)
}

async function mainPage(data){
  return post(api.IndexUrl, data)
}

async function homeCategory(data){
  return post(api.HomeCategory, data)
}

async function associationList(data){
  return post(api.AssociationList, data)
}

async function caseList(data){
  return post(api.CaseList, data)
}

async function cityList(data){
  return post(api.CityList, data, false)
}

async function discoverWedding(data){
  return post(api.DiscoverWedding, data)
}

async function discoverShops(data){
  return post(api.DiscoverShops, data)
}

async function myHomeIndex(data){
  return post(api.MyHomeIndex, data)
}

async function myFansList(data){
  return post(api.MyFansList, data)
}

async function myAttentionList(data){
  return post(api.MyAttentionList, data)
}

async function xgwBankBalance(data){
  return post(api.XgwBankBalance, data)
}

async function xgwBankSchedule(data){
  return post(api.XgwBankSchedule, data)
}

async function activityVoteUrl(data){
  return post(api.ActivityVoteUrl, data)
}

async function xgwUserInfo(data){
  return post(api.XgwUserInfo, data)
}

async function xgwUserInfoUpdate(data){
  return post(api.XgwUserInfoUpdate, data)
}

async function xgwUploadImage(filePath, type = 1) {
  return uploadFile(api.XgwUploadImage, filePath, { type: String(type) })
}

async function xgwDynamicPublish(content, filePaths = []) {
  return multipartRequest(
    api.DiscoverPublish,
    {
      token: xgwAuth.getToken(),
      userid: xgwAuth.getUserId(),
      content: content || ''
    },
    filePaths,
    'photourl[]'
  )
}

async function xgwAtlasList(data){
  return post(api.XgwAtlasList, data)
}

async function xgwAtlasDetail(data){
  return post(api.XgwAtlasDetail, data)
}

async function xgwAtlasAdd(data){
  return post(api.XgwAtlasAdd, Object.assign({}, data || {}, {
    photo: joinComma(data && data.photo)
  }))
}

async function xgwAtlasEdit(data){
  return post(api.XgwAtlasEdit, Object.assign({}, data || {}, {
    photo: joinComma(data && data.photo)
  }))
}

async function xgwAtlasDelete(data){
  return post(api.XgwAtlasDelete, data)
}

async function xgwAtlasReason(data){
  return post(api.XgwAtlasReason, data)
}

async function xgwAtlasStatus(data){
  return post(api.XgwAtlasStatus, data)
}

async function xgwAtlasSubmit(data){
  return post(api.XgwAtlasSubmit, data)
}

async function xgwAddressList(data){
  return post(api.XgwAddressList, data)
}

async function xgwAddressAdd(data){
  return post(api.XgwAddressAdd, data)
}

async function xgwAddressUpdate(data){
  return post(api.XgwAddressUpdate, data)
}

async function xgwAddressDelete(data){
  return post(api.XgwAddressDelete, data)
}

async function xgwAddressDefault(data){
  return post(api.XgwAddressDefault, data)
}

async function xgwGetVerifyCode(data, withAuth = false){
  return post(api.XgwGetVerifyCode, data, withAuth)
}

async function xgwPasswordVerify(data){
  return post(api.XgwPasswordVerify, data)
}

async function xgwPasswordReset(data){
  return post(api.XgwPasswordReset, data)
}

async function xgwPayPasswordReset(data){
  return post(api.XgwPayPasswordReset, data)
}

async function xgwPhoneVerify(data){
  return post(api.XgwPhoneVerify, data)
}

async function xgwPhoneUpdate(data){
  return post(api.XgwPhoneUpdate, data)
}

async function xgwBindOther(data){
  return post(api.XgwBindOther, data)
}

async function xgwUserCancel(data){
  return post(api.XgwUserCancel, data, false)
}

module.exports = {
  loginThrid,
  accountLogin,
  mainPage,
  homeCategory,
  associationList,
  caseList,
  cityList,
  discoverWedding,
  discoverShops,
  myHomeIndex,
  myFansList,
  myAttentionList,
  xgwBankBalance,
  xgwBankSchedule,
  activityVoteUrl,
  xgwUserInfo,
  xgwUserInfoUpdate,
  xgwUploadImage,
  xgwDynamicPublish,
  xgwAtlasList,
  xgwAtlasDetail,
  xgwAtlasAdd,
  xgwAtlasEdit,
  xgwAtlasDelete,
  xgwAtlasReason,
  xgwAtlasStatus,
  xgwAtlasSubmit,
  xgwAddressList,
  xgwAddressAdd,
  xgwAddressUpdate,
  xgwAddressDelete,
  xgwAddressDefault,
  xgwGetVerifyCode,
  xgwPasswordVerify,
  xgwPasswordReset,
  xgwPayPasswordReset,
  xgwPhoneVerify,
  xgwPhoneUpdate,
  xgwBindOther,
  xgwUserCancel
}
