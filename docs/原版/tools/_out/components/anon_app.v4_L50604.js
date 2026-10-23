{
      components: {},
      props: {
        data: {
          type: Object,
          default: function () {
            return {};
          }
        },
        change: null
      },
      data: function () {
        return {
          imgPath: N.a.path.kuGradient + "/",
          testArr: [],
          moveEndIndex: null,
          isTopDrag: false,
          isMac: D.a.getOsPrefix()
        };
      },
      created: function () {
        this.getGradientArr();
      },
      watch: {
        change: function () {
          this.getGradientArr();
        }
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
                a.getGradientArr();
                a.data.updata();
              }
            }
          });
        },
        dragColorWrapDrop: function (t) {
          if (this.isTopDrag) {
            this.moveEndIndex = t;
          }
        },
        dragColorWrap: function (t, e, n) {
          var a = this;
          if (Object(ft.f)()) {
            var i = event.currentTarget;
            this.isTopDrag = true;
            var r = this.data.info[t];
            this.moveEndIndex = t;
            this.$nextTick(function () {
              am({
                before: function () {
                  a.data.info[t].show = false;
                },
                floatStyle: "background-color:#006FFF;width:200px;height: 24px;line-height: 24px;border-radius: 4px;",
                floatNode: i,
                classval: e,
                scrollTopClass: n,
                isTop: true,
                Callback: function (e) {
                  if (t != a.moveEndIndex) {
                    a.data.info.splice(t, 1);
                    if (t > a.moveEndIndex) {
                      if (e) {
                        a.data.info.splice(a.moveEndIndex, 0, r);
                      } else {
                        a.data.info.splice(a.moveEndIndex + 1, 0, r);
                      }
                    } else if (e) {
                      a.data.info.splice(a.moveEndIndex - 1, 0, r);
                    } else {
                      a.data.info.splice(a.moveEndIndex, 0, r);
                    }
                    a.getGradientArr();
                    a.data.updata();
                  }
                }
              });
            });
          }
        },
        getGradientArr: function () {
          console.log(this.colorData);
          var t = [];
          var e = [];
          var n = [];
          var a = [];
          this.data.info.filter(function (t, a) {
            t.list.filter(function (t, a) {
              e.push(t.gradient.gradient.colors);
              n.push(t.gradient.angle);
            });
          });
          e.filter(function (t, e) {
            a[e] = [];
            t.filter(function (t, n) {
              a[e].push("#" + t.color.hexValue + " " + t.location / 4096 * 100 + "%");
            });
            a[e] = 90 + n[e] + "deg," + a[e].join(",");
          });
          var i = 0;
          this.data.info.filter(function (e, n) {
            t[n] = [];
            e.list.filter(function (e, r) {
              t[n].push(a[i]);
              i++;
            });
          });
          this.testArr = t;
        },
        addGradients: function (t) {
          var e = this;
          return Object(d.a)(regeneratorRuntime.mark(function n() {
            var a;
            var i;
            return regeneratorRuntime.wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    e.$tracker.buttonClick({
                      button_source: "样式面板页",
                      button_name: "添加渐变"
                    });
                    n.next = 3;
                    return e.$cep.jsx("ys_getGradientInfo");
                  case 3:
                    a = n.sent;
                    if (a !== false) {
                      n.next = 6;
                      break;
                    }
                    return n.abrupt("return", false);
                  case 6:
                    if (a.err != 1) {
                      n.next = 8;
                      break;
                    }
                    return n.abrupt("return", e.$msg.showErr(a.msg));
                  case 8:
                    i = {
                      name: "未命名",
                      gradient: a.data
                    };
                    e.data.addItem(t, i);
                    e.getGradientArr();
                    e.$emit("updataSync");
                    e.$tracker.functionApply({
                      function_source: "样式面板页",
                      function_name: "添加渐变"
                    });
                  case 13:
                  case "end":
                    return n.stop();
                }
              }
            }, n);
          }))();
        },
        useGradients: function (t) {
          this.$tracker.buttonClick({
            button_source: "样式面板页",
            button_name: "应用渐变"
          });
          this.$cep.jsxHistory("ys_useGradient", [t.gradient], "填充渐变色");
          this.$tracker.functionApply({
            function_source: "样式面板页",
            function_name: "应用渐变"
          });
        },
        setGroupShow: function (t, e) {
          this.data.changeGroupShowStatus(e, t.ctrl);
        },
        showItemMenu: function (t, e, n) {
          var a = this;
          var i = [{
            text: "删除",
            callback: function (t, i) {
              var r = a.data.deleteItem(e, n);
              a.$tips.show(r ? "删除成功" : "删除失败");
              a.getGradientArr();
              a.$emit("updataSync");
            }
          }, {
            text: "重命名",
            callback: function (t, i) {
              a.$inputBox.show(function (t) {
                a.data.renameItem(t, e, n);
                a.$emit("updataSync");
              }, "请输入颜色名称");
            }
          }];
          this.$menu.show(i, true, t);
        },
        showGroupMenu: function (t, e) {
          var n = this;
          var a = [{
            text: "创建新组",
            svg: "#iconchuangjian",
            index: e,
            callback: function (t, a) {
              n.$inputBox.show(function (t) {
                n.data.addGroup(t, e);
                n.getGradientArr();
                n.$emit("updataSync");
              }, "请输入组名");
            }
          }, {
            text: "fg"
          }, {
            text: "删除",
            index: e,
            callback: function (t, e) {
              var a = n.data.deleteGroup(e.index);
              n.$tips.show(a ? "删除成功" : "删除失败");
              n.getGradientArr();
              n.$emit("updataSync");
            }
          }, {
            text: "重命名",
            index: e,
            callback: function (t, e) {
              n.$inputBox.show(function (t) {
                n.data.renameGroup(t, e.index);
                n.$emit("updataSync");
              }, "请输入组名", n.data.getGroupName(e.index));
            }
          }, {
            text: "fg"
          }, {
            text: "发送到仓库...",
            index: e,
            callback: function (t, e) {
              n.$emit("sendWarehouse", n.data.info[e.index]);
              n.$bp.add("ysGra_001");
            }
          }, {
            text: "移动到仓库...",
            index: e,
            callback: function (t, e) {
              n.$emit("moveWarehouse", n.data.info[e.index], e.index);
              n.$bp.add("ysGra_002");
            }
          }];
          this.$menu.show(a, true, t.event);
        },
        addPopup: function () {}
      },
      mounted: function () {}
    }