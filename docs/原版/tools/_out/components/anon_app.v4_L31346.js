{
      components: {
        CreateNewLibrary: md,
        IconFont: ie.a
      },
      data: function () {
        return {
          condition: Math.floor(Math.random() * 10000000),
          showCreateNewTemp: false,
          data: Ln.a,
          set: V.a.info
        };
      },
      computed: {
        historyRecords: function () {
          var t = this.data;
          var e = t.historyLibrary;
          var n = t.name;
          var a = [];
          var i = 0;
          while (i < e.length && a.length < 2) {
            var r = e[i];
            var s = r.split("/");
            var o = s[s.length - 1];
            if (o !== n) {
              a.push({
                name: o,
                path: r
              });
            }
            i++;
          }
          return a;
        }
      },
      created: function () {
        this.addEventListeners();
      },
      methods: {
        selectAll: function () {
          var t = this;
          setTimeout(function () {
            t.$refs.refInput.select();
          }, 50);
        },
        chenckUnit: function () {
          this.set.mbUseTmeplatePadding = Object(ft.b)(this.set.mbUseTmeplatePadding);
        },
        addShowPsdSize: function () {
          this.$bp.add("mb_051");
        },
        addMultiMode: function () {
          this.$bp.add("mb_052");
        },
        addShoaAddBtn: function () {
          this.$bp.add("mb_053");
        },
        importPack: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    t.open();
                    t.$bp.add("mb_042");
                    setTimeout(Object(d.a)(regeneratorRuntime.mark(function e() {
                      var n;
                      return regeneratorRuntime.wrap(function (e) {
                        while (1) {
                          switch (e.prev = e.next) {
                            case 0:
                              e.next = 2;
                              return t.$cep.jsxNoCheck("Fs_selectFolder");
                            case 2:
                              n = e.sent;
                              t.$log.push("importPack " + n);
                              if (n != -1) {
                                e.next = 6;
                                break;
                              }
                              return e.abrupt("return");
                            case 6:
                              if (typeof n !== "string") {
                                n = n[0];
                              }
                              n = t.$temp.checkPackPath(n);
                              if (n !== false) {
                                e.next = 11;
                                break;
                              }
                              t.$bp.add("mb_044");
                              return e.abrupt("return", t.$msg.showErr("该文件夹不是素材包(.pszlpack)"));
                            case 11:
                              t.importPackHandle(n);
                              t.$bp.add("mb_043");
                            case 13:
                            case "end":
                              return e.stop();
                          }
                        }
                      }, e);
                    })), 50);
                  case 3:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          }))();
        },
        importPackHandle: function (t) {
          var e = this;
          var n = this.$temp.getImportPackTime(t);
          this.$msg.confirm("导入素材包", n, Object(d.a)(regeneratorRuntime.mark(function n() {
            return regeneratorRuntime.wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    n.next = 2;
                    return e.$temp.importPack(t, function (t, n) {
                      e.$load.show("正在导入素材包：" + t + "/" + n);
                    });
                  case 2:
                    e.$load.hide();
                    e.$emit("updataPreview");
                  case 4:
                  case "end":
                    return n.stop();
                }
              }
            }, n);
          })));
        },
        importFolder: function () {
          var t = this;
          this.open();
          this.$bp.add("mb_045");
          setTimeout(Object(d.a)(regeneratorRuntime.mark(function e() {
            var n;
            var a;
            var i;
            var r;
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    e.next = 2;
                    return t.$cep.jsxNoCheck("Fs_selectFolder");
                  case 2:
                    n = e.sent;
                    t.$log.push("importFolder " + n);
                    if (n != -1) {
                      e.next = 6;
                      break;
                    }
                    return e.abrupt("return");
                  case 6:
                    if (typeof n !== "string") {
                      n = n[0];
                    }
                    a = t.$temp.checkPackPath(n);
                    if (a === false) {
                      e.next = 11;
                      break;
                    }
                    t.$bp.add("mb_047");
                    return e.abrupt("return", t.importPackHandle(a));
                  case 11:
                    e.next = 13;
                    return t.$cep.jsxNoCheck("mb_getFolderList", [n]);
                  case 13:
                    i = e.sent;
                    if (i != null) {
                      e.next = 17;
                      break;
                    }
                    t.$bp.add("mb_047");
                    return e.abrupt("return", t.$msg.showErr("发生未知错误"));
                  case 17:
                    r = t.$temp.getImportFolderTime(i.length);
                    t.$msg.confirm("导入文件夹", r, Object(d.a)(regeneratorRuntime.mark(function e() {
                      return regeneratorRuntime.wrap(function (e) {
                        while (1) {
                          switch (e.prev = e.next) {
                            case 0:
                              e.next = 2;
                              return t.$temp.importFolder(i.obj, function (e) {
                                t.$load.show("正在导入模板：" + e + "/" + i.length);
                              });
                            case 2:
                              t.$load.hide();
                              t.$emit("updataPreview");
                              t.$bp.add("mb_046");
                            case 5:
                            case "end":
                              return e.stop();
                          }
                        }
                      }, e);
                    })));
                  case 19:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          })), 50);
        },
        openTemplateOs: function () {
          this.open();
          this.$cep.openUrl(N.a.url.mbOs);
          this.$bp.add("mb_048");
        },
        openFolder: function () {
          this.open();
          this.$cep.jsxNoCheck("Fs_openFolder", [this.data.dir]);
          this.$bp.add("mb_049");
        },
        openDefaultFolder: function () {
          this.open();
          this.$cep.jsxNoCheck("Fs_openFolder", [this.data.getDefaultFolderPath()]);
          this.$bp.add("mb_010");
        },
        createNewTemplate: function () {
          this.showCreateNewTemp = true;
          this.open();
          this.$bp.add("mb_040");
        },
        openLabelManage: function () {
          this.$emit("toggleTagPanelVisible", true);
        },
        openTemplate: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            var n;
            var a;
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    t.open();
                    e.next = 3;
                    return t.$cep.jsxNoCheck("Fs_selectFolder");
                  case 3:
                    n = e.sent;
                    t.$log.push("open temp " + n);
                    if (n != -1) {
                      e.next = 7;
                      break;
                    }
                    return e.abrupt("return");
                  case 7:
                    try {
                      a = t.$temp.openTemplate(n);
                      if (a == "") {
                        t.$tips.show("打开成功");
                      } else {
                        t.$msg.showErr(a);
                      }
                      t.$emit("updataPreview");
                    } catch (i) {
                      t.$tips.showErr("发生未知错误：" + i);
                    }
                    t.$bp.add("mb_041");
                  case 9:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          }))();
        },
        createNewTempHandle: function (t) {
          this.showCreateNewTemp = false;
          var e = this.$temp.createNewTemplate(t);
          if (e === "") {
            G.a.success("新建成功");
          } else {
            G.a.error("新建失败");
          }
          this.$emit("updataPreview");
        },
        open: function () {
          this.$store.state.showMenu = this.$store.state.showMenu == this.condition ? -1 : this.condition;
        },
        openHistory: function (t) {
          this.$temp.openHistoryLibrary(t);
          this.$emit("updataPreview");
          G.a.success("已切换模板库");
        },
        addEventListeners: function () {
          this.$on("importFolder", this.importFolder);
          this.$on("importPack", this.importPack);
          this.$on("createNewTemplate", this.createNewTemplate);
          this.$on("openTemplate", this.openTemplate);
        }
      }
    }