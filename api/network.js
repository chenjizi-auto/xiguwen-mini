const Network = require('miniprogram-network');
// 也可使用 es6 import 写法
// setConfig设置所有网络请求的全局默认配置,一次定义，所有文件中使用均生效
Network.setConfig('baseURL','https://www.xiguwen520.com')
Network.REQUEST.Defaults.transformResponse = Network.transformRequestResponseOkData

const api = require('/api.js');

function commonParam(){
  const userInfo = wx.getStorageSync('userInfo') || {}
  return {'token':wx.getStorageSync('token'),'userid':userInfo.userid}
}

export async function loginThrid(data){
  return new Promise((resolve, reject) => {
        Network.post(api.AuthLoginByWeixin,Object.assign(data,commonParam)).then (res=>{
            resolve(res);
        })
  })
}

export async function mainPage(data){
  return new Promise((resolve, reject) => {
        Network.post(api.IndexUrl,Object.assign(data,commonParam)).then (res=>{
            resolve(res);
        })
  })
}

export async function homeCategory(data){
  return new Promise((resolve, reject) => {
        Network.post(api.HomeCategory,Object.assign(data,commonParam)).then (res=>{
            resolve(res);
        })
  })
}

export async function associationList(data){
  return new Promise((resolve, reject) => {
        Network.post(api.AssociationList, Object.assign(data,commonParam())).then (res=>{
            resolve(res);
        })
  })
}

export async function caseList(data){
  return new Promise((resolve, reject) => {
        Network.post(api.CaseList,Object.assign(data,commonParam())).then (res=>{
            resolve(res);
        })
  })
}

export async function cityList(data){
  return new Promise((resolve, reject) => {
        Network.post(api.CityList, data || {}).then (res=>{
            resolve(res);
        })
  })
}

export async function discoverWedding(data){
  return new Promise((resolve, reject) => {
        Network.post(api.DiscoverWedding, Object.assign(data,commonParam())).then (res=>{
            resolve(res);
        })
  })
}

export async function discoverShops(data){
  return new Promise((resolve, reject) => {
        Network.post(api.DiscoverShops, Object.assign(data,commonParam())).then (res=>{
            resolve(res);
        })
  })
}

export async function myHomeIndex(data){
  return new Promise((resolve, reject) => {
        const params = Object.assign(data || {}, commonParam())
        Network.post(api.MyHomeIndex, params).then(res => {
          resolve(res)
        })
  })
}

export async function activityVoteUrl(data){
  return new Promise((resolve, reject) => {
        const params = Object.assign(data || {}, commonParam())
        Network.post(api.ActivityVoteUrl, params).then(res => {
          resolve(res)
        })
  })
}
