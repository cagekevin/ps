{
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