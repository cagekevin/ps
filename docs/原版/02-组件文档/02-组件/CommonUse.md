# CommonUse

> 来源：`app/56d7.js`　大小：21.8KB
> 特征：data / methods

## 子组件

`comembed`、`comimport`、`comoptimization`、`comcustomChange`、`comexport`、`comreference`、`comspacing`

## computed（1）

`showContext`

## methods（42）

`fpFunction`、`fpTransformPosition`、`fpZoom`、`setEvent`、`dragInImage`、`toLinkObject`、`drop`、`drag`、`Callback`、`eventTransformPosition`、`batchExportLayer`、`batchExportSecondLayer`、`setFillColorEvent`、`autoFillColor`、`clickFunction`、`locationTrade`、`exchangeLayerColor`、`layerReplace`、`swapWireframeFill`、`coorectBlur`、`getExportImage`、`exportImage`、`exportJpg`、`exportPng`、`exportGif`、`exportPsd`、`getOptimizeDoc`、`optimizeDoc`、`getEmbedImageObject`、`embedImage`、`importMultipleImage`、`transformPosition`、`inputSize`、`changeSize`、`rightopen`、`enlargeOpen`、`narrowOpen`、`getdom`、`changeSort`、`initialization`、`open`、`am`

## jsx 调用（PS 能力）

- `cy_openDirectory`
- `Layer_placedLayerRelinkToFile`
- `ps_exportGif`
- `cy_getImagePath`
- `cy_zoom`

## 文案（50）

左右 · 左右翻转 · 上下 · 上下翻转 · 左 · 向左翻转 · 右 · 向右翻转 · 下 · 向下翻转 · 上 · 向上翻转 · 嵌入多图片 · 嵌入图片 · 导入多图片 · 修正模糊 · 填充线框互换 · 优化文档 · 自动填充颜色 · 自定义变换 · 参考线工具 · 按间距分布 · 导出图片 · 元素替换 · 位置对换 · 图层颜色互换 · 不支持添加自定义面板 · 请添加展开后的功能 · 自定义目录不存在 · 请检查设置 · 正在导出一级图层 · 批量导出一级图片 · 导出成功 · 正在导出二级图层 · 批量导出二级图片 · 智能填充颜色 · 智能填充边框颜色 · 常用功能页 · 正在嵌入多图层 · 开启智能填色 · 已关闭 · 修正边缘模糊 · 正在导出图片 · 配置对象 · 正在优化文档 · 请选择图片 · 正在嵌入多图片 · 元素变换 · 自由变换 · 元素缩放

## 源码

```js
{
  name: "CommonUse",
  components: {
    comembed: mp,
    comimport: xp,
    comoptimization: Tp,
    comcustomChange: Mp,
    comexport: Rp,
    comreference: Gp,
    comspacing: Yp
  },
  data: function () {
    return {
      moveEndIndex: null,
      isTopDrag: false,
      set: V.a.info,
      fillSvgName: null,
      redioval: 1,
      enlargeVal: "",
      enlargePart: [105, 110, 150, 200],
      enlargeAll: [101, 102, 103, 120, 140, 250, 300, 350, 400, 500],
      enlargeIstrue: false,
      narrowVal: "",
      narrowPart: [95, 90, 80, 50],
      narrowAll: [99, 98, 97, 70, 60, 50, 33, 25, 20, 10],
      narrowIstrue: false,
      contextjson: Lt.info,
      hiddenIstrue: -1,
      mousemoveIndex: 0,
      dom: {
        context: null
      },
      cliarr: [],
      openfun: null,
      transformData: [{
        svg: "iconzuoyoufanzhuan",
        text: "左右",
        title: "左右翻转"
      }, {
        svg: "iconshangxiafanzhuan",
        text: "上下",
        title: "上下翻转"
      }, {
        svg: "iconxiangzuofanzhuan",
        text: "左",
        title: "向左翻转"
      }, {
        svg: "iconxiangyoufanzhuan",
        text: "右",
        title: "向右翻转"
      }, {
        svg: "iconxiangxiafanzhuan",
        text: "下",
        title: "向下翻转"
      }, {
        svg: "iconxiangshangfanzhuan",
        text: "上",
        title: "向上翻转"
      }]
    };
  },
  computed: {
    showContext: function () {
      return this.contextjson.filter(function (t) {
        return t.isShow || t.hasOwnProperty("created");
      });
    }
  },
  watch: {
    "set.cyAutoFillColor": function (t) {
      this.setFillColorEvent();
    },
    "set.cyDragInAutoEmbed": function (t) {
      this.setEvent("cyDragInAutoEmbed", "1349280544", this.dragInImage);
    },
    "set.cyPasetImageAutoEmbed": function (t) {
      this.setEvent("cyPasetImageAutoEmbed", "1885434740", this.dragInImage);
    },
    "set.cyClipMaskAutoEmbed": function (t) {
      this.setEvent("cyClipMaskAutoEmbed", "1198682188", this.dragInImage);
    },
    "set.cyOpenDranInToLinkObject": function (t) {
      this.setEvent("cyOpenDranInToLinkObject", "1349280544", this.toLinkObject);
    }
  },
  created: function () {
    var t = this;
    this.contextjson.filter(function (t, e) {
      t.openistrue = false;
      t.sort = e;
      return t;
    });
    this.$appBus.on("cyEmbedImg", this.embedImage);
    this.$appBus.on("cyEmbedMuiltImg", function () {
      t.clickFunction({
        name: "嵌入多图片"
      });
    });
    this.$appBus.on("cyImportMuiltImg", this.importMultipleImage);
    this.$appBus.on("cyRevise", this.coorectBlur);
    this.$appBus.on("cyFillOrLine", this.swapWireframeFill);
    this.$appBus.on("cyOptimizationDoc", this.optimizeDoc);
    this.$appBus.on("cyExportImg", this.exportImage);
    this.$appBus.on("cyExportJpg", this.exportJpg);
    this.$appBus.on("cyExportPng", this.exportPng);
    this.$appBus.on("cyExportGif", this.exportGif);
    this.$appBus.on("cyExportPsd", this.exportPsd);
    this.$appBus.on("cyExportOneImg", this.batchExportLayer);
    this.$appBus.on("cyExportTwoImg", this.batchExportSecondLayer);
    this.$appBus.on("cyOpenFolder", function () {
      t.$cep.jsxNoCheck("cy_openDirectory");
    });
    this.$appBus.on("cyElementSub", this.layerReplace);
    this.$appBus.on("cyPositionReversal", this.locationTrade);
    this.$appBus.on("cyChangeColor", this.exchangeLayerColor);
    this.$appBus.on("cyLeftRight", this.eventTransformPosition);
    this.$appBus.on("cyTopBottom", this.eventTransformPosition);
    this.$appBus.on("cyToLeft", this.eventTransformPosition);
    this.$appBus.on("cyToRight", this.eventTransformPosition);
    this.$appBus.on("cyToBottom", this.eventTransformPosition);
    this.$appBus.on("cyToTop", this.eventTransformPosition);
    this.$appBus.on("fp_cy_importMultipleImage", this.importMultipleImage);
  },
  methods: {
    fpFunction: function (t, e) {
      var n = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var a;
        var i;
        var r;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (!Object(ft.f)()) {
                  e.next = 37;
                  break;
                }
                a = "";
                i = null;
                e.t0 = t.name;
                e.next = e.t0 === "嵌入图片" ? 6 : e.t0 === "嵌入多图片" ? 9 : e.t0 === "导入多图片" ? 11 : e.t0 === "修正模糊" ? 14 : e.t0 === "填充线框互换" ? 16 : e.t0 === "优化文档" ? 18 : e.t0 === "自动填充颜色" ? 21 : e.t0 === "自定义变换" || e.t0 === "参考线工具" || e.t0 === "按间距分布" ? 22 : e.t0 === "导出图片" ? 23 : e.t0 === "元素替换" ? 29 : e.t0 === "位置对换" ? 31 : e.t0 === "图层颜色互换" ? 33 : 35;
                break;
              case 6:
                a = "cy_embedImage";
                i = n.getEmbedImageObject();
                return e.abrupt("break", 36);
              case 9:
                a = "cy_embedMultipleImage";
                return e.abrupt("break", 36);
              case 11:
                a = "cy_importMultipleImage";
                i = V.a.getKey("cyImportToLinkObject");
                return e.abrupt("break", 36);
              case 14:
                a = "cy_coorectBlur";
                return e.abrupt("break", 36);
              case 16:
                a = "cy_swapWireframeFill";
                return e.abrupt("break", 36);
              case 18:
                a = "cy_optimizeDoc";
                i = n.getOptimizeDoc();
                return e.abrupt("break", 36);
              case 21:
                return e.abrupt("return", n.$tips.show("不支持添加自定义面板"));
              case 22:
                return e.abrupt("return", n.$tips.show("请添加展开后的功能"));
              case 23:
                a = "cy_exportImage";
                r = n.getExportImage();
                if (r != null) {
                  e.next = 27;
                  break;
                }
                return e.abrupt("return");
              case 27:
                i = r;
                return e.abrupt("break", 36);
              case 29:
                a = "cy_layerReplace";
                return e.abrupt("break", 36);
              case 31:
                a = "cy_locationTrade";
                return e.abrupt("break", 36);
              case 33:
                a = "cy_exchangeLayerColor";
                return e.abrupt("break", 36);
              case 35:
                return e.abrupt("return");
              case 36:
                n.$freePanelBox.show(t.name, a, i);
              case 37:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    fpTransformPosition: function (t) {
      if (Object(ft.f)()) {
        this.$freePanelBox.show(t, "cy_transformPosition", t);
      }
    },
    fpZoom: function (t) {
      if (Object(ft.f)()) {
        this.$freePanelBox.show(t, "cy_zoom", t);
      }
    },
    setEvent: function (t, e, n) {
      if (this.set[t]) {
        this.$psEvent.add(e, t, n);
      } else {
        this.$psEvent.remove(e, t);
      }
    },
    dragInImage: function () {
      var t = {
        path: "",
        bLink2: V.a.getKey("cyLinkObject"),
        bDelete: V.a.getKey("cyDeleteNext")
      };
      this.$cep.jsxHistory("cy_insertionImage", [t], "嵌入图片");
    },
    toLinkObject: function (t) {
      var e = t.eventData.null._path.replace(/\\/g, "/");
      this.$cep.jsx("Layer_placedLayerRelinkToFile", [e]);
    },
    drop: function (t) {
      if (!this.isTopDrag) {
        this.moveEndIndex = t;
      }
    },
    drag: function (t, e) {
      var n = this;
      if (Object(ft.f)() && event.button != 2) {
        this.contextjson.filter(function (t, e) {
          if (t.hasOwnProperty("created")) {
            n.contextjson.splice(e, 1);
          }
        });
        this.openfun = null;
        this.isTopDrag = false;
        var a = this.contextjson[t];
        this.moveEndIndex = t;
        am({
          classval: e,
          time: 0,
          ml: -30,
          mt: 0,
          Callback: function (e) {
            if (t != n.moveEndIndex) {
              n.contextjson.splice(t, 1);
              if (t > n.moveEndIndex) {
                if (e) {
                  n.contextjson.splice(n.moveEndIndex, 0, a);
                } else {
                  n.contextjson.splice(n.moveEndIndex + 1, 0, a);
                }
              } else if (e) {
                n.contextjson.splice(n.moveEndIndex - 1, 0, a);
              } else {
                n.contextjson.splice(n.moveEndIndex, 0, a);
              }
            }
          }
        });
      }
    },
    eventTransformPosition: function (t) {
      var e = {
        cyLeftRight: "左右",
        cyTopBottom: "上下",
        cyToLeft: "左",
        cyToRight: "右",
        cyToBottom: "下",
        cyToTop: "上"
      };
      this.transformPosition(e[t]);
    },
    batchExportLayer: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                n = V.a.getKey("cyExport");
                if (n.path == "" || D.a.isFolder(n.path + "/") != 0) {
                  e.next = 3;
                  break;
                }
                return e.abrupt("return", t.$msg.show("自定义目录不存在，请检查设置"));
              case 3:
                t.$load.show("正在导出一级图层...");
                e.next = 6;
                return t.$cep.jsxHistoryNoCheck("cy_BatchExportLayer", [n], "批量导出一级图片");
              case 6:
                t.$load.hide();
                t.$tips.show("导出成功");
              case 8:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    batchExportSecondLayer: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                n = V.a.getKey("cyExport");
                if (n.path == "" || D.a.isFolder(n.path + "/") != 0) {
                  e.next = 3;
                  break;
                }
                return e.abrupt("return", t.$msg.show("自定义目录不存在，请检查设置"));
              case 3:
                t.$load.show("正在导出二级图层...");
                e.next = 6;
                return t.$cep.jsxHistoryNoCheck("cy_BatchExportSecondLayer", [n], "批量导出二级图片");
              case 6:
                t.$load.hide();
                t.$tips.show("导出成功");
              case 8:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    setFillColorEvent: function () {
      this.$psEvent.set(this.set.cyAutoFillColor, "1936028772", "cyAutoFillColor", this.autoFillColor);
    },
    autoFillColor: function (t) {
      if (t == "foregroundColor") {
        this.$cep.jsxHistoryNoCheck("cy_smartFillColor", [], "智能填充颜色");
      } else {
        this.$cep.jsxHistoryNoCheck("cy_smartFillLineColor", [], "智能填充边框颜色");
      }
    },
    clickFunction: function (t, e) {
      var n = this;
      return Object(d.a)(regeneratorRuntime.mark(function a() {
        return regeneratorRuntime.wrap(function (a) {
          while (1) {
            switch (a.prev = a.next) {
              case 0:
                n.$tracker.buttonClick({
                  button_source: "常用功能页",
                  button_name: t.name
                });
                a.t0 = t.name;
                a.next = a.t0 === "嵌入图片" ? 4 : a.t0 === "嵌入多图片" ? 6 : a.t0 === "导入多图片" ? 11 : a.t0 === "自动填充颜色" ? 13 : a.t0 === "修正模糊" ? 16 : a.t0 === "填充线框互换" ? 18 : a.t0 === "优化文档" ? 20 : a.t0 === "自定义变换" || a.t0 === "参考线工具" || a.t0 === "按间距分布" ? 22 : a.t0 === "导出图片" ? 24 : a.t0 === "元素替换" ? 26 : a.t0 === "位置对换" ? 28 : a.t0 === "图层颜色互换" ? 30 : 32;
                break;
              case 4:
                n.embedImage();
                return a.abrupt("break", 33);
              case 6:
                n.$load.show("正在嵌入多图层...");
                a.next = 9;
                return n.$cep.jsxHistory("cy_embedMultipleImage", [], "嵌入多图片");
              case 9:
                n.$load.hide();
                return a.abrupt("break", 33);
              case 11:
                n.importMultipleImage();
                return a.abrupt("break", 33);
              case 13:
                n.set.cyAutoFillColor = !n.set.cyAutoFillColor;
                n.$tips.show(n.set.cyAutoFillColor ? "开启智能填色" : "已关闭");
                return a.abrupt("break", 33);
              case 16:
                n.coorectBlur();
                return a.abrupt("break", 33);
              case 18:
                n.swapWireframeFill();
                return a.abrupt("break", 33);
              case 20:
                n.optimizeDoc();
                return a.abrupt("break", 33);
              case 22:
                n.open(e);
                return a.abrupt("break", 33);
              case 24:
                n.exportImage();
                return a.abrupt("break", 33);
              case 26:
                n.layerReplace();
                return a.abrupt("break", 33);
              case 28:
                n.locationTrade();
                return a.abrupt("break", 33);
              case 30:
                n.exchangeLayerColor();
                return a.abrupt("break", 33);
              case 32:
                return a.abrupt("break", 33);
              case 33:
                n.$tracker.functionApply({
                  function_source: "常用功能页",
                  function_name: t.name
                });
              case 34:
              case "end":
                return a.stop();
            }
          }
        }, a);
      }))();
    },
    locationTrade: function () {
      this.$cep.jsxHistory("cy_locationTrade", [], "位置对换");
    },
    exchangeLayerColor: function () {
      this.$cep.jsxHistory("cy_exchangeLayerColor", [], "图层颜色互换");
    },
    layerReplace: function () {
      this.$cep.jsxHistory("cy_LayerReplace", [], "元素替换");
    },
    swapWireframeFill: function () {
      this.$cep.jsxHistory("cy_swapWireframeFill", [], "填充线框互换");
    },
    coorectBlur: function () {
      this.$cep.jsxHistory("cy_correctRectangleBlur", [], "修正边缘模糊");
    },
    getExportImage: function () {
      var t = V.a.getKey("cyExport");
      if (t.path != "" && D.a.isFolder(t.path + "/") == 0) {
        this.$msg.show("自定义目录不存在，请检查设置");
        return null;
      } else {
        return t;
      }
    },
    exportImage: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                n = t.getExportImage();
                if (n != null) {
                  e.next = 3;
                  break;
                }
                return e.abrupt("return");
              case 3:
                t.$load.show("正在导出图片...");
                e.next = 6;
                return t.$cep.jsxHistoryNoCheck("cy_ExportImage", [n], "导出图片");
              case 6:
                t.$load.hide();
                t.$tips.show("导出成功");
              case 8:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    exportJpg: function () {
      V.a.info.cyExport.ext = "JPG";
      this.exportImage();
    },
    exportPng: function () {
      V.a.info.cyExport.ext = "PNG";
      this.exportImage();
    },
    exportGif: function () {
      V.a.info.cyExport.ext = "GIF";
      this.$cep.jsxNoCheck("ps_exportGif");
    },
    exportPsd: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                V.a.info.cyExport.ext = "PSD";
                n = JSON.parse(JSON.stringify(t.getExportImage()));
                n.saveType = 2;
                console.log("PSD 配置对象", n);
                e.next = 6;
                return t.$cep.jsxHistoryNoCheck("cy_ExportImage", [n], "导出图片");
              case 6:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    getOptimizeDoc: function () {
      return {
        cyOptimizeAll: V.a.getKey("cyOptimizeAll"),
        cyOptimizeDeleteAllEmpty: V.a.getKey("cyOptimizeDeleteAllEmpty"),
        cyOptimizeDeleteAllHide: V.a.getKey("cyOptimizeDeleteAllHide")
      };
    },
    optimizeDoc: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                n = t.getOptimizeDoc();
                t.$load.show("正在优化文档...");
                e.next = 4;
                return t.$cep.jsxHistoryNoCheck("cy_optimizeDoc", [n], "优化文档");
              case 4:
                t.$load.hide();
              case 5:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    getEmbedImageObject: function () {
      return {
        path: "",
        bLink2: V.a.getKey("cyLinkObject"),
        bDelete: V.a.getKey("cyDeleteNext")
      };
    },
    embedImage: function () {
      var t = this.getEmbedImageObject();
      this.$cep.jsxHistory("cy_insertionImage", [t], "嵌入图片");
    },
    importMultipleImage: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        var a;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                t.$load.show("请选择图片");
                e.next = 3;
                return t.$cep.jsx("cy_getImagePath");
              case 3:
                n = e.sent;
                t.$load.hide();
                if (n != -1) {
                  e.next = 7;
                  break;
                }
                return e.abrupt("return");
              case 7:
                a = {
                  path: n,
                  toLinkObject: V.a.getKey("cyImportToLinkObject")
                };
                t.$load.show("正在嵌入多图片...");
                e.next = 11;
                return t.$cep.jsxHistory("cy_importMultipleImage", [a], "导入多图片");
              case 11:
                t.$load.hide();
              case 12:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    transformPosition: function (t) {
      this.$tracker.buttonClick({
        button_source: "常用功能页",
        button_name: "元素变换"
      });
      this.$cep.jsxHistory("cy_transformPosition", [t], "自由变换");
      this.$tracker.functionApply({
        function_source: "常用功能页",
        function_name: "元素变换"
      });
    },
    inputSize: function (t) {
      t = t.replace(/[^\d]/g, "");
      this.changeSize(t);
    },
    changeSize: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                e.$tracker.buttonClick({
                  button_source: "常用功能页",
                  button_name: "元素缩放"
                });
                n.next = 3;
                return e.$cep.jsx("cy_zoom", [t], "自由变换");
              case 3:
                e.$tracker.functionApply({
                  function_source: "常用功能页",
                  function_name: "元素缩放"
                });
              case 4:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    },
    rightopen: function (t, e) {
      if (t.button == 2) {
        this[e] = !this[e];
      }
    },
    enlargeOpen: function () {
      this.enlargeIstrue = !this.enlargeIstrue;
      this.narrowIstrue = false;
    },
    narrowOpen: function () {
      this.narrowIstrue = !this.narrowIstrue;
      this.enlargeIstrue = false;
    },
    getdom: function () {
      this.dom.context = this.$refs.context;
    },
    changeSort: function (t, e, n, a) {
      for (var i = 0; i < t.length; i++) {
        t[i].left = t[i].sort % e * n;
        t[i].top = parseInt(t[i].sort / e) * a;
      }
    },
    initialization: function () {
      for (var t = 0; t < this.dom.context.length; t++) {
        this.cliarr.push({
          el: this.dom.context[t],
          sort: t,
          left: null,
          top: null
        });
      }
    },
    open: function (t) {
      var e = this;
      if (!Object(ft.f)() && this.contextjson[t].isMore) {
        if (this.openfun == this.contextjson[t].name) {
          this.contextjson.filter(function (t, n) {
            if (t.hasOwnProperty("created")) {
              e.contextjson.splice(n, 1);
            }
          });
          this.openfun = null;
        } else {
          var n = Math.floor(t / 3);
          var a = this.contextjson[t].name;
          var i = this.contextjson[t].comName;
          this.contextjson.filter(function (t, n) {
            if (t.hasOwnProperty("created")) {
              e.contextjson.splice(n, 1);
            }
          });
          this.contextjson.splice(n * 3 + 3, 0, {
            created: a,
            comName: i
          });
          this.openfun = a;
        }
      }
    }
  },
  mounted: function () {
    this.getdom();
    this.$log.push("commonuse");
    this.setFillColorEvent();
    this.setEvent("cyDragInAutoEmbed", "1349280544", this.dragInImage);
    this.setEvent("cyPasetImageAutoEmbed", "1885434740", this.dragInImage);
    this.setEvent("cyClipMaskAutoEmbed", "1198682188", this.dragInImage);
    this.setEvent("cyOpenDranInToLinkObject", "1349280544", this.toLinkObject);
  }
}
```