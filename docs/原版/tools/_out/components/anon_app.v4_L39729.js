{
      components: {
        hierarchyDropDown: Zm,
        dropDowncom: gm,
        BaseSvg: ev.a
      },
      data: function () {
        return {
          set: V.a.info,
          setButtonTitle: ["第1层级字号", "第2层级字号", "第3层级字号", "第4层级字号", "第5层级字号", "第6层级字号"],
          layoutIstrue: false,
          HierarchySvgNavIstrue: false,
          hierarchyInput: [0, 0, 0, 0, 0, 0],
          layoutButton: ["常规", "强烈", "接近", "相同"],
          layoutIntervalOne: "40",
          data: new Ft(),
          autoCountInterval: true,
          layoutScene: 1,
          layoutSceneArr: ["海报", "分类", "标题", "正文"],
          layoutAlignment: 0,
          layoutAlignmentArr: ["左对齐", "居中对齐", "右对齐"],
          layoutNumber: 3,
          layoutAllScale: {
            mode2: [[0.5], [1], [1.5], [2], [2.5], [3], [3.5], [4], [4.5], [5], [5.5], [6], [6.5], [7], [7.5], [8]],
            mode3: [[0.8, 1.5], [0.8, 4.8], [1.5, 0.8], [2.5, 1], [0.8, 0.8], [1.5, 1.5], [1.5, 3], [3, 1.5], [1, 2.5], [1, 6], [4, 1], [6, 1], [2, 2], [4, 4], [3, 6], [6, 3]],
            mode4: [[1, 2.5, 0.8], [1.5, 3, 1], [1, 2.5, 2.5], [2, 0.8, 2], [2, 1, 4], [2, 1, 5], [2, 2, 0.8], [1, 1, 1], [1, 4, 1], [1.5, 6, 1], [1, 2.5, 5], [4, 0.8, 4], [3, 1.2, 6], [4, 1.2, 8], [4, 4, 1.2], [2.5, 2.5, 2.5]],
            mode5: [[0.8, 2, 0.8, 3], [2, 0.8, 3, 0.8], [0.8, 3, 3, 0.8], [0.8, 1, 4, 0.8], [0.8, 4, 0.8, 1], [3, 0.8, 2, 4], [0.5, 1, 1, 2], [3, 2, 1, 1], [1, 4, 1, 5], [4, 1, 5, 1], [1.2, 5, 5, 1.2], [1, 1.5, 6, 1.5], [1, 6, 1, 1.5], [4, 1, 2.5, 6], [1, 2, 2, 4], [5, 3, 1.5, 1.5]]
          },
          layoutScaleText: ""
        };
      },
      created: function () {
        var t = this;
        this.hierarchyInput = Object(ft.c)(this.set.ztHierarych);
        this.setLayoutScaleText(0);
        tv.$on("ctrlClickFun", function () {
          t.layoutIstrue = false;
          t.HierarchySvgNavIstrue = false;
        });
      },
      computed: {
        HierarchySvgContext: function () {
          return this.data.info.list[this.data.info.index].name;
        },
        layoutAlignScale: function () {
          var t = [];
          if (this.layoutNumber < 2 || this.layoutNumber > 5) {
            t.push("请选择2-5个图层");
            return t;
          }
          var e;
          var n = this.layoutAllScale["mode" + this.layoutNumber];
          var a = Object(T.a)(n);
          try {
            for (a.s(); !(e = a.n()).done;) {
              var i = e.value;
              t.push(i.join(":"));
            }
          } catch (r) {
            a.e(r);
          } finally {
            a.f();
          }
          return t;
        },
        hierarychyName: function () {
          var t = JSON.stringify(this.set.ztHierarych);
          var e = JSON.stringify(this.data.info.list[this.data.info.index].data);
          if (t != e) {
            return "自定义";
          } else {
            return this.data.info.list[this.data.info.index].name;
          }
        }
      },
      methods: {
        fpSetFontSize: function (t) {
          if (Object(ft.f)()) {
            this.$freePanelBox.show(t, "zt_setFontSize", t);
          }
        },
        syncToServe: function () {
          this.$delay.add("syncFontHierarych", this.syncFileToServe);
        },
        syncFileToServe: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            var n;
            var a;
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    n = t.$sync.getFileName(N.a.path.ztHierarych);
                    t.$syncTips.show("同步更改...", 5, 100);
                    e.next = 4;
                    return t.$sync.pushFile([n], function (e, n) {
                      t.$syncTips.show("同步更改...", e + 5, n);
                    });
                  case 4:
                    a = e.sent;
                    t.$syncTips.hide();
                    if (a.err != 1) {
                      e.next = 11;
                      break;
                    }
                    if (a.new) {
                      e.next = 9;
                      break;
                    }
                    return e.abrupt("return", t.$msg.showErr(a.msg));
                  case 9:
                    t.$msg.confirm(a.msg);
                    return e.abrupt("return", false);
                  case 11:
                    t.$syncTips.showSuccess("同步层级预设成功");
                  case 12:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          }))();
        },
        ctrlMysvg: function () {
          if (Object(ft.f)()) {
            this.ctrlClick();
          } else {
            this.HierarchySvgNavIstrue = !this.HierarchySvgNavIstrue;
          }
        },
        ctrlClick: function () {
          tv.$emit("ctrlClickFun");
        },
        showLayout: function () {
          if (Object(ft.f)()) {
            this.ctrlClick();
          } else {
            this.layoutIstrue = !this.layoutIstrue;
          }
          if (this.layoutIstrue) {
            this.$psEvent.add("1936483188", "ztSwitchLayer", this.switchLayer);
          } else {
            this.$psEvent.remove("1936483188", "ztSwitchLayer");
          }
        },
        switchLayer: function (t) {
          var e = this;
          return Object(d.a)(regeneratorRuntime.mark(function n() {
            return regeneratorRuntime.wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    e.layoutNumber = t.length;
                  case 1:
                  case "end":
                    return n.stop();
                }
              }
            }, n);
          }))();
        },
        changeScale: function (t) {
          this.setLayoutScaleText(t[0]);
          this.setSpacing();
        },
        setLayoutScaleText: function (t) {
          this.layoutScaleText = this.layoutAlignScale[t];
        },
        setSpacing: function () {
          var t = this.autoCountInterval ? "" : this.layoutIntervalOne;
          this.$cep.jsxHistory("ls_znpb_DanDuTiaoZhengJianJu", [this.layoutScaleText, t], "调整间距");
        },
        changeAlign: function (t) {
          this.layoutAlignment = t[0];
          this.$cep.jsxHistory("zt_setTextAlignment", [this.layoutAlignment], this.layoutAlignmentArr[this.layoutAlignment]);
        },
        changeSence: function (t) {
          this.layoutScene = t[0] + 1;
        },
        setType: function (t) {
          var e = this;
          return Object(d.a)(regeneratorRuntime.mark(function n() {
            var a;
            var i;
            var r;
            return regeneratorRuntime.wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    a = e.autoCountInterval ? "" : e.layoutIntervalOne;
                    i = e.layoutScaleText.split(":");
                    r = {
                      sence: e.layoutScene,
                      type: t,
                      align: e.layoutAlignment,
                      fontSize: e.set.ztHierarych,
                      interval: 0,
                      spacing: a,
                      scale: i
                    };
                    e.$load.show("正在应用排版...");
                    n.next = 6;
                    return e.$cep.jsxHistory("zt_smartTypesetting", [r], "智能排版");
                  case 6:
                    e.$load.hide();
                  case 7:
                  case "end":
                    return n.stop();
                }
              }
            }, n);
          }))();
        },
        edie: function (t) {
          var e = this;
          this.$inputBox.show(function (n) {
            e.data.rename(n, t);
            e.$tips.show("重命名成功");
          }, "请输入新的名字");
        },
        deleteIndex: function (t) {
          var e = this.data.delete(t);
          this.$tips.show(e == "" ? "删除成功" : e);
          this.syncToServe();
        },
        updata: function () {
          var t = this.data.updataCurrent(this.set.ztHierarych);
          this.$tips.show(t == "" ? "更新成功" : t);
          this.syncToServe();
          this.$bp.add("zt_011");
        },
        saveHierarych: function () {
          var t = this;
          this.$inputBox.show(function (e) {
            t.data.add(e, Object(ft.c)(t.set.ztHierarych));
            t.$tips.show("添加成功");
            t.syncToServe();
            t.$bp.add("zt_0010");
          }, "请输入层级名字");
        },
        setFontSize: function (t) {
          var e = this;
          return Object(d.a)(regeneratorRuntime.mark(function n() {
            var a;
            return regeneratorRuntime.wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    n.next = 2;
                    return e.$cep.jsx("zt_setFontSize", [t]);
                  case 2:
                    a = n.sent;
                    if (a.err == 1) {
                      e.$tips.show(a.msg);
                    }
                    e.$bp.add("zt_009");
                  case 5:
                  case "end":
                    return n.stop();
                }
              }
            }, n);
          }))();
        },
        changeHierarych: function (t) {
          var e = this.data.setIndex(t);
          this.set.ztHierarych = e.data;
          this.hierarchyInput = Object(ft.c)(e.data);
          this.$tips.show("切换成功");
        },
        dropOpen: function (t) {
          this.$refs[t].open();
        }
      }
    }