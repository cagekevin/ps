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
  ztHierarych: 'sj_ztHierarych.json',
  ztglHistory: 'sj_ztglHistory.json',
  ztTranslate: 'sj_ztTranslate.json',
  /** 原面板的设置主文件；我们只读写字体面板相关字段，其余键原样保留 */
  ztSet: 'sj_set.json',
  classification: 'classification.json',
  /** 动作仓库索引：{ index, list: [{ name, fileName }] } */
  actionLibrary: 'sj_dzStoreInfo.json',
  /** 自由面板：{ uid, btnId, obj:{version,type,list:Block[]} } */
  appFreePanel: 'sj_appFreePanel.json',
  /** 常用项列表：{ info: CommonUseItem[] }；原版路径 key cyCommonFunction（app.v4.js:5218） */
  cyCommonFunction: 'sj_commonFunction.json',
  /** 重命名预设：[{ name, show, list:string[] }]；原版路径 key 是 `path.rename`（app.v4.js:5219） */
  cmmRename: 'sj_cmmRename.ini',
  /**
   * 样式仓库索引：`{ index, list: [{ name, show?, color, gradient, font, style }] }`。
   * 原版 `path.styleLibrary` = `user + "/sj_kuStoreInfo.ini"`（`app.v4.js:5221`）；
   * 四个字段存的是**相对文件名**，格式见 `docs/生成/库文件格式契约.md` §2.2。
   */
  styleLibrary: 'sj_kuStoreInfo.ini',
  /**
   * 面板自己的界面偏好。**原版没有这个文件**（原版界面状态在 `sj_set.json` 里），
   * 我们不往别人的文件里加字段（决策 D2=A）。
   */
  uiPrefs: 'sj_v5_ui.json',
  /** 面板自己的日志（纯文本，不是 JSON —— 所以它走 `readOwnFileText`，进不了 `readRepoFile`） */
  logFile: 'sj_v5_log.txt',
  /** 云同步台账：`{ rev, syncedAt, localHash, units? }`；面板自有，原版没有这个文件 */
  cloudLedger: 'sj_v5_cloud_sync.json',
} as const
