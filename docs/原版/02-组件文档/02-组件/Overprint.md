# Overprint

> 来源：`app/56d7.js`　大小：16.8KB
> 特征：data / methods

## 子组件

`paging`、`add`、`dropDown`

## computed（2）

`countPosition`、`variableList`

## methods（26）

`selectTextTable`、`selectImgaeTable`、`dragColorWrapDrop`、`dragColorWrap`、`Callback`、`dropOpen`、`showMenu`、`callback`、`openEvent`、`switchDoc`、`showTextMenu`、`initBeAfterData`、`downTempFile`、`handleBatch`、`changesuffi`、`changeVarList`、`close`、`analysisData`、`addText`、`addImage`、`addHandle`、`checkTextVar`、`checklayerId`、`updataToPsd`、`readPsdXmpToData`、`am`

## jsx 调用（PS 能力）

- `Layer_onIdSelectLayer`
- `Fs_openFolder`
- `tb_useOverprint`
- `tb_openPsdFolder`
- `tb_setInfoToXmp`
- `tb_getOverprintInfo`

## 文案（41）

变量设置 · 批量套版 · 不可用 · 加前缀 · 加后缀 · 刷新数据 · 更新成功 · 删除 · 修改变量名 · 修改成功 · 请输入新变量名 · 清空 · 清空列表 · 操作不可恢复 · 是否继续 · 清空成功 · 套版数据示例 · 套版数据模板文件 · 模板文件丢失 · 请重新登录插件 · 请添加变量后再批量套版 · 请先导入套版数据 · 查看开始套版 · 变量列表 · 对象 · 正在批量套版 · 套版数据列表 · 反编译 · 发生未知错误 · 请检查变量以及图片路径是否正确 · 套版完成 · 表格缺少文本类型变量 · 表格缺少图片类型变量 · 导入的数据有误 · 解析成功 · 该图层已经在变量列表中啦 · 添加成功 · 请输入变量名 · 已存在同名变量 · 文本类型 · 图片类型

## 源码

```js
{
  name: "Overprint",
  components: {
    paging: Fv,
    add: eO,
    dropDown: gm
  },
  data: function () {
    return {
      switchdata: ["变量设置", "批量套版"],
      switchindex: 0,
      set: V.a.info,
      modetwo: 1,
      setVariableIstrue: true,
      overprintIstrue: true,
      addIstrue: false,
      beAfterData: "不可用",
      suffixDropDown: ["加前缀", "加后缀"],
      suffixDropDownIstrue: false,
      textPagingIndex: 1,
      imgPagingIndex: 1,
      batchData: [],
      variable: {
        texts: [],
        images: []
      },
      showSelctVarList: false,
      moveEndIndex: null,
      pageSize: 5,
      tableOneIstrue: -1,
      tableTwoIstrue: -1,
      status: false
    };
  },
  created: function () {
    this.readPsdXmpToData();
    this.openEvent();
    this.$appBus.on("plAddText", this.addText);
    this.$appBus.on("plAddImage", this.addImage);
  },
  computed: {
    countPosition: function () {
      var t = this;
      this.$nextTick(function () {
        if (t.position == null) {
          return [t.position, t.mouseMoveNode];
        }
        t.removeNode(".hiddendiv");
        if (t.position == "top") {
          t.mouseMoveNode.parentNode.insertBefore(t.hiddendivNode, t.mouseMoveNode);
        } else {
          t.insertAfter(t.hiddendivNode, t.mouseMoveNode);
        }
      });
      return [this.position, this.mouseMoveNode];
    },
    variableList: function () {
      var t = [];
      if (this.batchData.length > 0) {
        for (var e in this.batchData[0]) {
          t.push(e);
        }
      }
      return t;
    }
  },
  methods: {
    selectTextTable: function (t) {
      this.tableOneIstrue = t;
      this.tableTwoIstrue = -1;
      this.$cep.jsxNoCheck("Layer_onIdSelectLayer", [this.variable.texts[t].id]);
    },
    selectImgaeTable: function (t) {
      this.tableOneIstrue = -1;
      this.tableTwoIstrue = t;
      this.$cep.jsxNoCheck("Layer_onIdSelectLayer", [this.variable.images[t].id]);
    },
    dragColorWrapDrop: function (t) {
      this.moveEndIndex = t;
    },
    dragColorWrap: function (t, e, n, a) {
      var i = this;
      if (Object(ft.f)()) {
        var r = event.currentTarget;
        var s = r.style.cssText;
        r.style.width = "calc(100% - 20px)";
        var o = this.variable[a][t];
        this.moveEndIndex = t;
        this.$nextTick(function () {
          am({
            classval: e,
            scrollTopClass: n,
            ml: -40,
            time: 0,
            floatNode: r,
            isTop: true,
            Callback: function (e) {
              r.style.cssText = s;
              if (t != i.moveEndIndex) {
                i.variable[a].splice(t, 1);
                if (t > i.moveEndIndex) {
                  if (e) {
                    i.variable[a].splice(i.moveEndIndex, 0, o);
                  } else {
                    i.variable[a].splice(i.moveEndIndex + 1, 0, o);
                  }
                } else if (e) {
                  i.variable[a].splice(i.moveEndIndex - 1, 0, o);
                } else {
                  i.variable[a].splice(i.moveEndIndex, 0, o);
                }
              }
            }
          });
        });
      }
    },
    dropOpen: function (t) {
      this.$refs[t].open();
    },
    showMenu: function (t) {
      var e = this;
      var n = [{
        text: "刷新数据",
        callback: function () {
          e.readPsdXmpToData();
          e.$tips.show("更新成功");
        }
      }];
      this.$menu.show(n, true, t);
    },
    openEvent: function () {
      this.$psEvent.add("1936483188", "tbSwitchDocument", this.switchDoc);
      this.$psEvent.add("1332768288", "tbSwitchDocument", this.switchDoc);
      this.$psEvent.add("1131180832", "tbSwitchDocument", this.switchDoc);
      this.$psEvent.add("437", "tbSwitchDocument", this.switchDoc);
      this.$psEvent.add("1298866208", "tbSwitchDocument", this.switchDoc);
    },
    switchDoc: function () {
      this.readPsdXmpToData();
    },
    showTextMenu: function (t, e, n) {
      var a = this;
      var i = [{
        text: "删除",
        callback: function () {
          a.variable[n].splice(e, 1);
          a.updataToPsd();
        }
      }, {
        text: "修改变量名",
        callback: function () {
          a.$inputBox.show(function (t) {
            var i = a.checkTextVar(t);
            if (i == "") {
              a.variable[n][e].name = t;
              a.$tips.show("修改成功");
            } else {
              a.$msg.showErr(i);
            }
          }, "请输入新变量名");
        }
      }, {
        text: "fg"
      }, {
        text: "清空",
        callback: function () {
          a.$msg.confirm("清空列表", "操作不可恢复，是否继续？", function (t) {
            a.variable[n].splice(0, a.variable[n].length);
            a.updataToPsd();
            a.$tips.show("清空成功");
          }, "请输入新变量名");
        }
      }];
      this.$menu.show(i, true, t);
    },
    initBeAfterData: function () {
      var t = "不可用";
      if (this.batchData.length > 0) {
        for (var e in this.batchData[0]) {
          this.beAfterData = e;
          return;
        }
      }
      this.beAfterData = t;
    },
    downTempFile: function () {
      var t = D.a.saveFile("套版数据示例", ["xlsx"], "套版数据模板文件");
      if (t !== false) {
        var e = D.a.copy(N.a.path.preset + "/overprint.xlsx", t);
        if (e === true) {
          var n = D.a.getFileDirectory(t);
          this.$cep.jsxNoCheck("Fs_openFolder", [n]);
        } else {
          this.$msg.showErr("模板文件丢失，请重新登录插件");
        }
      }
    },
    handleBatch: function () {
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
                if (t.variable.texts != 0 || t.variable.images.length != 0) {
                  e.next = 2;
                  break;
                }
                return e.abrupt("return", t.$msg.showErr("请添加变量后再批量套版"));
              case 2:
                if (t.batchData.length != 0) {
                  e.next = 4;
                  break;
                }
                return e.abrupt("return", t.$msg.showErr("请先导入套版数据"));
              case 4:
                n = Object(ft.c)(t.set.batch);
                n.texts = t.variable.texts;
                n.images = t.variable.images;
                n.fileName.variable = t.beAfterData;
                console.log("查看开始套版 变量列表", t.variable);
                console.log("查看开始套版 对象", n);
                a = "";
                if (n.exportImage === true) {
                  n.exportImageOption = Object(ft.c)(V.a.info.cyExport);
                  n.exportImageOption.compress.width = "";
                  n.exportImageOption.compress.height = "";
                  n.exportImageOption.compress.watermark = "";
                  n.exportImageOption.autoOpenFolder = false;
                  n.exportImageOption.isNumber = false;
                  n.exportImageOption.pathType = 2;
                  n.exportImageOption.path = "";
                }
                t.$load.show("正在批量套版...");
                console.log("套版数据列表 this.batchData", t.batchData);
                i = JSON.parse(JSON.stringify(t.batchData));
                i.forEach(function (t) {
                  for (var e in t) {
                    t[e] &&= qv(t[e]);
                  }
                });
                console.log("反编译 套版数据列表 ", i);
                e.prev = 17;
                r = 0;
              case 19:
                if (!(r < t.batchData.length)) {
                  e.next = 29;
                  break;
                }
                t.$load.show("正在批量套版:" + (r + 1) + "/" + t.batchData.length);
                n.data = [t.batchData[r]];
                e.next = 24;
                return t.$cep.jsxNoCheck("tb_useOverprint", [n]);
              case 24:
                s = e.sent;
                if (s.err == 1) {
                  a += s.msg + "<br><br>";
                }
              case 26:
                r++;
                e.next = 19;
                break;
              case 29:
                e.next = 34;
                break;
              case 31:
                e.prev = 31;
                e.t0 = e.catch(17);
                t.$msg.showErr("发生未知错误，请检查变量以及图片路径是否正确！");
              case 34:
                t.$load.hide();
                t.$tips.show("套版完成");
                t.$cep.jsxNoCheck("tb_openPsdFolder", [n]);
                if (a != "") {
                  t.$msg.showErrHtml(a);
                }
                t.$bp.add("tb_001");
              case 39:
              case "end":
                return e.stop();
            }
          }
        }, e, null, [[17, 31]]);
      }))();
    },
    changesuffi: function (t) {
      this.set.batch.fileName.type = parseInt(t + 1);
      this.suffixDropDownIstrue = false;
    },
    changeVarList: function (t) {
      this.beAfterData = this.variableList[t];
      this.showSelctVarList = false;
    },
    close: function () {
      this.addIstrue = false;
    },
    analysisData: function (t) {
      if (t.length > 0) {
        var e = false;
        for (var n in t[0]) {
          var a;
          var i = Object(T.a)(this.variable.texts);
          try {
            for (i.s(); !(a = i.n()).done;) {
              var r = a.value;
              if (r.name == n) {
                e = true;
                break;
              }
            }
          } catch (w) {
            i.e(w);
          } finally {
            i.f();
          }
          var s;
          var o = Object(T.a)(this.variable.images);
          try {
            for (o.s(); !(s = o.n()).done;) {
              var c = s.value;
              if (c.name == n) {
                e = true;
                break;
              }
            }
          } catch (w) {
            o.e(w);
          } finally {
            o.f();
          }
        }
        var l;
        var u = "";
        var h = Object(T.a)(this.variable.texts);
        try {
          for (h.s(); !(l = h.n()).done;) {
            var d = l.value;
            var f = false;
            for (var p in t[0]) {
              if (p == d.name) {
                f = true;
                break;
              }
            }
            if (f == 0) {
              u = u + "表格缺少文本类型变量：" + d.name + "<br>";
            }
          }
        } catch (w) {
          h.e(w);
        } finally {
          h.f();
        }
        var m;
        var v = Object(T.a)(this.variable.images);
        try {
          for (v.s(); !(m = v.n()).done;) {
            var g = m.value;
            var b = false;
            for (var y in t[0]) {
              if (y == g.name) {
                b = true;
                break;
              }
            }
            if (b == 0) {
              u = u + "表格缺少图片类型变量：" + g.name + "<br>";
            }
          }
        } catch (w) {
          v.e(w);
        } finally {
          v.f();
        }
        if (u != "") {
          this.batchData = [];
          this.status = false;
          this.$msg.showErrHtml(u);
        } else if (e == 0) {
          this.batchData = [];
          this.$msg.showErr("导入的数据有误");
          this.status = false;
        } else {
          this.batchData = t;
          this.$tips.show("解析成功");
          this.status = true;
        }
        this.initBeAfterData();
      }
      this.addIstrue = false;
    },
    addText: function () {
      this.addHandle("tb_getTextLayerInfo", "texts");
    },
    addImage: function () {
      this.addHandle("tb_getImageLayerInfo", "images");
    },
    addHandle: function (t, e) {
      var n = this;
      return Object(d.a)(regeneratorRuntime.mark(function a() {
        var i;
        return regeneratorRuntime.wrap(function (a) {
          while (1) {
            switch (a.prev = a.next) {
              case 0:
                a.next = 2;
                return n.$cep.jsx(t);
              case 2:
                i = a.sent;
                if (i.err != 1) {
                  a.next = 5;
                  break;
                }
                return a.abrupt("return", n.$msg.showErr(i.msg));
              case 5:
                if (!n.checklayerId(i.data.id)) {
                  a.next = 7;
                  break;
                }
                return a.abrupt("return", n.$msg.showErr("该图层已经在变量列表中啦"));
              case 7:
                n.$inputBox.show(function () {
                  var t = Object(d.a)(regeneratorRuntime.mark(function t(a) {
                    var r;
                    return regeneratorRuntime.wrap(function (t) {
                      while (1) {
                        switch (t.prev = t.next) {
                          case 0:
                            a = a.replace(/\s*/g, "");
                            r = n.checkTextVar(a);
                            if (r == "") {
                              t.next = 4;
                              break;
                            }
                            return t.abrupt("return", n.$msg.showErr(r));
                          case 4:
                            i.data.name = a;
                            n.variable[e].push(i.data);
                            n.updataToPsd();
                            n.$tips.show("添加成功");
                          case 8:
                          case "end":
                            return t.stop();
                        }
                      }
                    }, t);
                  }));
                  return function (e) {
                    return t.apply(this, arguments);
                  };
                }(), "请输入变量名");
              case 8:
              case "end":
                return a.stop();
            }
          }
        }, a);
      }))();
    },
    checkTextVar: function (t) {
      var e;
      var n = Object(T.a)(this.variable.texts);
      try {
        for (n.s(); !(e = n.n()).done;) {
          var a = e.value;
          if (a.name == t) {
            return "已存在同名变量：文本类型";
          }
        }
      } catch (o) {
        n.e(o);
      } finally {
        n.f();
      }
      var i;
      var r = Object(T.a)(this.variable.images);
      try {
        for (r.s(); !(i = r.n()).done;) {
          var s = i.value;
          if (s.name == t) {
            return "已存在同名变量：图片类型";
          }
        }
      } catch (o) {
        r.e(o);
      } finally {
        r.f();
      }
      return "";
    },
    checklayerId: function (t) {
      var e;
      var n = Object(T.a)(this.variable.texts);
      try {
        for (n.s(); !(e = n.n()).done;) {
          var a = e.value;
          if (a.id == t) {
            return true;
          }
        }
      } catch (o) {
        n.e(o);
      } finally {
        n.f();
      }
      var i;
      var r = Object(T.a)(this.variable.images);
      try {
        for (r.s(); !(i = r.n()).done;) {
          var s = i.value;
          if (s.id == t) {
            return true;
          }
        }
      } catch (o) {
        r.e(o);
      } finally {
        r.f();
      }
      return false;
    },
    updataToPsd: function () {
      this.$cep.jsxNoCheck("tb_setInfoToXmp", [Object(wt.c)(JSON.stringify(this.variable))]);
    },
    readPsdXmpToData: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        var a;
        var i;
        var r;
        var s;
        var o;
        var c;
        var l;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.$cep.jsxNoCheck("tb_getOverprintInfo");
              case 2:
                n = e.sent;
                t.variable.texts.splice(0, t.variable.texts.length);
                t.variable.images.splice(0, t.variable.images.length);
                if (n != null) {
                  e.next = 7;
                  break;
                }
                return e.abrupt("return");
              case 7:
                a = Object(wt.a)(n);
                try {
                  s = JSON.parse(a);
                  o = Array.isArray(s);
                  c = o ? s.filter(function (t) {
                    return t.type === "text";
                  }) : s.texts;
                  l = o ? s.filter(function (t) {
                    return t.type === "image";
                  }) : s.images;
                  (i = t.variable.texts).push.apply(i, Object(ct.a)(c));
                  (r = t.variable.images).push.apply(r, Object(ct.a)(l));
                } catch (u) {}
              case 9:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    }
  },
  mounted: function () {
    var t = document.querySelectorAll(".table")[0].offsetHeight;
    var e = document.querySelectorAll(".list-context")[0].offsetHeight + 4;
    this.pageSize = Math.floor(t / e);
    this.$log.push("overprint");
  }
}
```