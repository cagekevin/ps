{
      name: "Action",
      components: {
        open: pS,
        addContext: OS,
        warehouse: zS
      },
      data: function () {
        return {
          moveEndIndex: null,
          isTopDrag: false,
          addIndex: -1,
          FunIstrue: true,
          mouseFunIstrue: -1,
          btnLayout: "btn-min-3",
          showAdd: false,
          data: [],
          wh: null,
          updataWh: false,
          showListType: 2,
          menuData: [{
            text: "单列",
            svg: "",
            callback: this.menuCallback
          }, {
            text: "双列",
            svg: " ",
            callback: this.menuCallback
          }, {
            text: "三列",
            svg: " ",
            callback: this.menuCallback
          }],
          addGroupName: "动作分组"
        };
      },
      created: function () {
        this.init();
        this.menuCallback(V.a.getKey("dzShowListType"));
        this.$appBus.on("syncReloadAction", this.init());
      },
      methods: {
        firstUse: function () {
          var t = this;
          if (V.a.info.dzShowGuide != 0) {
            setTimeout(function () {
              try {
                if (t.wh.info.list.length == 1 && t.wh.info.list[0].name == "默认仓库") {
                  t.$msg.confirm("欢迎首次使用", "是否导入自带动作预设，含有修图、新建文档等功能", function () {
                    t.importDefaultAction();
                  });
                }
              } catch (e) {}
              V.a.info.dzShowGuide = false;
            }, 500);
          }
        },
        drop: function (t, e) {
          if (!this.isTopDrag) {
            this.moveEndIndex = [t, e];
          }
        },
        drag: function (t, e, n, a) {
          var i = this;
          if (Object(ft.f)()) {
            this.isTopDrag = false;
            var r = this.data.info[t].list[e];
            this.moveEndIndex = [t, e];
            am({
              classval: n,
              ml: -40,
              Callback: function (n) {
                if (t != i.moveEndIndex[0] || e != i.moveEndIndex[1]) {
                  i.data.info[t].list.splice(e, 1);
                  if (e > i.moveEndIndex[1] || t != i.moveEndIndex[0]) {
                    if (n) {
                      i.data.info[i.moveEndIndex[0]].list.splice(i.moveEndIndex[1], 0, r);
                    } else {
                      i.data.info[i.moveEndIndex[0]].list.splice(i.moveEndIndex[1] + 1, 0, r);
                    }
                  } else if (n) {
                    i.data.info[i.moveEndIndex[0]].list.splice(i.moveEndIndex[1] - 1, 0, r);
                  } else {
                    i.data.info[i.moveEndIndex[0]].list.splice(i.moveEndIndex[1], 0, r);
                  }
                  i.data.updata();
                }
              }
            });
          }
        },
        dragColorWrapDrop: function (t) {
          if (this.isTopDrag) {
            this.moveEndIndex = t;
          }
        },
        dragColorWrap: function (t, e, n) {
          var a = this;
          if (!Object(ft.f)()) {
            return false;
          }
          this.isTopDrag = true;
          var i = this.data.info[t];
          this.moveEndIndex = t;
          var r = event.currentTarget;
          this.$nextTick(function () {
            am({
              before: function () {
                a.data.info[t].show = false;
              },
              floatStyle: "background-color:#006FFF;width:200px;border-radius: 4px;",
              floatNode: r,
              classval: e,
              scrollTopClass: n,
              isTop: true,
              ml: -40,
              Callback: function (e) {
                if (t != a.moveEndIndex) {
                  a.data.info.splice(t, 1);
                  if (t > a.moveEndIndex) {
                    if (e) {
                      a.data.info.splice(a.moveEndIndex, 0, i);
                    } else {
                      a.data.info.splice(a.moveEndIndex + 1, 0, i);
                    }
                  } else if (e) {
                    a.data.info.splice(a.moveEndIndex - 1, 0, i);
                  } else {
                    a.data.info.splice(a.moveEndIndex, 0, i);
                  }
                  a.data.updata();
                }
              }
            });
          });
        },
        callAction: function (t, e) {
          this.$tracker.buttonClick({
            button_source: "动作管理页",
            button_name: "动作运用"
          });
          var n = this.data.info[t].list[e];
          this.$cep.jsxHistoryNoCheck("dz_callAction", [n], "动作-" + n.name);
          this.$tracker.functionApply({
            function_source: "动作管理页",
            function_name: "动作运用"
          });
          this.$bp.add("dz_001");
        },
        init: function () {
          this.wh = new ES.a(N.a.path.actionLibrary, N.a.path.user);
          this.data = new LS(this.wh.getCurrentFullPath());
        },
        exportFile: function () {
          var t = this;
          if (this.$menu.getStatus()) {
            return this.$menu.hide();
          }
          var e = [{
            text: "导出所有仓库",
            callback: function () {
              var e = D.a.saveFile("导出预设", ["dzx"], "全部仓库.dzx", "动作仓库.dzx");
              if (e === false) {
                return t.$tips.show("取消操作");
              }
              var n = t.wh.export(e);
              t.$tips.show(n ? "导出成功" : "导出失败");
            }
          }, {
            text: "导出当前仓库",
            callback: function () {
              var e = D.a.saveFile("导出预设", ["dzx"], t.wh.getCurrentName() + ".dzx", "动作仓库.dzx");
              if (e === false) {
                return t.$tips.show("取消操作");
              }
              var n = t.wh.exportCurrent(e);
              t.$tips.show(n ? "导出成功" : "导出失败");
            }
          }];
          var n = this.$refs.refShowList;
          var a = n.offsetLeft + 80;
          var i = n.offsetTop - 75;
          this.$menu.show(e, true, a + "px", i + "px");
        },
        importFile: function () {
          var t = this;
          if (this.$menu.getStatus()) {
            return this.$menu.hide();
          }
          var e = [{
            text: "导入动作仓库",
            callback: function () {
              var e = D.a.openFile("导入动作", ["dzx"], "*.dzx");
              if (e === false) {
                return t.$tips.show("取消操作");
              }
              var n = t.wh.import(e);
              t.$tips.show(n === true ? "导入成功" : "导入失败");
              if (n) {
                t.updataWh = !t.updataWh;
                t.data = new LS(t.wh.getCurrentFullPath());
                t.syncChangToServe();
              }
            }
          }, {
            text: "追加动作仓库",
            callback: function () {
              var e = D.a.openFile("追加动作", ["dzx"], "*.dzx");
              if (e === false) {
                return t.$tips.show("取消操作");
              }
              var n = t.wh.importAdd(e);
              t.$tips.show(n === true ? "追加成功" : "追加失败");
              if (n) {
                t.updataWh = !t.updataWh;
                t.data = new LS(t.wh.getCurrentFullPath());
                t.syncChangToServe();
              }
            }
          }, {
            text: "fg"
          }, {
            text: "追加插件自带预设",
            callback: function () {
              var e = false;
              for (var n = 0; n < t.wh.info.list.length; n++) {
                var a = t.wh.info.list[n];
                if (a.name == "动作库-设计助理预设") {
                  e = true;
                  break;
                }
              }
              if (e == 1) {
                t.$msg.confirm("导入提示", "已存在同名的自带预设，是否继续导入？", t.importDefaultAction);
              } else {
                t.importDefaultAction();
              }
            }
          }];
          var n = this.$refs.refShowList;
          var a = n.offsetLeft + 50;
          var i = n.offsetTop - 118;
          this.$menu.show(e, true, a + "px", i + "px");
        },
        importDefaultAction: function () {
          var t = this;
          var e = N.a.path.roaming + "/fz.FengZi1Hao/preset/";
          var n = this.wh.importAdd(e + "动作库-设计助理预设.dzx");
          this.$tips.show(n === true ? "追加成功" : "追加失败");
          if (n) {
            this.updataWh = !this.updataWh;
            this.data = new LS(this.wh.getCurrentFullPath());
            setTimeout(function () {
              var e = t.$sync.getFileName(t.wh.getCurrentFullPath());
              var n = t.$sync.getFileName(t.$config.path.actionLibrary);
              t.$appBus.emit("syncChangeFileToServe", "syncActionWarehouse", [n, e], "动作");
            }, 500);
          }
        },
        syncChangToServe: function () {
          var t = this.$sync.getFileName(this.wh.getCurrentFullPath());
          this.$appBus.emit("syncChangeFileToServe", "syncActionItem", [t], "动作分组");
        },
        syncChangeWarehouseToServe: function () {
          var t = this.$sync.getFileName(this.$config.path.actionLibrary);
          this.$appBus.emit("syncChangeFileToServe", "syncActionWarehouse", [t], "动作仓库");
        },
        delWarehouseGroup: function (t) {
          var e = this.wh.delete(t);
          if (e === false) {
            return false;
          }
          this.$tips.show("删除成功");
          this.syncChangeWarehouseToServe();
          this.data = new LS(this.wh.getCurrentFullPath());
          for (var n = 0; n < e.length; n++) {
            e[n] = this.$sync.getFileName(e[n]);
          }
          this.$sync.deletePath(e);
        },
        addWarehouseGroup: function () {
          this.wh.add();
          this.syncChangeWarehouseToServe();
        },
        renameWarehouse: function (t) {
          this.wh.rename(t.index, t.val);
          this.syncChangeWarehouseToServe();
        },
        selectWarehouse: function (t) {
          this.wh.select(t);
          this.data = new LS(this.wh.getCurrentFullPath());
        },
        showMenu: function (t, e, n) {
          var a = this;
          if (Object(ft.f)()) {
            var i = this.data.getItem(e, n);
            this.$freePanelBox.show(i.name, "dz_useAction", i);
            return false;
          }
          var r = this.data.getAlias(e, n);
          var s = [{
            text: "添加别名",
            groupIndex: e,
            index: n,
            callback: function (t, e) {
              a.$inputBox.show(function (t) {
                a.data.addAlias(e.groupIndex, e.index, t);
                a.syncChangToServe();
              }, "请输入别名");
            }
          }, {
            text: "删除",
            groupIndex: e,
            index: n,
            callback: function (t, e) {
              a.data.deleteItem(e.groupIndex, e.index);
              a.syncChangToServe();
            }
          }];
          if (r != "") {
            s[0].text = "修改别名";
            var o = {
              text: "删除别名",
              groupIndex: e,
              index: n,
              callback: function (t, e) {
                a.data.deleteAlias(e.groupIndex, e.index);
                a.syncChangToServe();
              }
            };
            s.splice(1, 0, o);
          }
          this.$menu.show(s, true, t);
        },
        showGroupMenu: function (t, e) {
          var n = this;
          if (t.ctrl) {
            var a;
            var i = {
              text: [],
              key: [],
              option: Object(ct.a)(this.data.info[e].list)
            };
            var r = Object(T.a)(this.data.info[e].list);
            try {
              for (r.s(); !(a = r.n()).done;) {
                var s = a.value;
                i.text.push(s.name);
                i.key.push("dz_useAction");
              }
            } catch (c) {
              r.e(c);
            } finally {
              r.f();
            }
            this.$freePanelBox.batchShow("批量添加动作组", i);
          } else {
            var o = [{
              svg: "#iconchuangjian",
              text: "创建新组",
              index: e,
              callback: function () {
                n.addGroup(e);
              }
            }, {
              text: "fg"
            }, {
              text: "重命名",
              index: e,
              callback: function (t, a) {
                n.$inputBox.show(function (t) {
                  n.data.renameGroup(t, a.index);
                  n.syncChangToServe();
                }, "请输入新组名", n.data.getGroupName(e));
              }
            }, {
              text: "删除",
              index: e,
              callback: function (t, a) {
                n.data.deleteGroup(e);
                n.syncChangToServe();
              }
            }];
            this.$menu.show(o, true, t.event);
          }
        },
        addGroup: function (t) {
          var e = this;
          this.$inputBox.show(function (n) {
            e.data.addGroup(n, t);
            e.syncChangToServe();
          }, "请输入组名");
        },
        hideAddPopup: function () {
          this.showAdd = false;
        },
        showAddPopup: function (t) {
          this.addGroupName = this.data.info[t].groupName;
          this.showAdd = true;
          this.addIndex = t;
        },
        funOpen: function (t) {
          this.data.info[t].show = !this.data.info[t].show;
          this.data.updata();
        },
        addAction: function (t) {
          this.$tracker.buttonClick({
            button_source: "动作管理页",
            button_name: "添加动作"
          });
          var e = this.data.addList(this.addIndex, t);
          if (e !== false) {
            this.$tips.show("成功添加 " + e + " 个");
            this.syncChangToServe();
          }
          this.hideAddPopup();
          this.$tracker.functionApply({
            function_source: "动作管理页",
            function_name: "添加动作"
          });
        },
        setShowListType: function (t) {
          if (this.$menu.getStatus()) {
            return this.$menu.hide();
          }
          for (var e = 0; e < this.menuData.length; e++) {
            if (e == this.showListType) {
              this.menuData[e].svg = "#icongouxuan";
            } else {
              this.menuData[e].svg = " ";
            }
          }
          var n = this.$refs.refShowList;
          var a = n.offsetLeft + 20;
          var i = n.offsetTop - 106;
          this.$menu.show(this.menuData, true, a + "px", i + "px");
        },
        menuCallback: function (t, e) {
          this.showListType = t;
          V.a.setKey("dzShowListType", this.showListType);
          var n = ["btn-1", "btn-min-2", "btn-min-3"];
          this.btnLayout = n[t];
        }
      },
      mounted: function () {
        this.$log.push("action");
        this.firstUse();
      }
    }