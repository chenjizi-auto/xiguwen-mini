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

function uploadFile(url, filePath, formData = {}, fileFieldName = 'img') {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url,
      filePath,
      name: fileFieldName,
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

async function xgwHistoryCategoryList(data){
  return post(api.XgwHistoryCategoryList, data, false)
}

async function xgwHistoryList(data){
  return post(api.XgwHistoryList, data, false)
}

async function associationList(data){
  return post(api.AssociationList, data)
}

async function caseList(data){
  return post(api.CaseList, data)
}

async function xgwGetSuggestCount(data){
  return post(api.XgwGetSuggestCount, data, false)
}

async function xgwGetSuggestSubmit(data){
  return post(api.XgwGetSuggestSubmit, data, false)
}

async function cityList(data){
  return post(api.CityList, data, false)
}

async function xgwRegionList(data){
  return post(api.XgwRegionList, data, false)
}

async function searchIndex(data){
  return post(api.SearchIndex, data, false)
}

async function searchUniversal(data){
  return post(api.SearchUniversal, data, false)
}

async function mallMerchantSearch(data){
  return post(api.MallMerchantSearch, data, xgwAuth.isLogined())
}

async function xgwCaseSearch(data){
  return post(api.XgwCaseSearch, data, xgwAuth.isLogined())
}

async function weddingCartInfo(data){
  return post(api.WeddingCartInfo, data)
}

async function weddingCartRemove(data){
  return post(api.WeddingCartRemove, data)
}

async function weddingCartUpdate(data){
  return post(api.WeddingCartUpdate, data)
}

async function searchClearHistory(data){
  return post(api.SearchClearHistory, data, false)
}

async function discoverWedding(data){
  return post(api.DiscoverWedding, data)
}

async function discoverShops(data){
  return post(api.DiscoverShops, data)
}

async function xgwDynamicDetail(data, withAuth = xgwAuth.isLogined()){
  return post(api.DiscoverDetail, data, withAuth)
}

async function xgwDynamicComment(data){
  return post(api.DiscoverComment, data)
}

async function xgwDynamicLike(data){
  return post(api.DiscoverLike, data)
}

async function xgwDynamicDislike(data){
  return post(api.DiscoverDislike, data)
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
  return post(api.ActivityVoteUrl, data, false)
}

async function mineInvitationInfo(data){
  return post(api.MineInvitationInfo, data)
}

async function xgwInvitationList(data){
  return post(api.XgwInvitationList, data)
}

async function xgwInvitationUrl(data){
  return post(api.XgwInvitationUrl, data)
}

async function xgwInvitationDelete(data){
  return post(api.XgwInvitationDelete, data)
}

async function xgwInvitationDetail(data){
  return post(api.XgwInvitationDetail, data)
}

async function xgwInvitationTemplateTypes(data){
  return post(api.XgwInvitationTemplateTypes, data)
}

async function xgwInvitationTemplates(data){
  return post(api.XgwInvitationTemplates, data)
}

async function xgwInvitationCreate(data){
  return post(api.XgwInvitationCreate, data)
}

async function xgwInvitationEdit(data){
  return post(api.XgwInvitationEdit, data)
}

async function xgwInvitationShareSave(data){
  return post(api.XgwInvitationShareSave, data)
}

async function invitationFriend(data){
  return post(api.InvitationFriend, data)
}

async function weddingNewsList(data){
  return post(api.WeddingNewsList, data)
}

async function weddingOrderList(data){
  return post(api.WeddingOrderList, data)
}

async function weddingJiedanList(data){
  return post(api.WeddingJiedanList, data)
}

async function weddingOrderDetail(data){
  return post(api.WeddingOrderDetail, data)
}

async function weddingCancelOrder(data){
  return post(api.WeddingCancelOrder, data)
}

async function weddingFinishOrder(data){
  return post(api.WeddingFinishOrder, data)
}

async function weddingAcceptOrder(data){
  return post(api.WeddingAcceptOrder, data)
}

async function weddingRefuseOrder(data){
  return post(api.WeddingRefuseOrder, data)
}

async function weddingFinishOrderShop(data){
  return post(api.WeddingFinishOrderShop, data)
}

async function weddingAgreeRefund(data){
  return post(api.WeddingAgreeRefund, data)
}

async function weddingRefuseRefund(data){
  return post(api.WeddingRefuseRefund, data)
}

async function weddingCancelRefund(data){
  return post(api.WeddingCancelRefund, data)
}

async function weddingApplyRefund(data){
  return post(api.WeddingApplyRefund, data)
}

async function weddingRefundDetail(data){
  return post(api.WeddingRefundDetail, data)
}

async function weddingJiedanRefundDetail(data){
  return post(api.WeddingJiedanRefundDetail, data)
}

async function weddingModifyPrice(data){
  return post(api.WeddingModifyPrice, data)
}

async function weddingEvaluate(data){
  return post(api.WeddingEvaluate, data)
}

async function xgwUserInfo(data){
  return post(api.XgwUserInfo, data)
}

async function xgwUserInfoUpdate(data){
  return post(api.XgwUserInfoUpdate, data)
}

async function xgwMerchantHomeDetail(data, withAuth = xgwAuth.isLogined()){
  return post(api.XgwMerchantHomeDetail, data, withAuth)
}

async function xgwMerchantDetail(data){
  return post(api.XgwMerchantDetail, data, false)
}

async function xgwMerchantSchedule(data){
  return post(api.XgwMerchantSchedule, data, false)
}

async function xgwMerchantQuoteList(data){
  return post(api.XgwMerchantQuoteList, data, false)
}

async function xgwMerchantWorksList(data){
  return post(api.XgwMerchantWorksList, data, false)
}

async function xgwMerchantCommentList(data){
  return post(api.XgwMerchantCommentList, data, false)
}

async function xgwMerchantDynamic(data){
  return post(api.XgwMerchantDynamic, data, false)
}

async function xgwShopFollowAdd(data){
  return post(api.XgwShopFollowAdd, data)
}

async function xgwShopFollowDelete(data){
  return post(api.XgwShopFollowDelete, data)
}

async function xgwCaseFollowAdd(data){
  return post(api.XgwCaseFollowAdd, data)
}

async function xgwCaseFollowDelete(data){
  return post(api.XgwCaseFollowDelete, data)
}

async function xgwGetPersonCertification(data) {
  return post(api.XgwGetPersonCertification, data)
}

async function xgwSubmitPersonCertification(data) {
  return post(api.XgwSubmitPersonCertification, data)
}

async function xgwGetCompanyCertification(data) {
  return post(api.XgwGetCompanyCertification, data)
}

async function xgwSubmitCompanyCertification(data) {
  return post(api.XgwSubmitCompanyCertification, data)
}

async function xgwUploadImage(filePath, type = 1) {
  return uploadFile(api.XgwUploadImage, filePath, { type: String(type) })
}

async function xgwUploadVideo(filePath) {
  return uploadFile(api.XgwUploadVideo, filePath, {}, 'file')
}

async function xgwWeddingTypeList(data){
  return post(api.XgwWeddingTypeList, data, false)
}

async function xgwWeddingEnvironmentList(data){
  return post(api.XgwWeddingEnvironmentList, data, false)
}

async function xgwStoreInformation(data){
  return post(api.XgwStoreInformation, data)
}

async function xgwStoreInformationUpdate(data){
  return post(api.XgwStoreInformationUpdate, data)
}

async function xgwShopAuthInfo(data){
  return post(api.XgwShopAuthInfo, data)
}

async function xgwShopAuthSubmitInfo(data){
  return post(api.XgwShopAuthSubmitInfo, data)
}

async function xgwShopAuthSubmit(data){
  return post(api.XgwShopAuthSubmit, data)
}

async function xgwShopAuthResubmit(data){
  return post(api.XgwShopAuthResubmit, data)
}

async function xgwShopAuthOrder(data){
  return post(api.XgwShopAuthOrder, data)
}

async function xgwShopAuthRefund(data){
  return post(api.XgwShopAuthRefund, data)
}

async function xgwGradeList(data){
  return post(api.XgwGradeList, data)
}

async function xgwGradeAdd(data){
  return post(api.XgwGradeAdd, data)
}

async function xgwGradeDelete(data){
  return post(api.XgwGradeDelete, data)
}

async function xgwGradeUpdate(data){
  return post(api.XgwGradeUpdate, data)
}

async function xgwQuoteList(data){
  return post(api.XgwQuoteList, data)
}

async function xgwQuoteAdd(data){
  return post(api.XgwQuoteAdd, data)
}

async function xgwQuoteEdit(data){
  return post(api.XgwQuoteEdit, data)
}

async function xgwQuoteDetail(data){
  return post(api.XgwQuoteDetail, data)
}

async function xgwQuoteDelete(data){
  return post(api.XgwQuoteDelete, data)
}

async function xgwQuoteReason(data){
  return post(api.XgwQuoteReason, data)
}

async function xgwQuoteStatus(data){
  return post(api.XgwQuoteStatus, data)
}

async function xgwQuoteSubmit(data){
  return post(api.XgwQuoteSubmit, data)
}

async function xgwServiceCityList(data){
  return post(api.XgwServiceCityList, data)
}

async function xgwServiceCityAdd(data){
  return post(api.XgwServiceCityAdd, data)
}

async function xgwServiceCityDelete(data){
  return post(api.XgwServiceCityDelete, data)
}

async function xgwRecommendTeamList(data){
  return post(api.XgwRecommendTeamList, data)
}

async function xgwRecommendTeamAdd(data){
  return post(api.XgwRecommendTeamAdd, data)
}

async function xgwRecommendTeamDelete(data){
  return post(api.XgwRecommendTeamDelete, data)
}

async function xgwVideoList(data){
  return post(api.XgwVideoList, data)
}

async function xgwVideoDetail(data){
  return post(api.XgwVideoDetail, data)
}

async function xgwVideoAdd(data){
  return post(api.XgwVideoAdd, data)
}

async function xgwVideoEdit(data){
  return post(api.XgwVideoEdit, data)
}

async function xgwVideoDelete(data){
  return post(api.XgwVideoDelete, data)
}

async function xgwVideoReason(data){
  return post(api.XgwVideoReason, data)
}

async function xgwVideoSubmit(data){
  return post(api.XgwVideoSubmit, data)
}

async function xgwVideoStatus(data){
  return post(api.XgwVideoStatus, data)
}

async function xgwCaseList(data){
  return post(api.XgwCaseList, data)
}

async function xgwCaseDetail(data){
  return post(api.XgwCaseDetail, data)
}

async function xgwCasePriceDetail(data){
  return post(api.XgwCasePriceDetail, data, false)
}

async function xgwCaseAdd(data){
  return post(api.XgwCaseAdd, Object.assign({}, data || {}, {
    photourl: joinComma(data && data.photourl)
  }))
}

async function xgwCaseEdit(data){
  return post(api.XgwCaseEdit, Object.assign({}, data || {}, {
    photourl: joinComma(data && data.photourl)
  }))
}

async function xgwCaseDelete(data){
  return post(api.XgwCaseDelete, data)
}

async function xgwCaseReason(data){
  return post(api.XgwCaseReason, data)
}

async function xgwCaseSubmit(data){
  return post(api.XgwCaseSubmit, data)
}

async function xgwCaseStatus(data){
  return post(api.XgwCaseStatus, data)
}

async function xgwCommodityList(data){
  return post(api.XgwCommodityList, data)
}

async function xgwCommodityDetail(data){
  return post(api.XgwCommodityDetail, data)
}

async function xgwCommodityAdd(data){
  return post(api.XgwCommodityAdd, Object.assign({}, data || {}, {
    shopimg: joinComma(data && data.shopimg)
  }))
}

async function xgwCommodityEdit(data){
  return post(api.XgwCommodityEdit, Object.assign({}, data || {}, {
    shopimg: joinComma(data && data.shopimg)
  }))
}

async function xgwCommodityDelete(data){
  return post(api.XgwCommodityDelete, data)
}

async function xgwCommodityReason(data){
  return post(api.XgwCommodityReason, data)
}

async function xgwCommodityStatus(data){
  return post(api.XgwCommodityStatus, data)
}

async function xgwCommodityTypeParent(data){
  return post(api.XgwCommodityTypeParent, data, false)
}

async function xgwCommodityTypeChild(data){
  return post(api.XgwCommodityTypeChild, data, false)
}

async function xgwCommodityFreightList(data){
  return post(api.XgwCommodityFreightList, data)
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

async function xgwMyNeedList(data){
  return post(api.XgwMyNeedList, data)
}

async function xgwCloseMyNeed(data){
  return post(api.XgwCloseMyNeed, data)
}

async function xgwDeleteMyNeed(data){
  return post(api.XgwDeleteMyNeed, data)
}

async function xgwMyNeedDetail(data){
  return post(api.XgwMyNeedDetail, data)
}

async function xgwAddNeed(data){
  return post(api.XgwAddNeed, data)
}

async function xgwEditNeed(data){
  return post(api.XgwEditNeed, data)
}

async function xgwNeedJoinDetail(data){
  return post(api.XgwNeedJoinDetail, data)
}

async function xgwNeedCooperation(data){
  return post(api.XgwNeedCooperation, data)
}

async function xgwOtherNeedList(data){
  return post(api.XgwOtherNeedList, data)
}

async function xgwTakeNeedOrder(data){
  return post(api.XgwTakeNeedOrder, data)
}

async function xgwCommunityCenter(data){
  return post(api.XgwCommunityCenter, data)
}

async function xgwCommunityJoinList(data){
  return post(api.XgwCommunityJoinList, data)
}

async function xgwCommunityJoinApply(data){
  return post(api.XgwCommunityJoinApply, data)
}

async function xgwCommunityOut(data){
  return post(api.XgwCommunityOut, data)
}

async function xgwCommunityCreate(data){
  return post(api.XgwCommunityCreate, data)
}

async function xgwCommunityDetail(data){
  return post(api.XgwCommunityDetail, data)
}

async function xgwCommunityManagerList(data){
  return post(api.XgwCommunityManagerList, data)
}

async function xgwCommunityManagerSetAdmin(data){
  return post(api.XgwCommunityManagerSetAdmin, data)
}

async function xgwCommunityManagerCancelAdmin(data){
  return post(api.XgwCommunityManagerCancelAdmin, data)
}

async function xgwCommunityManagerDelete(data){
  return post(api.XgwCommunityManagerDelete, data)
}

async function xgwCommunityPendingList(data){
  return post(api.XgwCommunityPendingList, data)
}

async function xgwCommunityPendingAgree(data){
  return post(api.XgwCommunityPendingAgree, data)
}

async function xgwCommunityPendingRefuse(data){
  return post(api.XgwCommunityPendingRefuse, data)
}

async function xgwCommunityInviteList(data){
  return post(api.XgwCommunityInviteList, data)
}

async function xgwCommunityInviteSend(data){
  return post(api.XgwCommunityInviteSend, data)
}

async function xgwCommunitySchedule(data){
  return post(api.XgwCommunitySchedule, data)
}

async function xgwCommunityTodayNew(data){
  return post(api.XgwCommunityTodayNew, data)
}

async function xgwCommunityTodayOrder(data){
  return post(api.XgwCommunityTodayOrder, data)
}

async function xgwMarriageRegistry(data){
  return post(api.XgwMarriageRegistry, data, false)
}

async function xgwUserVipInfo(data){
  return post(api.XgwUserVipInfo, data)
}

async function xgwShopVipInfo(data){
  return post(api.XgwShopVipInfo, data)
}

async function xgwUserVipPay(data){
  return post(api.XgwUserVipPay, data)
}

async function xgwShopVipPay(data){
  return post(api.XgwShopVipPay, data)
}

async function xgwInviteShopInfo(data){
  return post(api.XgwInviteShopInfo, data)
}

async function xgwApplyShop(data){
  return post(api.XgwApplyShop, data)
}

async function xgwChargePay(data){
  return post(api.XgwChargePay, data)
}

async function xgwWeddingFlowList(data){
  return post(api.XgwWeddingFlowList, data)
}

async function xgwWeddingFlowAdd(data){
  return post(api.XgwWeddingFlowAdd, data)
}

async function xgwWeddingFlowEdit(data){
  return post(api.XgwWeddingFlowEdit, data)
}

async function xgwWeddingFlowDelete(data){
  return post(api.XgwWeddingFlowDelete, data)
}

async function xgwBillList(data){
  return post(api.XgwBillList, data)
}

async function xgwBillAdd(data){
  return post(api.XgwBillAdd, data)
}

async function xgwBillEdit(data){
  return post(api.XgwBillEdit, data)
}

async function xgwBillDelete(data){
  return post(api.XgwBillDelete, data)
}

async function xgwSpeechList(data){
  return post(api.XgwSpeechList, data)
}

async function xgwSpeechAdd(data){
  return post(api.XgwSpeechAdd, data)
}

async function xgwSpeechEdit(data){
  return post(api.XgwSpeechEdit, data)
}

async function xgwSpeechDelete(data){
  return post(api.XgwSpeechDelete, data)
}

async function xgwScheduleList(data){
  return post(api.XgwScheduleList, data)
}

async function xgwScheduleAdd(data){
  return post(api.XgwScheduleAdd, data)
}

async function xgwScheduleEdit(data){
  return post(api.XgwScheduleEdit, data)
}

async function xgwScheduleDelete(data){
  return post(api.XgwScheduleDelete, data)
}

async function xgwScheduleStatus(data){
  return post(api.XgwScheduleStatus, data)
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
  xgwHistoryCategoryList,
  xgwHistoryList,
  associationList,
  caseList,
  xgwGetSuggestCount,
  xgwGetSuggestSubmit,
  cityList,
  xgwRegionList,
  searchIndex,
  searchUniversal,
  mallMerchantSearch,
  xgwCaseSearch,
  weddingCartInfo,
  weddingCartRemove,
  weddingCartUpdate,
  searchClearHistory,
  discoverWedding,
  discoverShops,
  xgwDynamicDetail,
  xgwDynamicComment,
  xgwDynamicLike,
  xgwDynamicDislike,
  myHomeIndex,
  myFansList,
  myAttentionList,
  xgwBankBalance,
  xgwBankSchedule,
  activityVoteUrl,
  mineInvitationInfo,
  xgwInvitationList,
  xgwInvitationUrl,
  xgwInvitationDelete,
  xgwInvitationDetail,
  xgwInvitationTemplateTypes,
  xgwInvitationTemplates,
  xgwInvitationCreate,
  xgwInvitationEdit,
  xgwInvitationShareSave,
  invitationFriend,
  weddingNewsList,
  weddingOrderList,
  weddingJiedanList,
  weddingOrderDetail,
  weddingCancelOrder,
  weddingFinishOrder,
  weddingAcceptOrder,
  weddingRefuseOrder,
  weddingFinishOrderShop,
  weddingAgreeRefund,
  weddingRefuseRefund,
  weddingCancelRefund,
  weddingApplyRefund,
  weddingRefundDetail,
  weddingJiedanRefundDetail,
  weddingModifyPrice,
  weddingEvaluate,
  xgwUserInfo,
  xgwUserInfoUpdate,
  xgwMerchantHomeDetail,
  xgwMerchantDetail,
  xgwMerchantSchedule,
  xgwMerchantQuoteList,
  xgwMerchantWorksList,
  xgwMerchantCommentList,
  xgwMerchantDynamic,
  xgwShopFollowAdd,
  xgwShopFollowDelete,
  xgwCaseFollowAdd,
  xgwCaseFollowDelete,
  xgwGetPersonCertification,
  xgwSubmitPersonCertification,
  xgwGetCompanyCertification,
  xgwSubmitCompanyCertification,
  xgwUploadImage,
  xgwUploadVideo,
  xgwWeddingTypeList,
  xgwWeddingEnvironmentList,
  xgwStoreInformation,
  xgwStoreInformationUpdate,
  xgwShopAuthInfo,
  xgwShopAuthSubmitInfo,
  xgwShopAuthSubmit,
  xgwShopAuthResubmit,
  xgwShopAuthOrder,
  xgwShopAuthRefund,
  xgwGradeList,
  xgwGradeAdd,
  xgwGradeDelete,
  xgwGradeUpdate,
  xgwQuoteList,
  xgwQuoteAdd,
  xgwQuoteEdit,
  xgwQuoteDetail,
  xgwQuoteDelete,
  xgwQuoteReason,
  xgwQuoteStatus,
  xgwQuoteSubmit,
  xgwServiceCityList,
  xgwServiceCityAdd,
  xgwServiceCityDelete,
  xgwRecommendTeamList,
  xgwRecommendTeamAdd,
  xgwRecommendTeamDelete,
  xgwVideoList,
  xgwVideoDetail,
  xgwVideoAdd,
  xgwVideoEdit,
  xgwVideoDelete,
  xgwVideoReason,
  xgwVideoSubmit,
  xgwVideoStatus,
  xgwCaseList,
  xgwCaseDetail,
  xgwCasePriceDetail,
  xgwCaseAdd,
  xgwCaseEdit,
  xgwCaseDelete,
  xgwCaseReason,
  xgwCaseSubmit,
  xgwCaseStatus,
  xgwCommodityList,
  xgwCommodityDetail,
  xgwCommodityAdd,
  xgwCommodityEdit,
  xgwCommodityDelete,
  xgwCommodityReason,
  xgwCommodityStatus,
  xgwCommodityTypeParent,
  xgwCommodityTypeChild,
  xgwCommodityFreightList,
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
  xgwMyNeedList,
  xgwCloseMyNeed,
  xgwDeleteMyNeed,
  xgwMyNeedDetail,
  xgwAddNeed,
  xgwEditNeed,
  xgwNeedJoinDetail,
  xgwNeedCooperation,
  xgwOtherNeedList,
  xgwTakeNeedOrder,
  xgwCommunityCenter,
  xgwCommunityJoinList,
  xgwCommunityJoinApply,
  xgwCommunityOut,
  xgwCommunityCreate,
  xgwCommunityDetail,
  xgwCommunityManagerList,
  xgwCommunityManagerSetAdmin,
  xgwCommunityManagerCancelAdmin,
  xgwCommunityManagerDelete,
  xgwCommunityPendingList,
  xgwCommunityPendingAgree,
  xgwCommunityPendingRefuse,
  xgwCommunityInviteList,
  xgwCommunityInviteSend,
  xgwCommunitySchedule,
  xgwCommunityTodayNew,
  xgwCommunityTodayOrder,
  xgwMarriageRegistry,
  xgwUserVipInfo,
  xgwShopVipInfo,
  xgwUserVipPay,
  xgwShopVipPay,
  xgwInviteShopInfo,
  xgwApplyShop,
  xgwChargePay,
  xgwWeddingFlowList,
  xgwWeddingFlowAdd,
  xgwWeddingFlowEdit,
  xgwWeddingFlowDelete,
  xgwBillList,
  xgwBillAdd,
  xgwBillEdit,
  xgwBillDelete,
  xgwSpeechList,
  xgwSpeechAdd,
  xgwSpeechEdit,
  xgwSpeechDelete,
  xgwScheduleList,
  xgwScheduleAdd,
  xgwScheduleEdit,
  xgwScheduleDelete,
  xgwScheduleStatus,
  xgwBindOther,
  xgwUserCancel
}
