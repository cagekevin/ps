# rename（37.4KB @L8914）

> 来源：`56d7.js` 行 8914　大小 38247 字节
> 说明：与另一个同名组件并存，此处按行号区分

## 源码

```js
{
  components: {
    guide: at,
    BuyReminderDialogWrapper: le
  },
  data: function () {
    return {
      guideSelectIstrue: false,
      guideSelectIndex: -1,
      guideIndex: 0,
      set: V.a.info,
      navClass: ["oldguide-one-template", "oldguide-two-nav", "oldguide-therr-nav", "guide-therr-font oldguide-four-fun", "oldguide-five-nav", "oldguide-six-style", "oldguide-seven-nav", "oldguide-eight-nav", "guide-five-template oldguide-nine-nav"],
      guideOptions: jt,
      moveIndex: -1,
      nav: {
        index: 3,
        list: H.info
      },
      pullNum: 0,
      openSync: false,
      appCommon: Lt.info,
      isShowTrailDialog: false,
      trailOverdueDays: 0,
      checkNewVersionTimer: null,
      hasGoneToLogin: false
    };
  },
  watch: {
    "$store.state.showMenu": function () {
      this.$menu.hide();
    },
    set: {
      handler: function (t, e) {
        V.a.updata();
      },
      immediate: false,
      deep: true
    },
    appCommon: {
      handler: function (t, e) {
        Lt.updata();
      },
      immediate: false,
      deep: true
    }
  },
  created: function () {
    var t = this;
    return Object(d.a)(regeneratorRuntime.mark(function e() {
      return regeneratorRuntime.wrap(function (e) {
        while (1) {
          switch (e.prev = e.next) {
            case 0:
              t.yunxingchengxu();
              e.next = 3;
              return t.getUserInfo();
            case 3:
              Ca.init();
            case 4:
            case "end":
              return e.stop();
          }
        }
      }, e);
    }))();
  },
  mounted: function () {
    var t = this;
    return Object(d.a)(regeneratorRuntime.mark(function e() {
      var n;
      return regeneratorRuntime.wrap(function (e) {
        while (1) {
          switch (e.prev = e.next) {
            case 0:
              t.goNav(t.nav.index);
              t.$appBus.on("zcTemp", t.goPage);
              t.$appBus.on("zcCustom", t.goPage);
              t.$appBus.on("zcCommonUse", t.goPage);
              t.$appBus.on("zcFontSet", t.goPage);
              t.$appBus.on("zcFontManage", t.goPage);
              t.$appBus.on("zcStyle", t.goPage);
              t.$appBus.on("zcAction", t.goPage);
              t.$appBus.on("zcRename", t.goPage);
              t.$appBus.on("zcOverprint", t.goPage);
              t.$appBus.on("syncChangeFileToServe", t.syncChangeFileToServe);
              t.$appBus.on("syncPushAllFile", t.pushAllFile);
              t.$appBus.on("syncPullAllFile", t.pullAllFile);
              t.$appBus.on("appChangeNavTool", t.initNavToolEvent);
              t.$appBus.on("checkNewVersion", t.checkNewVersion);
              t.$appBus.on("toLogin", t.handleToLogin);
              t.$appBus.on("appGoNav", t.goNav);
              e.next = 19;
              return Rn.a.dispatch("checkGlobalIdeaPopup");
            case 19:
              n = e.sent;
              if (n) {
                if (n.indexOf("http") === 0) {
                  t.$cep.openUrl(n);
                } else {
                  t.$router.push(n);
                }
              }
            case 21:
            case "end":
              return e.stop();
          }
        }
      }, e);
    }))();
  },
  destroyed: function () {
    this.$appBus.off("toLogin", this.handleToLogin);
  },
  methods: {
    getUserInfo: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        var a;
        var i;
        var r;
        var s;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (!t.$store.state.token) {
                  e.next = 10;
                  break;
                }
                e.next = 3;
                return t.$store.dispatch("getUserInfo");
              case 3:
                e.sent;
                n = localStorage.getItem("trail-msg");
                a = true;
                i = new Date();
                if (n) {
                  r = 86400000;
                  a = Math.floor(n / r) !== Math.floor(i / r);
                }
                s = Nt(_a, "user.vipInfo.remainDay") || 0;
                if ([1, 3, 7].some(function (t) {
                  return t === s;
                }) && a) {
                  t.isShowTrailDialog = true;
                  localStorage.setItem("trail-msg", Number(i));
                  t.trailOverdueDays = s;
                }
              case 10:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    handleToLogin: function () {
      this.clearCheckNewVersionTimer();
      this.hasGoneToLogin = true;
      if (this.$root) {
        this.$root.$destroy();
      }
    },
    showHelpQuickly: function () {
      var t = this;
      this.$msg.confirm("欢迎使用", "查看快速上手教程", function () {
        setTimeout(function () {
          t.$cep.openUrl("http://pszhuli.com/quickly");
        }, 100);
      });
    },
    handleFreePanelEvent: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        var i;
        var r;
        var s;
        var o;
        var c;
        var l;
        var u;
        var h;
        var f;
        var p;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                if (typeof t.data !== "undefined") {
                  n.next = 2;
                  break;
                }
                return n.abrupt("return", e.$msg.showErr("数据损坏，请重新添加该功能按钮"));
              case 2:
                a = t.data;
                i = a.option == null ? [] : [a.option];
                r = "执行成功";
                s = "";
                o = "jsxHistory";
                c = true;
                l = function (t, e = "执行成功", n = "jsxHistory", a = false) {
                  s = t;
                  r = e;
                  o = n;
                  c = a;
                };
                n.t0 = a.key;
                n.next = n.t0 === "zdy_generate" ? 12 : n.t0 === "zdy_mergeRectangles" ? 14 : n.t0 === "cy_zoom" ? 24 : n.t0 === "cy_transformPosition" ? 26 : n.t0 === "cy_embedImage" ? 28 : n.t0 === "cy_embedMultipleImage" ? 30 : n.t0 === "cy_importMultipleImage" ? 32 : n.t0 === "cy_coorectBlur" ? 34 : n.t0 === "cy_swapWireframeFill" ? 36 : n.t0 === "cy_optimizeDoc" ? 38 : n.t0 === "cy_exportImage" ? 40 : n.t0 === "cy_exportOpenFolder" ? 42 : n.t0 === "cy_batchExportLayer" ? 44 : n.t0 === "cy_batchExportSecondLayer" ? 46 : n.t0 === "cy_bacthExportPsdToImage" ? 48 : n.t0 === "zdy_customBuildTransform" ? 56 : n.t0 === "cy_useGride" ? 59 : n.t0 === "cy_clearCutGuide" ? 61 : n.t0 === "cy_distributedByPitch" ? 63 : n.t0 === "cy_layerReplace" ? 66 : n.t0 === "cy_locationTrade" ? 68 : n.t0 === "cy_exchangeLayerColor" ? 70 : n.t0 === "zt_setFontSize" ? 72 : n.t0 === "zt_setFontLeading" ? 74 : n.t0 === "zt_setFontTracking" ? 76 : n.t0 === "zt_translate" ? 78 : n.t0 === "zt_createButton" ? 80 : n.t0 === "zt_copyFontInfo" ? 82 : n.t0 === "zt_pasteFontInfo" ? 84 : n.t0 === "zt_switchFontDirection" ? 86 : n.t0 === "zt_setLeftRightAlign" ? 88 : n.t0 === "zt_setUpDownAlign" ? 90 : n.t0 === "zt_setBackgroudAlign" ? 92 : n.t0 === "zt_changeTextBranchMerge" ? 94 : n.t0 === "dz_useAction" ? 96 : n.t0 === "cmm_useRename" ? 98 : 101;
                break;
              case 12:
                l("zdy_generate", "生成成功", "jsxHistory", true);
                return n.abrupt("break", 101);
              case 14:
                e.$tips.show(a.text);
                n.next = 17;
                return e.$cep.jsxNoCheck("zdy_checkMergeRectangles");
              case 17:
                u = n.sent;
                if (u.err !== 1) {
                  n.next = 20;
                  break;
                }
                return n.abrupt("return", e.$msg.showErr(u.msg));
              case 20:
                n.next = 22;
                return e.$cep.jsxHistoryNoCheck("zdy_mergeRectangles", [], a.text);
              case 22:
                u = n.sent;
                return n.abrupt("return");
              case 24:
                l("cy_zoom", "缩放成功", "jsx");
                return n.abrupt("break", 101);
              case 26:
                l("cy_transformPosition", "");
                return n.abrupt("break", 101);
              case 28:
                l("cy_insertionImage", "", "jsxHistory");
                return n.abrupt("break", 101);
              case 30:
                l("cy_embedMultipleImage", r, o, true);
                return n.abrupt("break", 101);
              case 32:
                e.$appBus.emit("fp_cy_importMultipleImage");
                return n.abrupt("return");
              case 34:
                l("cy_correctRectangleBlur");
                return n.abrupt("break", 101);
              case 36:
                l("cy_swapWireframeFill");
                return n.abrupt("break", 101);
              case 38:
                l("cy_optimizeDoc", "优化成功", "jsxHistoryNoCheck", true);
                return n.abrupt("break", 101);
              case 40:
                l("cy_ExportImage", "导出成功", "jsxHistoryNoCheck", true);
                return n.abrupt("break", 101);
              case 42:
                l("cy_openDirectory", "打开成功", "jsxNoCheck");
                return n.abrupt("break", 101);
              case 44:
                l("cy_BatchExportLayer", "导出成功", "jsxHistoryNoCheck", true);
                return n.abrupt("break", 101);
              case 46:
                l("cy_BatchExportSecondLayer", "导出成功", "jsxHistoryNoCheck", true);
                return n.abrupt("break", 101);
              case 48:
                e.$load.show("不要乱选根目录，不然加载时间会很久哦");
                n.next = 51;
                return e.$cep.jsxNoCheck("cy_getPsdForFolder");
              case 51:
                h = n.sent;
                e.$load.hide();
                f = function () {
                  var t = Object(d.a)(regeneratorRuntime.mark(function t() {
                    var n;
                    return regeneratorRuntime.wrap(function (t) {
                      while (1) {
                        switch (t.prev = t.next) {
                          case 0:
                            e.$load.show("正在导出...");
                            n = 0;
                          case 2:
                            if (!(n < h.length)) {
                              t.next = 9;
                              break;
                            }
                            e.$load.show("正在导出: " + h.length + "/" + (n + 1));
                            t.next = 6;
                            return e.$cep.jsxHistoryNoCheck("cy_BacthExportPsdToImage", [h[n], a.option], "批量导出PSD图片");
                          case 6:
                            n++;
                            t.next = 2;
                            break;
                          case 9:
                            e.$load.hide();
                          case 10:
                          case "end":
                            return t.stop();
                        }
                      }
                    }, t);
                  }));
                  return function () {
                    return t.apply(this, arguments);
                  };
                }();
                if (h.length > 30) {
                  e.$msg.confirm("提示", "文件夹内超过30个psd，导出时间较长是否继续？", f);
                } else {
                  f();
                }
                return n.abrupt("return");
              case 56:
                i = [a.option.number, a.option.angle, a.option.leftRigth, a.option.topBottom, a.option.pointIndex, a.option.scale, a.option.opacity];
                l("cy_customBuildTransform", "生成成功", "jsxHistory", true);
                return n.abrupt("break", 101);
              case 59:
                l("cy_createSafeAreaGuide", "生成成功", "jsxHistoryNoCheck");
                return n.abrupt("break", 101);
              case 61:
                l("cy_guideFunction", "执行成功", "jsxHistoryNoCheck");
                return n.abrupt("break", 101);
              case 63:
                i = a.option;
                l("cy_distributedByPitch", "执行成功");
                return n.abrupt("break", 101);
              case 66:
                l("cy_LayerReplace", "执行成功");
                return n.abrupt("break", 101);
              case 68:
                l("cy_locationTrade", "执行成功");
                return n.abrupt("break", 101);
              case 70:
                l("cy_exchangeLayerColor", "执行成功");
                return n.abrupt("break", 101);
              case 72:
                e.$appBus.emit("fp_zt_setFontSize", a.option);
                return n.abrupt("return");
              case 74:
                e.$appBus.emit("fp_zt_setFontLeading", a.option);
                return n.abrupt("return");
              case 76:
                e.$appBus.emit("fp_zt_setFontTracking", a.option);
                return n.abrupt("return");
              case 78:
                e.$appBus.emit("fp_zt_translate", a.option);
                return n.abrupt("return");
              case 80:
                l("zt_createButton", "创建按钮成功");
                return n.abrupt("break", 101);
              case 82:
                e.$appBus.emit("ztCopyFont", a.option);
                return n.abrupt("return");
              case 84:
                e.$appBus.emit("fp_zt_pasteFontInfo", a.option);
                return n.abrupt("return");
              case 86:
                l("zt_switchFontDirection", "");
                return n.abrupt("break", 101);
              case 88:
                e.$appBus.emit("fp_zt_setLeftRightAlign", a.option);
                return n.abrupt("return");
              case 90:
                e.$appBus.emit("fp_zt_setUpDownAlignn", a.option);
                return n.abrupt("return");
              case 92:
                l("zt_setBackrgoudAlign", "");
                return n.abrupt("break", 101);
              case 94:
                l("zt_textBranchMerge");
                return n.abrupt("break", 101);
              case 96:
                l("dz_callAction", "执行成功", "jsxHistoryNoCheck");
                return n.abrupt("break", 101);
              case 98:
                i = [a.option, true];
                l("cmm_batchName", "重命名成功", "jsxHistory", true);
                return n.abrupt("break", 101);
              case 101:
                if (s !== "") {
                  n.next = 105;
                  break;
                }
                e.$log.push("自由布局配置信息错误，无法调用");
                e.$log.push(a);
                return n.abrupt("return", e.$msg.showErr("自由布局配置信息错误，无法调用"));
              case 105:
                if (c) {
                  e.$load.show("正在执行： " + a.text);
                }
                n.next = 108;
                return e.$cep[o](s, i, a.text);
              case 108:
                p = n.sent;
                e.$load.hide();
                if (p !== false) {
                  n.next = 113;
                  break;
                }
                e.$cep.sendAppEvent("com.fengzi.event.freePanel.call", {
                  err: 1,
                  msg: "请选择图层哦"
                });
                return n.abrupt("return");
              case 113:
                if (Object(F.a)(p) !== "object" || p.err !== 1) {
                  n.next = 116;
                  break;
                }
                e.$cep.sendAppEvent("com.fengzi.event.freePanel.call", p);
                return n.abrupt("return", e.$tips.show(p.msg));
              case 116:
                if (r !== "") {
                  e.$tips.show(r);
                }
                e.$cep.sendAppEvent("com.fengzi.event.freePanel.call", {
                  err: 0
                });
              case 118:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    },
    checkNewVersion: function () {
      var t = this;
      setTimeout(Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        var a;
        var i;
        var r;
        var s;
        var o;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                n = {
                  num: N.a.version
                };
                e.next = 3;
                return Object(Pt.a)(Object(C.postRequest)("version/check", n));
              case 3:
                a = e.sent;
                i = Object(h.a)(a, 2);
                r = i[0];
                s = i[1];
                t.$load.hide();
                if (!r) {
                  e.next = 11;
                  break;
                }
                t.$tips.show(Nt(r, "response.data.message"));
                return e.abrupt("return");
              case 11:
                o = t.$msg.show({
                  title: "发现新版本",
                  okText: "立即更新",
                  html: s.data.html,
                  showCancel: true,
                  showTopCancel: true
                });
                o.then(function () {
                  I.a.toUpgradeCep(N.a.id, "https://cepapp.pszhuli.com");
                });
              case 13:
              case "end":
                return e.stop();
            }
          }
        }, e);
      })), 600);
    },
    yunxingchengxu: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                n = new Et.a();
                e.next = 3;
                return n.load();
              case 3:
                e.next = 5;
                return t.$cep.jsxNoCheck("Sys_setSystemEnvInfo", [Object({
                  VUE_APP_BASE_SERVER: "https://zhuli.gaoding.com",
                  VUE_APP_WEBSITE_HOST: "https://www.pszhuli.com",
                  VUE_APP_ENVNAME: "",
                  VUE_APP_CURRENTMODE: "prod",
                  VUE_APP_BASE_SYNC_SERVER: "https://syncserver.pszhuli.com",
                  VUE_APP_UMS: "https://ums.gaoding.com",
                  VUE_APP_BASE_CEP: "https://cepapp.pszhuli.com",
                  VUE_APP_USER_DIR: "/SheJiZhuLi",
                  VUE_APP_OPTIMAL_DIR: "/Optimal",
                  NODE_ENV: "production",
                  VUE_APP_CEP_VERSION: "3.6.2",
                  VUE_APP_CEP_NAME: "design",
                  VUE_APP_CEP_PUB_TIME: "2022-06-28",
                  VUE_APP_CEP_PUB_TIMESTAMP: "1656410553279",
                  BASE_URL: ""
                })]);
              case 5:
                if (V.a.getKey("setLongRun")) {
                  t.$cep.longRun();
                }
                t.initSeBan();
                t.$cep.bindAppEvent("com.fengzi.event.freePanel.use", t.handleFreePanelEvent);
                t.$cep.bindAppEvent("com.fengzi.event.freePanel.deleteFolder", function (e) {
                  var n;
                  var a = Object(T.a)(e.data.path);
                  try {
                    for (a.s(); !(n = a.n()).done;) {
                      var i = n.value;
                      t.$cep.jsxNoCheck("Fs_deleteFolder", [i]);
                    }
                  } catch (r) {
                    a.e(r);
                  } finally {
                    a.f();
                  }
                });
                t.$cep.bindAppEvent("com.fengzi.event.freePanel.updata", function () {
                  var e = t.$sync.getFileName(t.$config.path.appFreePanel);
                  t.$appBus.emit("syncChangeFileToServe", "syncFreePanel", [e], "自由面板");
                });
                t.openPsEvent();
                t.initNavToolEvent();
                t.openSync = V.a.getKey("appSync");
                if (V.a.getKey("appShowGuide")) {
                  t.guideSelectIstrue = true;
                } else {
                  t.initSync();
                }
                t.checkNewVersionTimer = setTimeout(function () {
                  if (!t.hasGoneToLogin) {
                    t.checkNewVersion();
                  }
                  t.clearCheckNewVersionTimer();
                }, 20000);
              case 15:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    clearCheckNewVersionTimer: function () {
      if (this.checkNewVersionTimer) {
        clearTimeout(this.checkNewVersionTimer);
      }
    },
    closeGuide: function () {
      this.guideSelectIstrue = false;
      this.showHelpQuickly();
      V.a.setKey("appShowGuide", false);
      this.initSync();
    },
    initSync: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (V.a.getKey("appSync") !== false) {
                  e.next = 2;
                  break;
                }
                return e.abrupt("return");
              case 2:
                e.next = 4;
                return t.$sync.checkFirstSync();
              case 4:
                n = e.sent;
                if (n.err !== 1) {
                  e.next = 8;
                  break;
                }
                setTimeout(function () {
                  if (t.pullNum >= 5) {
                    return t.$msg.showErr(n.msg);
                  }
                  t.initSync();
                  t.pullNum++;
                }, 15000);
                return e.abrupt("return", false);
              case 8:
                if (n.data !== true) {
                  e.next = 11;
                  break;
                }
                t.$msg.showFirstSync(Object(d.a)(regeneratorRuntime.mark(function e() {
                  return regeneratorRuntime.wrap(function (e) {
                    while (1) {
                      switch (e.prev = e.next) {
                        case 0:
                          t.pushAllFile();
                          t.openSync = true;
                        case 2:
                        case "end":
                          return e.stop();
                      }
                    }
                  }, e);
                })), function () {
                  t.openSync = false;
                  V.a.setKey("appSync", false);
                  t.$tips.show("取消云同步");
                });
                return e.abrupt("return", true);
              case 11:
                if (t.$sync.checkFirstRunClient() !== false) {
                  e.next = 15;
                  break;
                }
                e.next = 14;
                return t.pullAllFile();
              case 14:
                return e.abrupt("return", true);
              case 15:
                if (!t.$sync.checkFirstChangeFile()) {
                  e.next = 21;
                  break;
                }
                e.next = 18;
                return t.pullFirstChangeFile();
              case 18:
                e.sent;
                t.$syncTips.showSuccess("已同步最新");
                return e.abrupt("return", true);
              case 21:
                t.$syncTips.showSuccess("云同步已是最新");
              case 22:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    syncChangeFileToServe: function (t, e, n) {
      var a = this;
      if (this.openSync === false) {
        return false;
      }
      this.loadSyncAmin(n);
      this.$delay.add(t, function () {
        a.pushChangeFileToServe(e, n);
      }, 3000);
    },
    loadSyncAmin: function (t) {
      var e = this;
      var n = 0;
      var a = function a() {
        if (n >= 80) {
          return false;
        }
        setTimeout(function () {
          a();
        }, 100);
        n += 4;
        e.$syncTips.show("同步" + t + "...", n, 100);
      };
      a();
    },
    pushChangeFileToServe: function (t, e) {
      var n = this;
      return Object(d.a)(regeneratorRuntime.mark(function a() {
        var i;
        return regeneratorRuntime.wrap(function (a) {
          while (1) {
            switch (a.prev = a.next) {
              case 0:
                a.next = 2;
                return n.$sync.pushFile(t, function (t, a) {
                  n.$syncTips.show("同步" + e + "...", t + 5, a);
                });
              case 2:
                i = a.sent;
                n.$syncTips.hide();
                if (i.err !== 1) {
                  a.next = 9;
                  break;
                }
                if (i.new) {
                  a.next = 7;
                  break;
                }
                return a.abrupt("return", n.$msg.showErr(i.msg));
              case 7:
                n.$msg.showSyncChange(Object(d.a)(regeneratorRuntime.mark(function e() {
                  return regeneratorRuntime.wrap(function (e) {
                    while (1) {
                      switch (e.prev = e.next) {
                        case 0:
                          e.next = 2;
                          return n.pullFileList(t);
                        case 2:
                        case "end":
                          return e.stop();
                      }
                    }
                  }, e);
                })), function () {
                  n.forcePushFile(t);
                });
                return a.abrupt("return", false);
              case 9:
                n.$syncTips.showSuccess("同步" + e + "预设成功");
                n.$appBus.emit("updataSyncTime");
              case 11:
              case "end":
                return a.stop();
            }
          }
        }, a);
      }))();
    },
    pullFirstChangeFile: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.$sync.pullFirstChangeFile(t.downCallBack);
              case 2:
                n = e.sent;
                if (n.err !== 1) {
                  e.next = 6;
                  break;
                }
                setTimeout(function () {
                  if (t.pullNum >= 10) {
                    return t.$tips.show(n.msg);
                  }
                  t.pullFirstChangeFile();
                  t.pullNum++;
                }, 5000);
                return e.abrupt("return", false);
              case 6:
                t.$syncTips.showSuccess("更新到本地成功");
                t.reloadData();
              case 8:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    pullAllFile: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.$sync.pullAllFile(t.$sync.serveInfo, t.downCallBack);
              case 2:
                n = e.sent;
                if (n.err !== 1) {
                  e.next = 6;
                  break;
                }
                setTimeout(function () {
                  if (t.pullNum >= 10) {
                    return t.$msg.showErr(n.msg);
                  }
                  t.pullAllFile();
                  t.pullNum++;
                }, 5000);
                return e.abrupt("return", false);
              case 6:
                t.$syncTips.showSuccess("同步到本地成功");
                t.reloadData();
              case 8:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    pullFileList: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                n.next = 2;
                return e.$sync.pullFileByClientPath(t, e.downCallBack);
              case 2:
                n.sent;
                e.$syncTips.showSuccess("同步到本地成功");
                e.reloadData();
              case 5:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    },
    pushAllFile: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                t.$load.show("正在读取云同步预设文件...");
                setTimeout(Object(d.a)(regeneratorRuntime.mark(function e() {
                  var n;
                  return regeneratorRuntime.wrap(function (e) {
                    while (1) {
                      switch (e.prev = e.next) {
                        case 0:
                          e.next = 2;
                          return t.$sync.pushAllFile(function (e, n) {
                            t.$load.hide();
                            t.$syncTips.show("同步文件到服务器...", e, n);
                          });
                        case 2:
                          n = e.sent;
                          t.$load.hide();
                          if (n.err === 1) {
                            t.$msg.showErr(n.msg);
                          }
                        case 5:
                        case "end":
                          return e.stop();
                      }
                    }
                  }, e);
                })), 30);
              case 2:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    forcePushFile: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                n.next = 2;
                return e.$sync.pushFile(t, function (t, n) {
                  e.$syncTips.show("同步更改...", t + 5, n);
                }, true);
              case 2:
                a = n.sent;
                if (a.err === 0) {
                  e.$syncTips.showSuccess("同步成功");
                }
              case 4:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    },
    reloadData: function () {
      var t = new Tt();
      t.init();
      var e = new Ft();
      e.reload();
      this.$appBus.emit("syncReloadStyle");
      this.$appBus.emit("syncReloadRename");
      this.$appBus.emit("syncReloadAction");
    },
    downCallBack: function (t) {
      this.$syncTips.show("正在同步文件到本地...", t.loaded, t.total + 1);
    },
    goPage: function (t) {
      var e = {
        zcTemp: "template",
        zcMaterial: "material",
        zcCustom: "custom",
        zcCommonUse: "commonUse",
        zcFontSet: "fontSet",
        zcFontManage: "fontManage",
        zcStyle: "style",
        zcAction: "action",
        zcRename: "rename",
        zcOverprint: "overprint"
      };
      var n = e[t];
      var a = H.info.findIndex(function (t) {
        return t.id === n;
      });
      if (a !== -1) {
        this.goNav(a);
      } else {
        this.$gdReporter.error(new Error("unknown page " + t));
      }
    },
    initSeBan: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                t.$cep.bindAppEvent("com.fengzi.event.seban", t.handleSeBanEvent);
                e.next = 3;
                return t.$cep.jsxNoCheck("f_getScriptEventId");
              case 3:
                t.set.appScriptEventId = e.sent;
                t.$psEvent.add(t.set.appScriptEventId, "appShortcutKey", t.appShortcutKeyHandle);
              case 5:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    initNavToolEvent: function () {
      var t;
      var e = Object(T.a)(V.a.info.navToolRelation);
      try {
        for (e.s(); !(t = e.n()).done;) {
          var n = t.value;
          if (n.status === true) {
            this.$psEvent.add("1936483188", "appCutTool", this.appCutTool);
            return true;
          }
        }
      } catch (a) {
        e.e(a);
      } finally {
        e.f();
      }
      this.$psEvent.remove("1936483188", "appCutTool");
    },
    appCutTool: function (t) {
      if (V.a.info.navFixed) {
        return false;
      }
      var e = V.a.info.navToolRelation.reduce(function (t, e) {
        t.set(e.key, e.status);
        return t;
      }, new Map());
      switch (t) {
        case "rotateTool":
          if (e.get("r")) {
            this.goPage("zcTemp");
          }
          break;
        case "paintbrushTool":
          if (e.get("b")) {
            this.goPage("zcMaterial");
          }
          break;
        case "marqueeRectTool":
          if (e.get("m")) {
            this.goPage("zcCustom");
          }
          break;
        case "directSelectTool":
        case "pathComponentSelectTool":
          if (e.get("a")) {
            this.goPage("zcCommonUse");
          }
          break;
        case "typeCreateOrEditTool":
          if (e.get("t")) {
            this.goPage("zcFontSet");
          }
          break;
        case "handTool":
          if (e.get("h")) {
            this.goPage("zcFontManage");
          }
          break;
        case "rectangleTool":
        case "ellipseTool":
        case "polygonTool":
        case "lineTool":
        case "customShapeTool":
          if (e.get("u")) {
            this.goPage("zcStyle");
          }
          break;
        case "magicWandTool":
        case "magicLassoTool":
        case "quickSelectTool":
          if (e.get("w")) {
            this.goPage("zcAction");
          }
          break;
        case "eraserTool":
        case "backgroundEraserTool":
        case "magicEraserTool":
          if (e.get("e")) {
            this.goPage("zcRename");
          }
          break;
        case "zoomTool":
          if (e.get("z")) {
            this.goPage("zcOverprint");
          }
          break;
      }
    },
    appShortcutKeyHandle: function (t) {
      var e = t.eventData.javaScriptName;
      var n = dt.getKey(e);
      var a = dt.getName(e);
      if (n !== "") {
        this.$tips.show(a);
        this.$appBus.emit(n, n);
      }
    },
    handleSeBanEvent: function (t) {
      var e = this;
      switch (t.data.type) {
        case "sendColor":
          this.$router.push("/style");
          setTimeout(function () {
            e.$appBus.emit("appSeBanSendColor", t.data.data);
            e.$log.push(t.data.data);
          }, 100);
          break;
        case "setColor":
          if (V.a.getKey("cyAutoFillColor")) {
            t.data.data.isFill = true;
            this.$cep.jsxHistory("ys_useStyleColor", [t.data.data], "智能填充颜色");
          } else {
            this.$cep.jsxNoCheck("ys_setForegroundColor", [t.data.data]);
          }
          break;
        case "setWireframeColor":
          this.$cep.jsxHistory("ys_setBorderColor", [t.data.data], "智能填充线框颜色");
          break;
      }
      if (t.data === "QieHuanXianKuang") {
        this.$cep.jsxHistory("cy_swapWireframeFill", [], "填充线框互换");
      }
    },
    openPsEvent: function () {
      this.$psEvent.add("1936483188", "appPsEvent", this.updataPsLayerStatus);
    },
    updataPsLayerStatus: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                E.layer.num = t.layerID.length;
                E.layer.id = t.layerID;
                E.layer.name = t.null._name;
                if (V.a.info.navFixed !== false || !V.a.info.navAuto || t.layerID.length !== 1) {
                  n.next = 8;
                  break;
                }
                n.next = 6;
                return e.$cep.jsxNoCheck("Layer_getTypeNumber");
              case 6:
                a = n.sent;
                if (a === 3) {
                  e.goPage("zcFontSet");
                } else if (a === 5 || a === 1) {
                  e.goPage("zcCommonUse");
                } else if (a === 4) {
                  e.goPage("zcStyle");
                }
              case 8:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    },
    overall: function () {
      this.$store.state.inputcomIstrue = -1;
      this.$menu.hide();
      this.$store.state.showMenu = -1;
    },
    setNav: function (t) {
      if (!this.set.setMoveTab) {
        this.goNav(t);
      }
    },
    mouseNav: function (t) {
      if (this.set.setMoveTab) {
        this.goNav(t);
      }
    },
    goNav: function (t) {
      this.nav.index = t;
      this.$router.push(this.nav.list[t].to);
      Rt.a.trackNavTabClick({
        button_name: this.nav.list[t].text.split(" ")[0]
      });
      if (t === 3) {
        this.$appBus.emit("updataFontSmipleInfo");
      }
      this.$bp.add("nav_00" + t);
    },
    toSet: function () {
      this.nav.index = 11;
      this.$router.push("/set");
    },
    hideMenu: function () {},
    openGuide: function () {
      this.guideSelectIstrue = true;
    }
  }
}
```
