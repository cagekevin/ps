# Set

> 来源：`app/56d7.js`　大小：10.6KB
> 特征：data / methods

## 子组件

`tips`、`addcom`、`dropDowncom`、`open`、`GDropdown`、`GMenu`、`GMenuItem`、`DevicesManageModal`、`Member`、`GButton`、`Icon`、`ClearCacheDialog`

## computed（6）

`cepId`、`showCommonFunc`、`showVersionSwitcher`、`displayVersionNum`、`formattedUsage`、`usage`

## methods（32）

`diskUsage`、`showClearCacheDialog`、`changeShowMore`、`openCompany`、`companyChange`、`openLogs`、`viewErrorLog`、`resetSort`、`exportAllPreset`、`changeLongRun`、`checkUpdata`、`changeNalTool`、`resetAll`、`syncToClient`、`syncToServe`、`addComClose`、`dropOpen`、`setQuickIndex`、`open`、`closeTipFun`、`openHelp`、`openOs`、`openUrl`、`manualCopy`、`resetQuickKey`、`copyToScripts`、`openGuide`、`getAccessToken`、`postRequest`、`getRequest`、`outLogin`、`switchTo`

## jsx 调用（PS 能力）

- `Fs_openFolder`

## 文案（25）

像素 · 厘米 · 毫米 · 英尺 · 点 · 派卡 · 开启快捷切换字体粗细 · 开启自定义层级 · 开启智能排版 · 允许同时展开 · 未同步 · 导出预设 · 设计助理所有预设 · 设计助理的预设文件 · 取消操作 · 正在导出 · 检查是否有新版本 · 重置成功 · 请输入默认字体大小 · 请输入默认行间距 · 请输入默认字间距 · 快捷键脚本 · 刷新成功 · 拷贝文件错误 · 请手动复制或者开启管理员权限

## 源码

```js
{
  name: "Set",
  components: {
    tips: uT,
    addcom: HT,
    dropDowncom: gm,
    open: vT,
    GDropdown: ii.a,
    GMenu: ai.a,
    GMenuItem: ai.a.Item,
    "version-switcher": TT,
    DevicesManageModal: _I,
    Member: aT,
    GButton: Wt.a,
    Icon: ie.a,
    ClearCacheDialog: ET
  },
  data: function () {
    return {
      company: ["像素(px)", "厘米(cm)", "毫米(mm)", "英尺(in)", "点(pt)", "派卡(pc)"],
      addDataVal: null,
      addText: null,
      addIstrue: false,
      comsetIstrue: false,
      tipsIstrue: false,
      showNavTool: -1,
      set: V.a.info,
      quick: dt.info,
      quickIstrue: false,
      quickIndex: -1,
      comFunIstrue: false,
      fontData: [{
        name: "开启快捷切换字体粗细",
        key: "ztShowQuick"
      }, {
        name: "开启自定义层级",
        key: "ztShowCustom"
      }, {
        name: "开启智能排版",
        key: "ztShowSmartType"
      }, {
        name: "允许同时展开",
        key: "ztExpandMultiple"
      }],
      fontDataIstrue: false,
      upMeIstrue: false,
      allIndex: -1,
      commonFunc: Lt.info,
      navData: H.info,
      syncTime: "",
      data: N.a,
      testString: "",
      showMore: {
        base: false,
        leftNav: false,
        shortcutKey: false,
        commonUse: false,
        fontSet: false,
        fontManage: false,
        sync: false
      },
      leftNav: {
        one: false,
        two: false
      },
      showShortcutKey: {
        0: false,
        1: false,
        2: false,
        4: false
      },
      PRODUCTS: EI,
      deviceManageVisible: false,
      userService: MI,
      isShowClearCacheDialog: false,
      umsHost: "https://ums.gaoding.com",
      pszhuliHost: "https://www.pszhuli.com"
    };
  },
  computed: {
    cepId: function () {
      return iT.a.cep;
    },
    showCommonFunc: function () {
      return this.commonFunc.filter(function (t) {
        return !t.hasOwnProperty("created");
      });
    },
    showVersionSwitcher: function () {
      var t = this.$store.state.user_info;
      return !!t && t.showVersionSwitcher;
    },
    displayVersionNum: function () {
      return LI.getVersionTemplate();
    },
    formattedUsage: function () {
      return Rr(Ca.usage);
    },
    usage: function () {
      return Ca.usage;
    }
  },
  watch: {
    navData: {
      handler: function (t, e) {
        H.update();
      },
      deep: true
    },
    $route: {
      handler: function (t, e) {
        if (t.path === "/set") {
          this.diskUsage();
        }
        if (this.$route.query.callback && this[this.$route.query.callback]) {
          this[this.$route.query.callback]();
        }
      },
      immediate: true
    },
    isShowClearCacheDialog: function (t) {
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (t !== false) {
                  e.next = 3;
                  break;
                }
                e.next = 3;
                return Ca.resizeThreshold();
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    }
  },
  created: function () {
    var t = this;
    if (this.$sync.syncInfo.lastSyncTime !== "") {
      this.syncTime = $T(new Date(parseInt(this.$sync.syncInfo.lastSyncTime)));
    } else {
      this.syncTime = "未同步";
    }
    this.$appBus.on("updataSyncTime", function () {
      t.syncTime = $T(new Date(parseInt(t.$sync.syncInfo.lastSyncTime)));
    });
  },
  mounted: function () {
    var t = this;
    return Object(d.a)(regeneratorRuntime.mark(function e() {
      return regeneratorRuntime.wrap(function (e) {
        while (1) {
          switch (e.prev = e.next) {
            case 0:
              t.$log.push("set");
            case 1:
            case "end":
              return e.stop();
          }
        }
      }, e);
    }))();
  },
  methods: {
    diskUsage: function () {
      return Object(d.a)(regeneratorRuntime.mark(function t() {
        return regeneratorRuntime.wrap(function (t) {
          while (1) {
            switch (t.prev = t.next) {
              case 0:
                t.next = 2;
                return Ca.diskUsage();
              case 2:
              case "end":
                return t.stop();
            }
          }
        }, t);
      }))();
    },
    showClearCacheDialog: function () {
      var t = !(arguments.length > 0) || arguments[0] === undefined || arguments[0];
      this.isShowClearCacheDialog = t;
    },
    changeShowMore: function (t, e) {
      for (var n in this[t]) {
        if (n !== e) {
          this[t][n] = false;
        }
      }
    },
    openCompany: function () {
      this.$refs.company.open();
    },
    companyChange: function (t) {
      var e = this.company[t[0]];
      var n = e.indexOf("(");
      this.set.appUnit = e.substr(n + 1, 2);
    },
    openLogs: function () {
      this.$cep.jsxNoCheck("Fs_openFolder", [N.a.path.dirLog]);
    },
    viewErrorLog: function () {
      this.$cep.jsxNoCheck("Fs_openFolder", [N.a.path.user]);
    },
    resetSort: function () {
      Lt.resetConfig();
    },
    exportAllPreset: function () {
      var t = D.a.saveFile("导出预设", ["pzl"], "设计助理所有预设.pzl", "设计助理的预设文件");
      if (t === false) {
        return this.$tips.show("取消操作");
      }
      this.$load.show("正在导出...");
      var e = D.a.pathToObject(N.a.path.user);
      D.a.write(N.a.path.user, JSON.stringify(e));
      this.$load.hide();
    },
    changeLongRun: function () {
      if (this.set.setLongRun) {
        this.$cep.longRun();
      } else {
        this.$cep.unLongRun();
      }
    },
    checkUpdata: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                t.$load.show("检查是否有新版本...");
                t.$appBus.emit("checkNewVersion");
                t.$bp.add("sz_002");
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    changeNalTool: function () {
      var t = this;
      this.$delay.add("appChangeNavTool", function () {
        t.$appBus.emit("appChangeNavTool");
      }, 1000);
    },
    resetAll: function () {
      V.a.reset();
      this.$tips.show("重置成功");
      this.$bp.add("sz_004");
    },
    syncToClient: function () {
      this.$appBus.emit("syncPullAllFile");
    },
    syncToServe: function () {
      this.$appBus.emit("syncPushAllFile");
    },
    addComClose: function () {
      this.addIstrue = false;
    },
    dropOpen: function (t, e) {
      switch (e) {
        case 0:
          this.addDataVal = "ztDefaultSize";
          this.addText = "请输入默认字体大小";
          break;
        case 1:
          this.addDataVal = "ztDefaultLeading";
          this.addText = "请输入默认行间距";
          break;
        case 2:
          this.addDataVal = "ztDefaultTracking";
          this.addText = "请输入默认字间距";
          break;
      }
      this.addIstrue = true;
    },
    setQuickIndex: function (t) {
      this.quickIndex = t !== this.quickIndex ? t : -1;
    },
    open: function (t) {
      this.hiddenIstrueArr.splice(t, 1, !this.hiddenIstrueArr[t]);
    },
    closeTipFun: function () {
      this.tipsIstrue = false;
    },
    openHelp: function () {
      this.$cep.openUrl(N.a.url.help);
      this.$bp.add("sz_001");
    },
    openOs: function () {
      this.$cep.openUrl(N.a.url.os);
    },
    openUrl: function (t) {
      this.$cep.openUrl(t);
    },
    manualCopy: function () {
      var t = D.a.getAppPath();
      var e = t + "/Presets/Scripts/";
      this.$cep.jsx("Fs_openFolder", [e]);
      var n = N.a.path.user + "/快捷键脚本";
      D.a.createFolder(n);
      var a;
      var i = Object(T.a)(dt.info);
      try {
        for (i.s(); !(a = i.n()).done;) {
          var r;
          var s = a.value;
          var o = Object(T.a)(s.arr);
          try {
            for (o.s(); !(r = o.n()).done;) {
              var c = r.value;
              var l = n + "/SJZL-" + s.groupName + "-" + c.name + ".jsx";
              var u = "#target photoshop;\r\nfunction init() {}\r\ninit();";
              D.a.write(l, u);
            }
          } catch (h) {
            o.e(h);
          } finally {
            o.f();
          }
        }
      } catch (h) {
        i.e(h);
      } finally {
        i.f();
      }
      this.$cep.jsxNoCheck("Fs_openFolder", [e]);
      this.$cep.jsxNoCheck("Fs_openFolder", [n]);
      this.$bp.add("sz_003");
    },
    resetQuickKey: function () {
      dt.reset();
      this.$tips.show("刷新成功");
    },
    copyToScripts: function (t, e) {
      var n = D.a.getAppPath();
      var a = n + "/Presets/Scripts/";
      var i = a + "SJZL-" + t + "-" + e.name + ".jsx";
      if (e.add === false) {
        D.a.delete(i);
        return false;
      }
      var r = "#target photoshop;\r\nfunction init() {}\r\ninit();";
      D.a.write(i, r);
      if (D.a.isFile(i) === false) {
        this.$msg.showErr("拷贝文件错误，请手动复制或者开启管理员权限！");
        e.add = false;
      }
      dt.updata();
    },
    openGuide: function () {
      this.$emit("openGuide");
    },
    getAccessToken: function () {
      return ae.a.getAccessToken();
    },
    postRequest: function (t, e) {
      return C.postRequest.call(this, t, e);
    },
    getRequest: function (t) {
      return C.getRequest.call(this, t);
    },
    outLogin: function () {
      try {
        var t = new zI();
        this.$gdReporter.info({
          msg: "set page cckCerSts"
        });
        t.cckCerSts();
      } catch (e) {
        this.$gdReporter.error(e, {
          msg: "set page cckCerSts error"
        });
        console.error(e);
      }
      this.$gdReporter.info({
        msg: "set page toLogin"
      });
      Object(ft.i)();
    },
    switchTo: function (t) {
      var e = this;
      this.$store.dispatch("switchVersion", t).then(Object(d.a)(regeneratorRuntime.mark(function t() {
        var n;
        var a;
        return regeneratorRuntime.wrap(function (t) {
          while (1) {
            switch (t.prev = t.next) {
              case 0:
                t.next = 2;
                return OI();
              case 2:
                n = t.sent;
                a = JSON.stringify(n);
                Object(ft.h)({
                  token: a,
                  tar_user: e.$store.state.user_info.gdUserInfo.user_id,
                  tar_token: a,
                  asset: ""
                });
              case 5:
              case "end":
                return t.stop();
            }
          }
        }, t);
      })));
    }
  }
}
```