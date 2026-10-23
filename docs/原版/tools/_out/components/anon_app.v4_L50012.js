{
      components: {},
      props: {
        data: {
          type: Object,
          default: function () {
            return {};
          }
        }
      },
      data: function () {
        return {
          isDrawColor: false,
          groupIndex: 0,
          moveEndIndex: null,
          isTopDrag: false,
          showInfo: null
        };
      },
      computed: {},
      created: function () {
        var t = this;
        this.$appBus.on("appSeBanSendColor", function (e) {
          t.data.addGroupItem(e);
          t.$tips.show("添加成功");
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
                a.$emit("updataSync");
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
            this.isTopDrag = true;
            var i = this.data.info[t];
            var r = event.currentTarget;
            this.moveEndIndex = t;
            this.$nextTick(function () {
              am({
                before: function () {
                  a.data.info[t].show = false;
                },
                classval: e,
                scrollTopClass: n,
                isTop: true,
                floatNode: r,
                floatStyle: "background-color:#006FFF;width:200px;height: 24px;line-height: 24px;border-radius: 4px;",
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
                    a.$emit("updataSync");
                  }
                }
              });
            });
          }
        },
        useColor: function (t, e, n) {
          var a = this;
          return Object(d.a)(regeneratorRuntime.mark(function i() {
            var r;
            return regeneratorRuntime.wrap(function (i) {
              while (1) {
                switch (i.prev = i.next) {
                  case 0:
                    a.$tracker.buttonClick({
                      button_source: "样式面板页",
                      button_name: "应用颜色"
                    });
                    t.isFill = true;
                    if (!Object(ft.f)()) {
                      i.next = 6;
                      break;
                    }
                    a.$cep.jsxHistory("ys_useShapeFill", [t], "智能填充形状颜色");
                    i.next = 20;
                    break;
                  case 6:
                    if (!Object(ft.g)()) {
                      i.next = 10;
                      break;
                    }
                    a.$cep.jsxHistory("ys_setBorderColor", [t], "智能填充边框颜色");
                    i.next = 20;
                    break;
                  case 10:
                    if (!Object(ft.e)()) {
                      i.next = 19;
                      break;
                    }
                    i.next = 13;
                    return a.$cep.jsxNoCheck("cy_changeStyleColor", [t], "更改颜色");
                  case 13:
                    r = i.sent;
                    if (r != -1) {
                      i.next = 16;
                      break;
                    }
                    return i.abrupt("return", a.$tips.show("取消操作"));
                  case 16:
                    a.data.changeItem(e, n, r);
                    i.next = 20;
                    break;
                  case 19:
                    a.$cep.jsxHistory("ys_useStyleColor", [t], "智能填充颜色");
                  case 20:
                    a.$tracker.functionApply({
                      function_source: "样式面板页",
                      function_name: "应用颜色"
                    });
                  case 21:
                  case "end":
                    return i.stop();
                }
              }
            }, i);
          }))();
        },
        setGroupShowStatus: function (t, e) {
          this.data.changeGroupShowStatus(e, t.ctrl);
        },
        addColor: function (t) {
          var e = this;
          return Object(d.a)(regeneratorRuntime.mark(function n() {
            var a;
            return regeneratorRuntime.wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    e.$tracker.buttonClick({
                      button_source: "样式面板页",
                      button_name: "添加颜色"
                    });
                    n.next = 3;
                    return e.$cep.jsx("ys_getForegroundColor");
                  case 3:
                    a = n.sent;
                    if (a != null) {
                      n.next = 6;
                      break;
                    }
                    return n.abrupt("return", e.$tips.show("添加失败"));
                  case 6:
                    e.data.addItem(t, a);
                    e.$tracker.functionApply({
                      function_source: "样式面板页",
                      function_name: "添加颜色"
                    });
                    e.$emit("updataSync");
                  case 9:
                  case "end":
                    return n.stop();
                }
              }
            }, n);
          }))();
        },
        sendMessageToSeBan: function () {
          this.$cep.sendAppEvent("com.fengzi.event.seban", "GengXin");
        },
        drawColorToGroup: function () {
          this.addColor(this.groupIndex);
        },
        cancelDrawColorToGroup: function () {
          this.$psEvent.remove("1936028772", "ysDrawColorToGroup");
          this.$psEvent.remove("1936483188", "ysCancelDrawColorToGroup");
          this.$tips.show("快速吸色到组已取消");
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
            text: "发送到色板",
            index: e,
            callback: function (t, e) {
              D.a.write(N.a.path.seBan, JSON.stringify(n.data.info[e.index].list));
              n.sendMessageToSeBan();
              n.$tips.show("发送成功");
              n.$bp.add("ysCol_001");
            }
          }, {
            text: "追加到色板",
            index: e,
            callback: function (t, e) {
              var a;
              var i = D.a.readToArray(N.a.path.seBan);
              var r = Object(T.a)(n.data.info[e.index].list);
              try {
                for (r.s(); !(a = r.n()).done;) {
                  var s = a.value;
                  i.push(s);
                }
              } catch (o) {
                r.e(o);
              } finally {
                r.f();
              }
              D.a.write(N.a.path.seBan, JSON.stringify(i));
              n.sendMessageToSeBan();
              n.$tips.show("追加成功");
              n.$bp.add("ysCol_002");
            }
          }, {
            text: "fg"
          }, {
            text: "快速吸色到组",
            index: e,
            callback: function (t, e) {
              n.isDrawColor = true;
              n.groupIndex = e.index;
              n.$psEvent.add("1936028772", "ysDrawColorToGroup", n.drawColorToGroup);
              n.$tips.show("开启成功，直接吸色即可");
              n.$cep.jsx("Tool_set", ["eyedropperTool"]);
              n.$psEvent.add("1936483188", "ysCancelDrawColorToGroup", n.cancelDrawColorToGroup);
              n.$bp.add("ysCol_003");
            }
          }, {
            text: "fg"
          }, {
            text: "发送到仓库...",
            index: e,
            callback: function (t, e) {
              n.$emit("sendWarehouse", n.data.info[e.index]);
              n.$bp.add("ysCol_005");
            }
          }, {
            text: "移动到仓库...",
            index: e,
            callback: function (t, e) {
              n.$emit("moveWarehouse", n.data.info[e.index], e.index);
              n.$bp.add("ysCol_006");
            }
          }];
          this.$menu.show(a, true, t.event);
        },
        showItemMenu: function (t, e, n) {
          var a = this;
          var i = [{
            text: "删除",
            callback: function (t, i) {
              var r = a.data.deleteItem(e, n);
              a.$tips.show(r ? "删除成功" : "删除失败");
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
          }, {
            text: "fg",
            callback: function (t, e) {
              a.$inputBox.show(function (t) {
                a.data.addGroup(t);
              }, "请输入组名");
            }
          }, {
            text: "发送到色板",
            callback: function (t, i) {
              var r = [a.data.info[e].list[n]];
              D.a.write(N.a.path.seBan, JSON.stringify(r));
              a.sendMessageToSeBan();
              a.$tips.show("追加成功");
            }
          }, {
            text: "追加到色板",
            callback: function (t, i) {
              var r = D.a.readToArray(N.a.path.seBan);
              r.push(a.data.info[e].list[n]);
              D.a.write(N.a.path.seBan, JSON.stringify(r));
              a.sendMessageToSeBan();
              a.$tips.show("追加成功");
            }
          }];
          this.$menu.show(i, true, t);
        },
        moveBlock: function (t, e, n) {
          var a = this;
          this.showInfo = this.data.info[t].list[e];
          var i = n.currentTarget.offsetLeft;
          var r = (document.querySelector(".Style-vueScroll") || {
            scrollTop: 0
          }).scrollTop;
          var s = n.currentTarget.offsetTop - r - 4;
          this.$nextTick(function () {
            var t = document.body.offsetWidth - 10;
            a.$refs.describe.style.top = s - a.$refs.describe.offsetHeight + "px";
            var e = a.$refs.describe.offsetWidth;
            if (e + i > t) {
              i = t - e;
            }
            a.$refs.describe.style.left = i + "px";
          });
        }
      }
    }