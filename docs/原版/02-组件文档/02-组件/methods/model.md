# model · 方法实现

> 来源：`model.js`
> 方法数：26

## `showTextMenu`


```js
function () {}
```

## `dragColorWrap`


```js
function () {}
```

## `dragColorWrapDrop`


```js
function () {}
```

## `clickLayerVariableItem`

参数：`t`

```js
function (t) {
      this.$cep.jsxNoCheck("Layer_onIdSelectLayer", [t.id]);
    }
```

## `handleClickSelect`

参数：`t`

```js
function (t) {
      this.selectIconRotate180 = true;
      this.$refs[t].open();
    }
```

## `handleAddProduct`


```js
function () {
      var t = this.productList.length;
      var e = {};
      this.layerVaribleList.forEach(function (n) {
        e[n.id] = "";
        e.tHeader = `套版${t < 10 ? "0" : ""}${t + 1}`;
      });
      this.productList.push(e);
    }
```

## `deleteProductItem`

参数：`t`

```js
function (t) {
      this.productList.splice(t, 1);
    }
```

## `handleSelectImage`

参数：`t, e, n`

```js
function (t, e, n) {
      this.$refs.selectImgFileRef.value = "";
      if (this.$refs.selectImgFileRef.click) {
        this.$refs.selectImgFileRef.click();
      }
      this.recordSelectImageProduct = JSON.parse(JSON.stringify(t));
      this.recordSelectImageLayerId = e;
      this.recordSelectImageLayerIndex = n;
    }
```

## `showSplitImgName`

参数：`t, e`

```js
function (t, e) {
      var n = t.split("/");
      return n[n.length - 1];
    }
```

## `imageFimeChange`

参数：`t`

```js
function (t) {
      var e = false;
      var n = ["png", "jpg", "jpeg"];
      var a = t.target.files[0];
      var i = n.find(function (t) {
        return a.type.includes(t);
      });
      if (i) {
        var r = a.path.replace(/\\/g, "/");
        this.recordSelectImageProduct[this.recordSelectImageLayerId] = r;
      } else {
        e = true;
      }
      var s = [];
      t: for (var o = 1; o < t.target.files.length; o++) {
        a = t.target.files[o];
        i = n.find(function (t) {
          return a.type.includes(t);
        });
        e: for (var c = 0; c < this.layerVaribleList.length; c++) {
          if (!i) {
            e = true;
            s.push(c);
            continue t;
          }
          var l = this.layerVaribleList[c];
          if (l.type === "image" && !s.includes(c) && !this.recordSelectImageProduct[l.id]) {
            var u = a.path.replace(/\\/g, "/");
            this.recordSelectImageProduct[l.id] = u;
            break e;
          }
        }
      }
      if (e) {
        G.a.error("只支持png,jpg,jpeg图片格式文件");
      }
      this.productList.splice(this.recordSelectImageLayerIndex, 1, this.recordSelectImageProduct);
      t.target.files = [];
    }
```

## `getCurrentDropdownIsShow`

参数：`t`

```js
function (t) {
      return this.$refs[t] && this.$refs[t].isShowCurDropdown;
    }
```

## `selectExcelChange`

参数：`t`

```js
function (t) {
      this.showSelectTextValue = this.excelDataType[t[0]];
      if (t[0]) {
        this.isUploadExcel = false;
        this.makeExcelFile();
      } else {
        this.$tracker.buttonClick({
          button_source: "批量套版页_第二步",
          button_name: "导入Excel数据"
        });
        this.showImportExcelPopup = true;
        this.textAreaValue = "";
        this.$refs.uploadExcel.value = "";
      }
    }
```

## `deleteExcel`


```js
function () {
      this.isUploadExcel = false;
      this.$refs.uploadExcel.value = "";
    }
```

## `nextStep`


```js
function () {
      var t = true;
      for (var e = 0; e < this.productList.length; e++) {
        var n = this.productList[e];
        for (var a in n) {
          if (Object.keys(n).length == 1 || !n[a]) {
            t = false;
            break;
          }
        }
        if (!t) {
          break;
        }
      }
      if (t) {
        this.$emit("nextStep");
      } else {
        G.a.warning("请先设置好套版数据");
      }
    }
```

## `handleUploadExcel`


```js
function () {
      if (this.$refs.uploadExcel.click) {
        this.$refs.uploadExcel.click();
      }
    }
```

## `excelFileChange`

参数：`t`

```js
function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        var i;
        var r;
        var s;
        var o;
        var c;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                a = t.target.files[0];
                i = a.name.split(".");
                r = i[i.length - 1];
                s = ["xlsx", "xls"];
                if (!s.includes(r)) {
                  n.next = 17;
                  break;
                }
                e.uploading = true;
                e.isUploadExcel = true;
                e.uploadExcelFileInfo.fileName = a.name;
                o = new wO.a(a, 2, true);
                n.next = 11;
                return o.upload();
              case 11:
                c = n.sent;
                if (c.err == 0) {
                  if (c.data.data) {
                    bO("sjzl/readExcelSheet", {
                      path: c.data.data
                    }).then(function (t) {
                      if (t.data.err === 0) {
                        e.uploading = false;
                        e.uploadExcelFileInfo.sheets = t.data.data;
                      }
                      e.$tracker.functionApply({
                        function_source: "批量套版页_第二步",
                        function_name: "导入Excel数据"
                      });
                    }).catch(function () {
                      e.uploading = false;
                      G.a.warning("文件服务出错，请稍候");
                    });
                  }
                } else {
                  e.uploading = false;
                  G.a.warning("文件服务出错，请稍候");
                }
                t.target.value = "";
                t.target.files = [];
                n.next = 18;
                break;
              case 17:
                G.a.error("只支持xlsx，xls表格格式文件", 4);
              case 18:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    }
```

## `closePopup`


```js
function () {
      this.isUploadExcel = false;
      this.showImportExcelPopup = false;
    }
```

## `confirmImport`


```js
function () {
      var t = this;
      if (this.isUploadExcel && this.uploading) {
        return G.a.warning("文件上传中，请稍候");
      }
      if (!this.analysising) {
        try {
          if (this.isUploadExcel) {
            var e = this.uploadExcelFileInfo.sheets;
            if (!e) {
              return G.a.warning("请先上传文件");
            }
            var n = Object.keys(e);
            if (n.length > 1) {
              return this.showSelectSheetsPopup = true;
            } else {
              this.analysising = true;
              setTimeout(function () {
                t.analysisExcel(e[n[0]]);
                t.analysising = false;
              }, 300);
              return;
            }
          }
          this.analysisTextArea();
        } catch (a) {
          this.analysising = false;
        }
      }
    }
```

## `analysisExcel`

参数：`t`

```js
function (t) {
      var e;
      var n;
      var a = this;
      this.analysising = true;
      var i;
      var r = {
        layerNamePass: false,
        layerVariblePass: false
      };
      var s = {
        type: "",
        msg: ""
      };
      var o = JSON.parse(JSON.stringify(this.productList));
      var c = [];
      var l = [];
      var u = /\n/g;
      var h = 0;
      try {
        for (var d in t) {
          if (d.match(/\d/g)) {
            var f = function () {
              t[d].v &&= `${t[d].v || ""}`.replace(u, "\r");
              var f = d.replace(/[^0-9]/g, "") * 1;
              if (i !== f) {
                if (c.length) {
                  l.push(c);
                }
                i = f;
                c = [];
              }
              c.push(t[d].v);
              if (!o[f]) {
                o.push({});
              }
              if (n && f * 1 > n * 1) {
                e = "";
                n = "";
                r.layerNamePass = false;
                r.layerVariblePass = false;
                h = 0;
              }
              var p = t[d].v;
              if (f && f * 1 >= 2) {
                var m = a.layerVaribleList.find(function (t, e) {
                  return p && t.layerName == p && e === f * 1 - 2;
                });
                if (m) {
                  e = m;
                  n = f;
                  r.layerNamePass = true;
                }
              }
              if (n && p && f * 1 === n * 1 && p == a.varibleValues[e.id]) {
                r.layerVariblePass = true;
                return "continue";
              }
              if (r.layerNamePass && r.layerVariblePass) {
                if (p && `${p}`.trim()) {
                  if (a.checkXssChars(p)) {
                    s.msg += `${d}单元格不能包含特殊字符${a.xssChar}<br>`;
                  }
                  if (e.type === "text") {
                    if (!o[h]) {
                      o[h] = {};
                    }
                    var v = o[h];
                    v[e.id] = p || "";
                  } else {
                    var g;
                    var b = Object.keys(t);
                    var y = b.filter(function (t) {
                      return t.replace(/[0-9]/g, "") == "A";
                    });
                    var w = y.filter(function (e) {
                      return t[e].v === "图片目录路径";
                    });
                    if (w.length) {
                      g = w[w.length - 1].replace(/[^0-9]/g, "") * 1;
                    } else {
                      var x = t["!ref"].split(":")[1];
                      x = x && x.replace(/[^0-9]/g, "") * 1 || 0;
                      g = a.$store.state.isMac ? x : x - 1;
                    }
                    var k = d.replace(f, g);
                    if (a.checkXssChars(t[k] && t[k].v)) {
                      s.msg += `${k}单元格不能包含特殊字符${a.xssChar}<br>`;
                    }
                    if (!t[k] || !t[k].v || t[k].v === "请输入图片文件目录路径") {
                      s.msg += `${k}单元格缺少图片目录路径<br>`;
                      return "continue";
                    }
                    if (!p.includes(".")) {
                      s.msg += `${d}单元格缺少图片文件后缀<br>`;
                      return "continue";
                    }
                    var C = p.split(".");
                    if (!a.checkImgType(C[C.length - 1])) {
                      s.msg += `${d}单元格图片文件格式仅支持png,jpg,jpeg<br>`;
                      return "continue";
                    }
                    var _ = t[k].v.replace(/\\/g, "/");
                    var S = _ + "/" + p;
                    if (!o[h]) {
                      o[h] = {};
                    }
                    var O = o[h];
                    O[e.id] = S || "";
                  }
                }
                h += 1;
              }
            }();
            if (f === "continue") {
              continue;
            }
          }
        }
        if (s.msg.includes(this.xssChar)) {
          return G.a.error(`套版数据不能包含特殊字符${this.xssChar}`);
        }
        if (s.msg) {
          this.$msg.showErrHtml(s.msg, 3000);
        }
        var p = o.filter(function (t) {
          return Object.keys(t).length;
        });
        var m = l.find(function (t) {
          return t.includes("图层类型") && t.includes("图层名称") && t.includes("变量名称");
        });
        if (m) {
          p.forEach(function (t, e) {
            t.tHeader = m[e + 3] || `套版${e + 1 < 10 ? "0" : ""}${e + 1}`;
          });
        }
        this.productList = p;
        this.showImportExcelPopup = false;
        this.showSelectSheetsPopup = false;
        this.isUploadExcel = false;
        this.analysising = false;
      } catch (v) {
        this.analysising = false;
        this.$msg.showErr("解析发生未知错误，请检查变量以及图片路径是否正确，或者使用文本域解析");
      }
    }
```

## `analysisTextArea`


```js
function () {
      var t = this;
      if (!this.textAreaValue.trim()) {
        return G.a.warning("请先粘贴Excel表格数据");
      }
      this.textAreaValue = this.handleSystemChar(this.textAreaValue);
      try {
        var e = false;
        var n = "";
        for (var a = this.textAreaValue.split("\n"), i = 0; i < a.length; i++) {
          if (!a[i] || !a[i].replace(/\t/g, "")) {
            a.splice(i, 1);
          }
        }
        if (a.length <= 1) {
          return this.$tips.show("解析失败，数据有误");
        }
        for (var r = a[0].split("\t"), s = 0; s < r.length; s++) {
          r[s] = r[s].replace(/\s*/g, "");
        }
        var o = [];
        a.forEach(function (t, e) {
          return t && o.push(t.split("\t"));
        });
        var c = JSON.parse(JSON.stringify(this.productList));
        var l = o.find(function (t) {
          return t.includes("图层类型") && t.includes("图层名称") && t.includes("变量名称");
        });
        this.layerVaribleList.forEach(function (a) {
          var i = o.find(function (e) {
            return a.layerName === e[1] && t.varibleValues[a.id] === e[2];
          });
          if (i) {
            for (var r = 3; r < i.length; r++) {
              if (t.checkXssChars(i[r] || "")) {
                e = true;
                break;
              }
              if (i[r]) {
                var s = c[r - 3];
                s ||= {
                  tHeader: `套版${r - 2 < 10 ? "0" : ""}${r - 2}`
                };
                if (l[r]) {
                  s.tHeader = l[r];
                }
                if (i[0] === "文本") {
                  s[a.id] = i[r];
                } else if (i[0] === "图片") {
                  var u = o[o.length - 1];
                  if (!u[r] || u[r] === "请输入图片文件目录路径") {
                    n += `表格第${r + 1}列缺少图片目录<br>`;
                    continue;
                  }
                  var h = i[r].split(".");
                  if (h.length <= 1) {
                    n += `表格第${r + 1}列缺少图片文件后缀<br>`;
                    continue;
                  }
                  if (!t.checkImgType(h[h.length - 1])) {
                    n += `表格第${r + 1}列图片文件格式仅支持png,jpg,jpeg<br>`;
                    continue;
                  }
                  var d = u[r].replace(/\\/g, "/");
                  s[a.id] = d + "/" + i[r];
                }
                if (!c[r - 3]) {
                  c.push(s);
                }
              }
            }
          } else {
            n += `表格数据${a.layerName}图层和${t.varibleValues[a.id]}变量不匹配<br>`;
          }
        });
        if (e) {
          return G.a.warning(`表格不能包含${this.xssChar}字符`);
        }
        if (n) {
          this.$msg.showErrHtml(n);
        }
        this.showImportExcelPopup = false;
        this.productList = c;
      } catch (u) {
        this.$msg.showErr("解析发生未知错误，请检查变量以及图片路径是否正确！");
      }
    }
```

## `handleSystemChar`

参数：`t`

```js
function (t) {
      var e = t.split("\t");
      var n = /""/g;
      var a = /\n/g;
      var i = e.map(function (t) {
        if (t[0] == "\"" && t[t.length - 1] == "\"") {
          var e = t.replace(n, "");
          var i = e.includes("\"");
          if (i) {
            t = t.slice(1, t.length - 1);
          }
          var r = t.replace(a, "\r");
          t = r;
          return t;
        }
        return t || "";
      });
      return i.join("\t");
    }
```

## `checkXssChars`


```js
function () {
      return false;
    }
```

## `checkImgType`

参数：`t = ""`

```js
function (t = "") {
      var e = ["png", "jpg", "jpeg"];
      return e.includes(t.toLowerCase());
    }
```

## `makeExcelFile`


```js
function () {
      var t = this;
      var e = D.a.saveFile("下载套版Excel", ["xlsx"], "套版数据模板文件");
      if (e !== false) {
        for (var n = this.productList.length > 6 ? this.productList.length : 6, a = ["图层类型", "图层名称", "变量名称"], i = 0; i < n; i++) {
          var r = this.productList[i] && this.productList[i].tHeader && this.productList[i].tHeader.trim() || `套版${i < 10 ? "0" : ""}${i + 1}`;
          a.push(r);
        }
        var s = "请输入图片文件目录路径";
        var o = ["图片目录路径", "", "", s, s, s, s, s, s];
        var c = [a];
        this.layerVaribleList.forEach(function (e, n) {
          var a = [];
          var i = e.type === "text";
          a.push(i ? "文本" : "图片");
          a.push(e.layerName);
          a.push(t.varibleValues[e.id]);
          t.productList.forEach(function (t, n) {
            if (i || !t[e.id]) {
              a.push(t[e.id] || "");
            } else {
              var r = t[e.id].replace(/\\/g, "/");
              var s = r.split("/");
              a.push(s[s.length - 1] || "");
              s.pop();
              var c = s.join("/");
              if (c) {
                o[n + 3] = c;
              }
            }
          });
          if (t.productList.length < 6) {
            var r = 6 - t.productList.length;
            for (n = 0; n < r; n++) {
              a.push("");
            }
          }
          c.push(a);
        });
        c.push(o);
        var l = "文件服务出错，请稍候";
        vO(c).then(function (n) {
          if (n && n.data && n.data.err === 0) {
            var a = D.a.writeBase64(e, n.data.data);
            if (a == 1) {
              var i = D.a.getFileDirectory(e);
              t.$cep.jsxNoCheck("Fs_openFolder", [i]);
            }
          } else {
            var r = n.data && n.data.msg || l;
            G.a.error(r);
          }
        }).catch(function () {
          G.a.error(l);
        });
      }
    }
```

## `n`


```js
n() {
        var a;
        var i;
        var r;
        var s;
        var o;
        var c;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                a = t.target.files[0];
                i = a.name.split(".");
                r = i[i.length - 1];
                s = ["xlsx", "xls"];
                if (!s.includes(r)) {
                  n.next = 17;
                  break;
                }
                e.uploading = true;
                e.isUploadExcel = true;
                e.uploadExcelFileInfo.fileName = a.name;
                o = new wO.a(a, 2, true);
                n.next = 11;
                return o.upload();
              case 11:
                c = n.sent;
                if (c.err == 0) {
                  if (c.data.data) {
                    bO("sjzl/readExcelSheet", {
                      path: c.data.data
                    }).then(function (t) {
                      if (t.data.err === 0) {
                        e.uploading = false;
                        e.uploadExcelFileInfo.sheets = t.data.data;
                      }
                      e.$tracker.functionApply({
                        function_source: "批量套版页_第二步",
                        function_name: "导入Excel数据"
                      });
                    }).catch(function () {
                      e.uploading = false;
                      G.a.warning("文件服务出错，请稍候");
                    });
                  }
                } else {
                  e.uploading = false;
                  G.a.warning("文件服务出错，请稍候");
                }
                t.target.value = "";
                t.target.files = [];
                n.next = 18;
                break;
              case 17:
                G.a.error("只支持xlsx，xls表格格式文件", 4);
              case 18:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }
```

## `setTimeout`

参数：`function (`

```js
setTimeout(function () {
                t.analysisExcel(e[n[0]]);
                t.analysising = false;
              }
```
