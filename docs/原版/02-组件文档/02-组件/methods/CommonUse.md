# CommonUse · 方法实现

> 来源：`CommonUse.js`
> 方法数：44

## `fpFunction`

参数：`t, e`

```js
function (t, e) {
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
    }
```

## `fpTransformPosition`

参数：`t`

```js
function (t) {
      if (Object(ft.f)()) {
        this.$freePanelBox.show(t, "cy_transformPosition", t);
      }
    }
```

## `fpZoom`

参数：`t`

```js
function (t) {
      if (Object(ft.f)()) {
        this.$freePanelBox.show(t, "cy_zoom", t);
      }
    }
```

## `setEvent`

参数：`t, e, n`

```js
function (t, e, n) {
      if (this.set[t]) {
        this.$psEvent.add(e, t, n);
      } else {
        this.$psEvent.remove(e, t);
      }
    }
```

## `dragInImage`


```js
function () {
      var t = {
        path: "",
        bLink2: V.a.getKey("cyLinkObject"),
        bDelete: V.a.getKey("cyDeleteNext")
      };
      this.$cep.jsxHistory("cy_insertionImage", [t], "嵌入图片");
    }
```

## `toLinkObject`

参数：`t`

```js
function (t) {
      var e = t.eventData.null._path.replace(/\\/g, "/");
      this.$cep.jsx("Layer_placedLayerRelinkToFile", [e]);
    }
```

## `drop`

参数：`t`

```js
function (t) {
      if (!this.isTopDrag) {
        this.moveEndIndex = t;
      }
    }
```

## `drag`

参数：`t, e`

```js
function (t, e) {
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
    }
```

## `eventTransformPosition`

参数：`t`

```js
function (t) {
      var e = {
        cyLeftRight: "左右",
        cyTopBottom: "上下",
        cyToLeft: "左",
        cyToRight: "右",
        cyToBottom: "下",
        cyToTop: "上"
      };
      this.transformPosition(e[t]);
    }
```

## `batchExportLayer`


```js
function () {
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
    }
```

## `batchExportSecondLayer`


```js
function () {
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
    }
```

## `setFillColorEvent`


```js
function () {
      this.$psEvent.set(this.set.cyAutoFillColor, "1936028772", "cyAutoFillColor", this.autoFillColor);
    }
```

## `autoFillColor`

参数：`t`

```js
function (t) {
      if (t == "foregroundColor") {
        this.$cep.jsxHistoryNoCheck("cy_smartFillColor", [], "智能填充颜色");
      } else {
        this.$cep.jsxHistoryNoCheck("cy_smartFillLineColor", [], "智能填充边框颜色");
      }
    }
```

## `clickFunction`

参数：`t, e`

```js
function (t, e) {
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
    }
```

## `locationTrade`


```js
function () {
      this.$cep.jsxHistory("cy_locationTrade", [], "位置对换");
    }
```

## `exchangeLayerColor`


```js
function () {
      this.$cep.jsxHistory("cy_exchangeLayerColor", [], "图层颜色互换");
    }
```

## `layerReplace`


```js
function () {
      this.$cep.jsxHistory("cy_LayerReplace", [], "元素替换");
    }
```

## `swapWireframeFill`


```js
function () {
      this.$cep.jsxHistory("cy_swapWireframeFill", [], "填充线框互换");
    }
```

## `coorectBlur`


```js
function () {
      this.$cep.jsxHistory("cy_correctRectangleBlur", [], "修正边缘模糊");
    }
```

## `getExportImage`


```js
function () {
      var t = V.a.getKey("cyExport");
      if (t.path != "" && D.a.isFolder(t.path + "/") == 0) {
        this.$msg.show("自定义目录不存在，请检查设置");
        return null;
      } else {
        return t;
      }
    }
```

## `exportImage`


```js
function () {
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
    }
```

## `exportJpg`


```js
function () {
      V.a.info.cyExport.ext = "JPG";
      this.exportImage();
    }
```

## `exportPng`


```js
function () {
      V.a.info.cyExport.ext = "PNG";
      this.exportImage();
    }
```

## `exportGif`


```js
function () {
      V.a.info.cyExport.ext = "GIF";
      this.$cep.jsxNoCheck("ps_exportGif");
    }
```

## `exportPsd`


```js
function () {
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
    }
```

## `getOptimizeDoc`


```js
function () {
      return {
        cyOptimizeAll: V.a.getKey("cyOptimizeAll"),
        cyOptimizeDeleteAllEmpty: V.a.getKey("cyOptimizeDeleteAllEmpty"),
        cyOptimizeDeleteAllHide: V.a.getKey("cyOptimizeDeleteAllHide")
      };
    }
```

## `optimizeDoc`


```js
function () {
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
    }
```

## `getEmbedImageObject`


```js
function () {
      return {
        path: "",
        bLink2: V.a.getKey("cyLinkObject"),
        bDelete: V.a.getKey("cyDeleteNext")
      };
    }
```

## `embedImage`


```js
function () {
      var t = this.getEmbedImageObject();
      this.$cep.jsxHistory("cy_insertionImage", [t], "嵌入图片");
    }
```

## `importMultipleImage`


```js
function () {
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
    }
```

## `transformPosition`

参数：`t`

```js
function (t) {
      this.$tracker.buttonClick({
        button_source: "常用功能页",
        button_name: "元素变换"
      });
      this.$cep.jsxHistory("cy_transformPosition", [t], "自由变换");
      this.$tracker.functionApply({
        function_source: "常用功能页",
        function_name: "元素变换"
      });
    }
```

## `inputSize`

参数：`t`

```js
function (t) {
      t = t.replace(/[^\d]/g, "");
      this.changeSize(t);
    }
```

## `changeSize`

参数：`t`

```js
function (t) {
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
    }
```

## `rightopen`

参数：`t, e`

```js
function (t, e) {
      if (t.button == 2) {
        this[e] = !this[e];
      }
    }
```

## `enlargeOpen`


```js
function () {
      this.enlargeIstrue = !this.enlargeIstrue;
      this.narrowIstrue = false;
    }
```

## `narrowOpen`


```js
function () {
      this.narrowIstrue = !this.narrowIstrue;
      this.enlargeIstrue = false;
    }
```

## `getdom`


```js
function () {
      this.dom.context = this.$refs.context;
    }
```

## `changeSort`

参数：`t, e, n, a`

```js
function (t, e, n, a) {
      for (var i = 0; i < t.length; i++) {
        t[i].left = t[i].sort % e * n;
        t[i].top = parseInt(t[i].sort / e) * a;
      }
    }
```

## `initialization`


```js
function () {
      for (var t = 0; t < this.dom.context.length; t++) {
        this.cliarr.push({
          el: this.dom.context[t],
          sort: t,
          left: null,
          top: null
        });
      }
    }
```

## `open`

参数：`t`

```js
function (t) {
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
```

## `e`


```js
e() {
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
      }
```

## `am`

参数：`{
          classval: e,
          time: 0,
          ml: -30,
          mt: 0,
          Callback: function (e`

```js
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
```

## `a`


```js
a() {
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
      }
```

## `n`


```js
n() {
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
      }
```
