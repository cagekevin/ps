/**
 * 原面板启动时注入给 jsx 的环境变量。
 * 字段名不能改——jsx 内部按这些 key 取路径和开关。
 * 其中 VUE_APP_USER_DIR 最关键，jsx 用它拼数据文件目录（%APPDATA%\SheJiZhuLi）。
 */
export const PS_ENV = {
  VUE_APP_BASE_SERVER: 'https://zhuli.gaoding.com',
  VUE_APP_WEBSITE_HOST: 'https://www.pszhuli.com',
  VUE_APP_ENVNAME: '',
  VUE_APP_CURRENTMODE: 'prod',
  VUE_APP_BASE_SYNC_SERVER: 'https://syncserver.pszhuli.com',
  VUE_APP_UMS: 'https://ums.gaoding.com',
  VUE_APP_BASE_CEP: 'https://cepapp.pszhuli.com',
  VUE_APP_USER_DIR: '/SheJiZhuLi',
  VUE_APP_OPTIMAL_DIR: '/Optimal',
  NODE_ENV: 'production',
  VUE_APP_CEP_VERSION: '3.6.2',
  VUE_APP_CEP_NAME: 'design',
  VUE_APP_CEP_PUB_TIME: '2022-06-28',
  VUE_APP_CEP_PUB_TIMESTAMP: '1656410553279',
  BASE_URL: '',
} as const

/** 用户数据目录名，挂在 %APPDATA% 下 */
export const USER_DIR = PS_ENV.VUE_APP_USER_DIR

/** 我们目前会读的数据文件（都相对用户数据目录） */
export const DATA_FILES = {
  sysFontList: 'SysFont2.json',
  ztglStar: 'sj_ztglStar.ini',
  ztglTags: 'sj_ztglTags.ini',
  ztQuickFont: 'sj_ztQuickFont.json',
} as const
