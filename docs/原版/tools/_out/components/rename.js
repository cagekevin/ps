{
      name: "Rename",
      components: {
        dropDown: gm
      },
      data: function () {
        return {
          switchdata: ["默认", "替换"],
          switchindex: V.a.getKey("cmmSwitchindex"),
          colorData: ["#B0423F", "#A5620A", "#AA890A", "#5F823C", "#526F99", "#7155A0", "#6A6A6A"],
          showColorSign: V.a.getKey("cmmShowColorSign"),
          changeval: "",
          replace: "",
          newtext: "",
          data: null,
          moveEndIndex: null,
          isTopDrag: false,
          starColorData: null,
          starindex: null,
          starnode: null,
          filterData: ["过滤子图层"],
          isFilter: true
        };
      },
      watch: {
        showColorSign: function () {
          V.a.setKey("cmmShowColorSign", this.showColorSign);
        },
        switchindex: function () {
          V.a.setKey("cmmSwitchindex", this.switchindex);
        }
      },
      created: function () {
        var t = this;
        this.init();
        this.$appBus.on("syncReloadRename", function () {
          t.data.reload();
        });
      },
      methods: {
        drop: function (t, e) {
          if (!this.isTopDrag) {
            this.moveEndIndex = [t, e];
          }
        },
        drag: function (t, e, n) {
          var a = this;
          this.isTopDrag = false;
          var i = this.data.info[t].list[e];
          this.moveEndIndex = [t, e];
          am({
            classval: n,
            Callback: function (n) {
              if (t != a.moveEndIndex[0] || e != a.moveEndIndex[1]) {
                a.data.info[t].list.splice(e, 1);
                if (e > a.moveEndIndex[1] || t != a.moveEndIndex[0]) {
                  if (n) {
                    a.data.info[a.moveEndIndex[0]].list.splice(a.moveEndIndex[1], 0, i);
                  } else {
                    a.data.info[a.moveEndIndex[0]].list.splice(a.moveEndIndex[1] + 1, 0, i);
                  }
                } else if (n) {
                  a.data.info[a.moveEndIndex[0]].list.splice(a.moveEndIndex[1] - 1, 0, i);
                } else {
                  a.data.info[a.moveEndIndex[0]].list.splice(a.moveEndIndex[1], 0, i);
                }
                a.data.updata();
              }
            }
          });
        },
        dragColorWrapDrop: function (t) {
          if (this.isTopDrag && t != 0) {
            this.moveEndIndex = t;
          }
        },
        dragColorWrap: function (t, e, n) {
          var a = this;
          if (Object(ft.f)() && t != 0) {
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
          }
        },
        init: function () {
          this.data = new $S();
        },
        filterFun: function (t) {
          this.isFilter = t.length == 1;
        },
        dropOpen: function (t) {
          this.$refs[t].open();
        },
        exportFile: function () {
          var t = D.a.saveFile("导出", ["cmm"], "重命名.cmm", "设计助理导出文件");
          if (t !== false) {
            if (D.a.write(t, JSON.stringify(this.data.info))) {
              this.$tips.show("导出成功");
            } else {
              this.$tips.show("导出失败，请重试");
            }
          }
        },
        importFile: function () {
          var t = D.a.openFile("导入重命名预设", ["cmm"], "设计助理导入文件");
          if (t !== false) {
            var e = D.a.read(t);
            if (e === false) {
              return this.$tips.show("导入失败，文件读取失败");
            }
            try {
              var n = JSON.parse(e);
              this.data.info = n;
            } catch (a) {
              n = this.oldFileToNewFile(e);
              if (!(n.length > 0)) {
                return this.$tips.show("导入失败");
              }
              this.data.info = n;
            }
            this.data.updata();
            this.$tips.show("导入成功");
            this.syncRenameFileToServe();
          }
        },
        oldFileToNewFile: function (t) {
          var e = [];
          try {
            var n = t.split("<z>");
            n.pop();
            for (var a = 0; a < n.length; a++) {
              var i = n[a].split("<>");
              if (i.length > 0) {
                var r = {
                  name: i[0],
                  show: true,
                  list: []
                };
                for (var s = 1; s < i.length; s++) {
                  r.list.push(i[s]);
                }
                e.push(r);
              }
            }
          } catch (o) {}
          return e;
        },
        showTips: function (t) {
          var e = this;
          var n = this.$menu.getStatus();
          if (!n) {
            function a(t) {
              var n = ["%n", "%nn", "%%n", "%%nn", "%n=", "###"];
              var a = e.changeval;
              if (a.indexOf(n[3]) != -1) {
                a = a.replace(n[3], "");
              } else if (a.indexOf(n[2]) != -1) {
                a = a.replace(n[2], "");
              } else if (a.indexOf(n[1]) != -1) {
                a = a.replace(n[1], "");
              } else if (a.indexOf(n[4]) != -1) {
                a = a.replace(n[4], "");
              } else if (a.indexOf(n[0]) != -1) {
                a = a.replace(n[0], "");
              }
              e.changeval = a + n[t];
              e.$refs.refInput.focus();
            }
            var i = [{
              text: "%n 从下到上排序(1/2...)",
              callback: a
            }, {
              text: "%nn 从下到上排序(01/02...)",
              callback: a
            }, {
              text: "%%n 从上到下排序(1/2..)",
              callback: a
            }, {
              text: "%%nn 从上到下排序(01/02..)",
              callback: a
            }, {
              text: "%n=? 需要从?数字开始排序 ",
              callback: a
            }, {
              text: "### 保留原来名字 可组合上方内容",
              callback: a
            }];
            var r = this.$refs.topInput;
            var s = r.offsetLeft + 10;
            var o = r.offsetTop + 32;
            this.$menu.show(i, true, s + "px", o + "px");
          }
        },
        syncRenameFileToServe: function () {
          var t = this.$sync.getFileName(this.$config.path.cmmRename);
          this.$appBus.emit("syncChangeFileToServe", "syncRenameLayer", [t], "重命名");
        },
        addGroup: function (t) {
          var e = this;
          this.$inputBox.show(function (n) {
            e.data.addGroup(n, t);
            e.syncRenameFileToServe();
          }, "请输入组名");
        },
        latelyUsed: function (t, e) {
          this.data.info[e].show = !this.data.info[e].show;
          this.data.updata();
        },
        colorFun: function () {
          this.showColorSign = !this.showColorSign;
        },
        showMenu: function (t, e, n) {
          var a = this;
          if (Object(ft.f)()) {
            var i = this.data.getItem(e, n);
            this.$freePanelBox.show(i, "cmm_useRename", i);
          } else if (e != 0) {
            var r = [{
              text: "修改",
              groupIndex: e,
              index: n,
              callback: function (t, i) {
                a.$inputBox.show(function (t) {
                  a.data.changeItem(t, e, n);
                }, "请输入图层名或表达式", a.data.info[e].list[n]);
              }
            }, {
              text: "删除",
              groupIndex: e,
              index: n,
              callback: function (t, e) {
                a.data.deleteItem(e.groupIndex, e.index);
              }
            }];
            this.$menu.show(r, true, t);
          }
        },
        showGroupMenu: function (t, e) {
          var n = this;
          if (t.ctrl) {
            var a;
            var i = {
              text: [],
              key: [],
              option: []
            };
            var r = Object(T.a)(this.data.info[e].list);
            try {
              for (r.s(); !(a = r.n()).done;) {
                var s = a.value;
                i.text.push(s);
                i.key.push("cmm_useRename");
                i.option.push(s);
              }
            } catch (c) {
              r.e(c);
            } finally {
              r.f();
            }
            this.$freePanelBox.batchShow("批量添加重命名组", i);
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
                  n.syncRenameFileToServe();
                }, "请输入新组名", n.data.getGroupName(e));
              }
            }, {
              text: "删除",
              index: e,
              callback: function (t, a) {
                n.data.deleteGroup(e);
                n.syncRenameFileToServe();
              }
            }];
            if (e == 0) {
              o.splice(1, 3);
            }
            this.$menu.show(o, true, t.event);
          }
        },
        setLayerColor: function (t) {
          this.$cep.jsx("cmm_setLayerColor", [t]);
          this.$bp.add("cmm_002");
        },
        useBatchRename: function (t) {
          var e = this;
          return Object(d.a)(regeneratorRuntime.mark(function n() {
            return regeneratorRuntime.wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    e.data.addHistory(t);
                    e.$menu.hide();
                    e.$load.show("正在批量重命名...");
                    n.next = 5;
                    return e.$cep.jsxHistory("cmm_batchName", [t, e.isFilter], "重命名");
                  case 5:
                    e.$load.hide("");
                    e.$tracker.functionApply({
                      function_source: `重命名图层页_${e.switchdata[e.switchindex]}`,
                      function_name: "重命名图层"
                    });
                  case 7:
                  case "end":
                    return n.stop();
                }
              }
            }, n);
          }))();
        },
        useRename: function () {
          var t = this.checkVal(this.changeval);
          if (t != "") {
            return this.$tips.show(t);
          }
          this.useBatchRename(this.changeval);
        },
        clickUseRename: function (t) {
          this.useRename();
        },
        useReplace: function () {
          var t = this.checkVal(this.replace);
          if (t != "") {
            return this.$tips.show("不能输入空字符哦");
          }
          var e = this.replace + "=>" + this.newtext;
          this.useBatchRename(e);
        },
        checkVal: function (t) {
          var e = "";
          var n = t.replace(/\s*/g, "");
          if (t == "" || n == "") {
            e = "不能输入空字符哦";
          }
          return e;
        },
        addToGroup: function (t) {
          var e = this;
          this.$inputBox.show(function (n) {
            e.data.addItem(t, n);
            e.syncRenameFileToServe();
          }, "请输入预设文本");
        }
      },
      mounted: function () {
        this.$log.push("rename");
      }
    }