# Style

> 来源：`app/56d7.js`　大小：13.0KB
> 特征：data / methods

## 子组件

`color`、`gradients`、`font`、`stylecom`、`warehouse`、`warehouseList`、`imgColor`

## methods（28）

`dropImg`、`getImgHex`、`firstUse`、`importMenu`、`callback`、`importDefault`、`exportMenu`、`addGroup`、`okHandle`、`closeWhList`、`colSendWarehouse`、`fontSendWarehouse`、`gradientSendWarehouse`、`styleSendWarehouse`、`initData`、`syncStyleWarehouseToServe`、`syncFileToServe`、`syncColorFileToServe`、`syncFontFileToServe`、`syncGradientFileToServe`、`delWarehouseGroup`、`addWarehouseGroup`、`renameWarehouse`、`selectWarehouse`、`returnTop`、`switchFun`、`nS`、`setTimeout`

## jsx 调用（PS 能力）

- `exportCurrentLayerToImage`

## 文案（62）

颜色 · 渐变 · 字体 · 样式 · 添加成功 · 正在解析图片颜色 · 请选择图片图层 · 另存图片失败 · 请拖入 · 张图片 · 正在解析图片 · 解析图片失败 · 默认仓库 · 欢迎首次使用 · 是否导入颜色 · 渐变样式预设 · 追加 · 取消操作 · 追加成功 · 追加失败 · 导入预设仓库 · 导入提醒 · 导入将会覆盖原本所有仓库 · 是否继续 · 导入样式仓库 · 导入成功 · 导入失败 · 追加预设仓库 · 追加样式仓库 · 追加颜色 · 追加渐变 · 追加字体 · 追加图层样式 · 图层样式 · 追加插件自带预设 · 设计助理 · 已存在同名预设 · 是否继续追加 · 颜色渐变 · 设计助理预设 · 导出预设 · 导出成功 · 导出失败 · 导出所有仓库 · 全部仓库 · 预设仓库 · 导出当前仓库 · 动作仓库 · 导出颜色 · 颜色预设 · 导出渐变 · 渐变预设 · 导出字体 · 字体预设 · 导出图层样式 · 样式预设 · 请输入组名 · 发送成功 · 移动成功 · 样式仓库 · 样式字体 · 删除成功

## 源码

```js
{
  name: "Style",
  components: {
    color: VC,
    gradients: t_,
    font: s_,
    stylecom: d_,
    warehouse: W_,
    warehouseList: XC,
    imgColor: z_
  },
  data: function () {
    return {
      switchval: ["颜色", "渐变", "字体", "样式"],
      set: V.a.info,
      wh: B_,
      load: false,
      col: null,
      font: null,
      gradient: null,
      style: null,
      showWhList: false,
      callback: null,
      updataWh: false,
      changeGraditens: false,
      imgColos: [],
      showImgColor: false
    };
  },
  created: function () {
    var t = this;
    this.wh.reload();
    this.initData();
    this.$appBus.on("syncReloadStyle", function () {
      t.wh.reload();
      t.initData();
    });
    this.$appBus.on("styleSaveGradient", function (e) {
      t.gradient.addGroupItem(e);
      t.changeGraditens = !t.changeGraditens;
      t.$tips.show("添加成功");
    });
  },
  methods: {
    dropImg: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        var i;
        var r;
        var s;
        var o;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                if (t.dataTransfer.types[0].indexOf("com.adobe.cep") == -1) {
                  n.next = 14;
                  break;
                }
                e.$load.show("正在解析图片颜色");
                n.next = 4;
                return e.$cep.jsxNoCheck("exportCurrentLayerToImage");
              case 4:
                a = n.sent;
                if (a != 0) {
                  n.next = 8;
                  break;
                }
                e.$load.hide();
                return n.abrupt("return", e.$msg.showErr("请选择图片图层!"));
              case 8:
                if (D.a.isFile(a) != 0) {
                  n.next = 10;
                  break;
                }
                return n.abrupt("return", e.$log.push("另存图片失败"));
              case 10:
                i = D.a.readBase64(a);
                i = "data:image/jpg;base64," + i;
                e.getImgHex(i);
                return n.abrupt("return");
              case 14:
                r = t.dataTransfer.files;
                if (r.length == 1) {
                  n.next = 17;
                  break;
                }
                return n.abrupt("return", e.$tips.show("请拖入1张图片"));
              case 17:
                e.$load.show("正在解析图片");
                s = r[0];
                o = new FileReader();
                o.readAsDataURL(s);
                o.onload = function (t) {
                  e.getImgHex(t.target.result);
                };
              case 22:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    },
    getImgHex: function (t) {
      var e = this;
      var n = 10;
      nS(t, 350, n, function (t, n) {
        e.$load.hide();
        if (t.length == 0) {
          e.$tips.show("解析图片失败");
        } else {
          e.imgColos = t;
          e.showImgColor = true;
        }
      });
    },
    firstUse: function () {
      var t = this;
      if (this.set.ysShowGuide != 0) {
        setTimeout(function () {
          try {
            if (t.wh.info.list.length == 1 && t.wh.info.list[0].name == "默认仓库") {
              t.$msg.confirm("欢迎首次使用", "是否导入颜色、渐变样式预设", function () {
                t.importDefault();
              });
            }
          } catch (e) {}
          t.set.ysShowGuide = false;
        }, 500);
      }
    },
    importMenu: function (t) {
      var e = this;
      if (this.$menu.getStatus()) {
        return this.$menu.hide();
      }
      function n(t, n, a) {
        var i = D.a.openFile("追加" + t, [n], "*." + n);
        if (i === false) {
          return e.$tips.show("取消操作");
        }
        var r = e[a].importAdd(i);
        e.$tips.show(r ? "追加成功" : "追加失败");
      }
      var a = [{
        text: "导入预设仓库",
        callback: function () {
          e.$msg.confirm("导入提醒", "导入将会覆盖原本所有仓库，是否继续？", function () {
            var t = D.a.openFile("导入样式仓库", ["kux"], "*.kux");
            if (t === false) {
              return e.$tips.show("取消操作");
            }
            var n = e.wh.import(t);
            e.$tips.show(n === true ? "导入成功" : "导入失败");
            if (n) {
              e.updataWh = !e.updataWh;
              e.initData();
            }
          });
        }
      }, {
        text: "追加预设仓库",
        callback: function () {
          var t = D.a.openFile("追加样式仓库", ["kux"], "*.kux");
          if (t === false) {
            return e.$tips.show("取消操作");
          }
          var n = e.wh.importAdd(t);
          e.$tips.show(n === true ? "追加成功" : "追加失败");
          if (n) {
            e.updataWh = !e.updataWh;
            e.initData();
          }
        }
      }, {
        text: "fg"
      }, {
        text: "追加颜色",
        callback: function () {
          n("颜色", "kuc", "col");
        }
      }, {
        text: "追加渐变",
        callback: function () {
          n("渐变", "kug", "gradient");
        }
      }, {
        text: "追加字体",
        callback: function () {
          n("字体", "kuf", "font");
        }
      }, {
        text: "追加图层样式",
        callback: function () {
          n("图层样式", "kus", "style");
        }
      }, {
        text: "fg"
      }, {
        text: "追加插件自带预设",
        callback: function () {
          if (e.wh.checkPresetStatus()) {
            e.$msg.confirm("设计助理", "已存在同名预设，是否继续追加？", function () {
              e.importDefault();
            });
          } else {
            e.importDefault();
          }
        }
      }];
      var i = this.$refs.refShowList;
      var r = i.offsetLeft + 70;
      var s = i.offsetTop - 254;
      this.$menu.show(a, true, r + "px", s + "px");
    },
    importDefault: function () {
      var t = this;
      var e = N.a.path.roaming + "/fz.FengZi1Hao/preset/";
      var n = this.wh.importAdd(e + "颜色渐变-设计助理预设.kux");
      this.$tips.show(n === true ? "追加成功" : "追加失败");
      if (n) {
        this.updataWh = !this.updataWh;
        this.initData();
        setTimeout(function () {
          var e = [];
          e.push(t.$sync.getFileName(t.$config.path.styleLibrary));
          e.push(t.$sync.getFileName(t.wh.getCurrentColorPath()));
          e.push(t.$sync.getFileName(t.wh.getCurrentFontPath()));
          e.push(t.$sync.getFileName(t.wh.getCurrentGradientPath()));
          t.$appBus.emit("syncChangeFileToServe", "syncStyleWarehouseAndAllFile", e, "样式");
        }, 500);
      }
    },
    exportMenu: function (t) {
      var e = this;
      if (this.$menu.getStatus()) {
        return this.$menu.hide();
      }
      function n(t, n, a, i) {
        var r = D.a.saveFile("导出预设", [a], t + "-" + n + "." + a, n + "." + a);
        if (r === false) {
          return e.$tips.show("取消操作");
        }
        var s = e[i].export(r);
        e.$tips.show(s ? "导出成功" : "导出失败");
      }
      var a = [{
        text: "导出所有仓库",
        callback: function () {
          var t = D.a.saveFile("导出预设", ["kux"], "全部仓库.kux", "预设仓库.kux");
          if (t === false) {
            return e.$tips.show("取消操作");
          }
          var n = e.wh.export(t);
          e.$tips.show(n ? "导出成功" : "导出失败");
        }
      }, {
        text: "导出当前仓库",
        callback: function () {
          var t = D.a.saveFile("导出预设", ["kux"], e.wh.getCurrentName() + ".kux", "动作仓库.kux");
          if (t === false) {
            return e.$tips.show("取消操作");
          }
          var n = e.wh.exportCurrent(t);
          e.$tips.show(n ? "导出成功" : "导出失败");
        }
      }, {
        text: "fg"
      }, {
        text: "导出颜色",
        callback: function () {
          n(e.wh.getCurrentName(), "颜色预设", "kuc", "col");
        }
      }, {
        text: "导出渐变",
        callback: function () {
          n(e.wh.getCurrentName(), "渐变预设", "kug", "gradient");
        }
      }, {
        text: "导出字体",
        callback: function () {
          n(e.wh.getCurrentName(), "字体预设", "kuf", "font");
        }
      }, {
        text: "导出图层样式",
        callback: function () {
          n(e.wh.getCurrentName(), "样式预设", "kus", "style");
        }
      }];
      var i = this.$refs.refShowList;
      var r = i.offsetLeft + 100;
      var s = i.offsetTop - 214;
      this.$menu.show(a, true, r + "px", s + "px");
    },
    addGroup: function (t) {
      var e = this;
      this.$inputBox.show(function (n) {
        e[t].addGroup(n);
        e.$tips.show("添加成功");
        e.syncFileToServe(t);
      }, "请输入组名");
    },
    okHandle: function (t) {
      this.showWhList = false;
      this.callback(t);
    },
    closeWhList: function () {
      this.showWhList = false;
      this.callback = null;
    },
    colSendWarehouse: function (t, e) {
      var n = this;
      function a(a) {
        var i = n.wh.getIndexFullPath(a, "color");
        var r = new X_(i);
        r.addGroupItem(t);
        var s = "发送成功";
        if (typeof e != "undefined") {
          n.col.deleteGroup(e);
          s = "移动成功";
        }
        n.$tips.show(s);
      }
      this.showWhList = true;
      this.callback = a;
    },
    fontSendWarehouse: function (t, e) {
      var n = this;
      function a(a) {
        var i = n.wh.getIndexFullPath(a, "font");
        var r = new X_(i);
        r.addGroupItem(t);
        var s = "发送成功";
        if (typeof e != "undefined") {
          n.font.deleteGroup(e);
          s = "移动成功";
        }
        n.$tips.show(s);
      }
      this.showWhList = true;
      this.callback = a;
    },
    gradientSendWarehouse: function (t, e) {
      var n = this;
      function a(a) {
        var i = n.wh.getIndexFullPath(a, "gradient");
        var r = new I_(i);
        r.addGroupItem(t);
        var s = "发送成功";
        if (typeof e != "undefined") {
          n.gradient.deleteGroup(e);
          s = "移动成功";
        }
        n.$tips.show(s);
      }
      this.showWhList = true;
      this.callback = a;
    },
    styleSendWarehouse: function (t, e) {
      var n = this;
      function a(a) {
        var i = n.wh.getIndexFullPath(a, "style");
        var r = new E_(i);
        r.addGroupItem(t);
        var s = "发送成功";
        if (typeof e != "undefined") {
          n.style.deleteGroup(e, false);
          s = "移动成功";
        } else {
          r.afterSendUpdataFile();
        }
        n.$tips.show(s);
      }
      this.showWhList = true;
      this.callback = a;
    },
    initData: function () {
      this.col = new X_(this.wh.getCurrentColorPath());
      this.font = new K_(this.wh.getCurrentFontPath());
      this.style = new E_(this.wh.getCurrentStylePath());
      this.gradient = new I_(this.wh.getCurrentGradientPath());
      this.changeGraditens = !this.changeGraditens;
    },
    syncStyleWarehouseToServe: function () {
      var t = this.$sync.getFileName(this.$config.path.styleLibrary);
      this.$appBus.emit("syncChangeFileToServe", "syncStyleWarehouse", [t], "样式仓库");
    },
    syncFileToServe: function (t) {
      if (t == "col") {
        this.syncColorFileToServe();
      } else if (t == "font") {
        this.syncFontFileToServe();
      } else if (t == "gradient") {
        this.syncGradientFileToServe();
      }
    },
    syncColorFileToServe: function () {
      var t = this.$sync.getFileName(this.wh.getCurrentColorPath());
      this.$appBus.emit("syncChangeFileToServe", "syncStyleColor", [t], "颜色");
    },
    syncFontFileToServe: function () {
      var t = this.$sync.getFileName(this.wh.getCurrentFontPath());
      this.$appBus.emit("syncChangeFileToServe", "syncStyleFont", [t], "样式字体");
    },
    syncGradientFileToServe: function () {
      var t = this.$sync.getFileName(this.wh.getCurrentGradientPath());
      this.$appBus.emit("syncChangeFileToServe", "syncStyleGradient", [t], "渐变");
    },
    delWarehouseGroup: function (t) {
      var e = this.wh.delete(t);
      if (e === false) {
        return false;
      }
      this.$tips.show("删除成功");
      this.initData();
      this.syncStyleWarehouseToServe();
      for (var n = 0; n < e.length; n++) {
        e[n] = this.$sync.getFileName(e[n]);
      }
      this.$sync.deletePath(e);
    },
    addWarehouseGroup: function () {
      this.wh.add();
      this.syncStyleWarehouseToServe();
    },
    renameWarehouse: function (t) {
      this.wh.rename(t.index, t.val);
      this.syncStyleWarehouseToServe();
    },
    selectWarehouse: function (t) {
      this.wh.select(t);
      this.initData();
    },
    returnTop: function (t) {
      var e = function t() {
        var _el = document.querySelector(".Style-vueScroll");
        if (!_el || _el.scrollTop <= 0) {
          return;
        }
        window.requestAnimationFrame(t);
        _el.scrollTop -= 150;
      };
      window.requestAnimationFrame(e);
    },
    switchFun: function (t) {
      if (Object(ft.f)()) {
        if (this.set.ysShowTab[t]) {
          this.set.ysShowTab.splice(t, 1, false);
        } else {
          this.set.ysShowTab.splice(t, 1, true);
        }
      } else {
        this.set.ysShowTab = this.set.ysShowTab.map(function (e, n) {
          return t == n;
        });
      }
    }
  },
  mounted: function () {
    this.$log.push("style");
    this.firstUse();
  }
}
```