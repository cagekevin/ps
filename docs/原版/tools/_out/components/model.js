{
      components: {
        dropDown: gm,
        Popup: xO.a,
        GIcon: Jh.a
      },
      props: {
        layerVaribleList: {
          type: Array,
          default: function () {
            return [];
          }
        },
        varibleValues: {
          type: Object,
          default: function () {
            return {};
          }
        }
      },
      data: function () {
        return {
          tableOneIstrue: -1,
          textPagingIndex: 1,
          pageSize: 5,
          excelDataType: ["导入Excel数据", "下载Excel数据"],
          showSelectTextValue: "",
          showImportExcelPopup: false,
          selectIconRotate180: false,
          isUploadExcel: false,
          productList: [],
          recordSelectImageProduct: "",
          recordSelectImageLayerId: "",
          recordSelectImageLayerIndex: "",
          textAreaValue: "",
          uploadExcelFileInfo: {
            fileName: "",
            sheets: {}
          },
          selectSheetIndex: null,
          showSelectSheetsPopup: false,
          xssChar: "'\"()<>",
          analysising: false,
          uploading: false
        };
      },
      watch: {
        layerVaribleList: function () {
          var t = {};
          this.layerVaribleList.forEach(function (e) {
            t[e.id] = "";
            t.tHeader = "套版01";
          });
          this.productList = [t];
        }
      },
      methods: {
        showTextMenu: function () {},
        dragColorWrap: function () {},
        dragColorWrapDrop: function () {},
        clickLayerVariableItem: function (t) {
          this.$cep.jsxNoCheck("Layer_onIdSelectLayer", [t.id]);
        },
        handleClickSelect: function (t) {
          this.selectIconRotate180 = true;
          this.$refs[t].open();
        },
        handleAddProduct: function () {
          var t = this.productList.length;
          var e = {};
          this.layerVaribleList.forEach(function (n) {
            e[n.id] = "";
            e.tHeader = `套版${t < 10 ? "0" : ""}${t + 1}`;
          });
          this.productList.push(e);
        },
        deleteProductItem: function (t) {
          this.productList.splice(t, 1);
        },
        handleSelectImage: function (t, e, n) {
          this.$refs.selectImgFileRef.value = "";
          if (this.$refs.selectImgFileRef.click) {
            this.$refs.selectImgFileRef.click();
          }
          this.recordSelectImageProduct = JSON.parse(JSON.stringify(t));
          this.recordSelectImageLayerId = e;
          this.recordSelectImageLayerIndex = n;
        },
        showSplitImgName: function (t, e) {
          var n = t.split("/");
          return n[n.length - 1];
        },
        imageFimeChange: function (t) {
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
        },
        getCurrentDropdownIsShow: function (t) {
          return this.$refs[t] && this.$refs[t].isShowCurDropdown;
        },
        selectExcelChange: function (t) {
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
        },
        deleteExcel: function () {
          this.isUploadExcel = false;
          this.$refs.uploadExcel.value = "";
        },
        nextStep: function () {
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
        },
        handleUploadExcel: function () {
          if (this.$refs.uploadExcel.click) {
            this.$refs.uploadExcel.click();
          }
        },
        excelFileChange: function (t) {
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
        },
        closePopup: function () {
          this.isUploadExcel = false;
          this.showImportExcelPopup = false;
        },
        confirmImport: function () {
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
        },
        analysisExcel: function (t) {
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
        },
        analysisTextArea: function () {
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
        },
        handleSystemChar: function (t) {
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
        },
        checkXssChars: function () {
          return false;
        },
        checkImgType: function (t = "") {
          var e = ["png", "jpg", "jpeg"];
          return e.includes(t.toLowerCase());
        },
        makeExcelFile: function () {
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
      }
    };
    var CO = kO;
    n("d370");
    var _O = Object(Y.a)(CO, pO, mO, false, null, "6924bc54", null);
    var SO = _O.exports;
    function OO() {
      var t = this;
      var e = t.$createElement;
      var a = t._self._c || e;
      return a("div", {
        staticClass: "table w100 ff1 f-arrayY"
      }, [t._m(0), t.variableList.length != 0 ? a("Myvuescroll", {
        staticClass: "list-context-wrap ff1",
        class: {
          isInPopup: t.isInPopup
        }
      }, t._l(t.variableList, function (e, i) {
        return a("tr", {
          key: "overpringt1" + i,
          staticClass: "list-context f-baseX drag-overprintOne-wrap f-alignNone mt1",
          class: {
            trclick: t.selectLayerIds.includes(e.id)
          },
          on: {
            click: function (n) {
              return t.selectLayerVarible(e);
            },
            contextmenu: function (n) {
              n.preventDefault();
              n.stopPropagation();
              return t.showTextMenu(n, e, i);
            },
            mousedown: function (e) {
              return t.dragColorWrap(i, ".drag-overprintOne-wrap", ".overprint-vueScroll", "texts");
            },
            mousemove: function (e) {
              return t.dragColorWrapDrop(i);
            }
          }
        }, [a("td", {
          staticClass: "id"
        }, [e.type == "text" ? a("img", {
          attrs: {
            src: n("0be4"),
            alt: ""
          }
        }) : a("img", {
          attrs: {
            src: n("a437"),
            alt: ""
          }
        })]), a("td", {
          staticClass: "layerName "
        }, [a("pre", {
          attrs: {
            title: e.layerName
          }
        }, [t._v(t._s(e.layerName))])]), a("td", {
          staticClass: "variableName ",
          on: {
            click: function (t) {
              t.stopPropagation();
            }
          }
        }, [t.isInPopup ? t._e() : a("pre", [t._v(t._s(t.varibleValues[e.id]))]), t.isInPopup ? a("input", {
          directives: [{
            name: "model",
            rawName: "v-model",
            value: t.varibleValues[e.id],
            expression: "varibleValues[site.id]"
          }],
          attrs: {
            type: "text",
            placeholder: "请输入编辑"
          },
          domProps: {
            value: t.varibleValues[e.id]
          },
          on: {
            blur: function (n) {
              return t.inputVaribleBlur(t.varibleValues[e.id], e);
            },
            input: function (n) {
              if (!n.target.composing) {
                t.$set(t.varibleValues, e.id, n.target.value);
              }
            }
          }
        }) : t._e()])]);
      }), 0) : t._e(), t.variableList.length == 0 ? a("div", {
        staticClass: "no-add f-center ff1 f-baseY"
      }, [a("img", {
        staticClass: "no_set_var",
        attrs: {
          src: n("f073"),
          alt: ""
        }
      }), a("p", [t._v("未添加变量")])]) : t._e()], 1);
    }
    var TO = [function () {
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("tr", {
        staticClass: "w100 list-nav f-baseX f-alignNone"
      }, [n("td", {
        staticClass: "id borderRight"
      }, [t._v("类型")]), n("td", {
        staticClass: "variableName borderRight"
      }, [t._v("图层名称")]), n("td", {
        staticClass: "layerName"
      }, [t._v("变量名称")])]);
    }];
    var IO = {
      props: {
        variableList: {
          type: Array,
          default: function () {
            return [];
          }
        },
        varibleValues: {
          type: Object,
          default: function () {
            return {};
          }
        },
        isInPopup: {
          type: Boolean,
          default: function () {
            return false;
          }
        }
      },
      components: {
        mySvg: fO
      },
      data: function () {
        return {
          selectLayerIds: []
        };
      },
      methods: {
        selectLayerVarible: function (t) {
          this.$cep.jsxNoCheck("Layer_onIdSelectLayer", [t.id]);
          if (this.isInPopup) {
            var e = this.selectLayerIds.indexOf(t.id);
            if (e > -1) {
              this.selectLayerIds.splice(e, 1);
            } else {
              this.selectLayerIds.push(t.id);
            }
          }
        },
        inputVaribleBlur: function (t = "", e) {
          var n = JSON.parse(JSON.stringify(this.varibleValues));
          delete n[e.id];
          var a = false;
          for (var i in n) {
            if (n[i] && n[i].trim() && t.trim() && n[i] === t) {
              G.a.error("变量名称已存在");
              a = true;
              break;
            }
          }
          if (!a && t.trim()) {
            e.name = t;
            if (!this.selectLayerIds.includes(e.id)) {
              this.selectLayerIds.push(e.id);
            }
          }
        },
        showTextMenu: function (t, e, n) {
          if (!this.isInPopup) {
            this.$emit("showTextMenu", t, e, n);
          }
        },
        dragColorWrap: function (t, e, n, a) {},
        dragColorWrapDrop: function (t) {
          this.moveEndIndex = t;
        }
      }
    };
    var FO = IO;
    n("4ea7");
    var AO = Object(Y.a)(FO, OO, TO, false, null, "5ffb0e6a", null);
    var jO = AO.exports;
    var zO = {
      name: "Overprint",
      components: {
        mySvg: fO,
        check: Pd.a,
        Popup: xO.a,
        paging: Fv,
        dropDown: gm,
        SetOverprintList: SO,
        SetVariableList: jO,
        GIcon: Jh.a,
        GTooltip: jo.a
      },
      data: function () {
        var t = "text";
        var e = "image";
        return {
          switchdata: [{
            label: "变量设置",
            isShow: false
          }, {
            label: "批量套版",
            isShow: false
          }, {
            label: "开始套版",
            isShow: false
          }],
          showActiveTypeFilterValue: "全部",
          activeTypeFilterValue: "",
          textVariableType: t,
          imageVariableType: e,
          filterVarTypes: ["全部", "文本", "图片"],
          isShowFilterSelect: false,
          switchindex: 0,
          selectImgReplaceType: 2,
          exportFileTypes: ["JPG", "PNG", "GIF"],
          exportFileTypeValue: "JPG",
          selectPathTypeValue: 0,
          selectPathTypes: [{
            label: "桌面",
            value: 1
          }, {
            label: "文件所在目录",
            value: 2
          }, {
            label: "自定义路径",
            value: 3
          }],
          setNameInputPlaceHold: "请输入文件名",
          setNameValue: "",
          suffixDropDown: [{
            label: "序号(01,02...)",
            value: "01"
          }, {
            label: "套版名称(套版01,套版02...)",
            value: "套版01"
          }, {
            label: "套版序号(套版01_01,套版01_02...)",
            value: "套版01_01"
          }],
          setNameSelectValue: 0,
          set: V.a.info,
          batchData: [],
          productList: [],
          variable: {
            layerVariables: [],
            texts: [{
              name: 0,
              layerName: 0
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }, {
              name: 1546484545163666,
              layerName: 845645341531094500
            }],
            images: [{
              name: 0,
              layerName: 0
            }, {
              name: 1,
              layerName: 0
            }, {
              name: 0,
              layerName: 0
            }, {
              name: 1,
              layerName: 0
            }, {
              name: 0,
              layerName: 0
            }, {
              name: 1,
              layerName: 0
            }, {
              name: 0,
              layerName: 0
            }, {
              name: 1,
              layerName: 0
            }, {
              name: 0,
              layerName: 0
            }, {
              name: 1,
              layerName: 0
            }, {
              name: 0,
              layerName: 0
            }, {
              name: 1,
              layerName: 50512454541210
            }]
          },
          recordVaribleValues: {},
          recordHandleVaribleType: "",
          showLayerVariableListInPopup: [],
          confirmSelectedLarerVaribleList: [],
          isFirstLoad: true,
          showSelctVarList: false,
          moveEndIndex: null,
          addIstrue: false,
          beAfterData: "不可用",
          suffixDropDownIstrue: false,
          pageSize: 5,
          tableOneIstrue: -1,
          tableTwoIstrue: -1,
          status: false,
          showAutoGetVariablePopup: false
        };
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
      created: function () {
        this.openEvent();
      },
      mounted: function () {
        this.readPsdXmpToData();
        var t = document.querySelectorAll(".table")[0].offsetHeight;
        var e = document.querySelectorAll(".list-context")[0].offsetHeight + 4;
        this.pageSize = Math.floor(t / e);
        this.$log.push("overprint");
      },
      methods: {
        refreshData: function () {
          var t = this;
          Promise.all([this.getAllLayerList(), this.readPsdXmpToData()]).finally(function () {
            t.$load.hide();
          });
        },
        readPsdXmpToData: function () {
          var t = this;
          return new Promise(function () {
            var e = Object(d.a)(regeneratorRuntime.mark(function e(n) {
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
                      a = e.sent;
                      if (a) {
                        e.next = 7;
                        break;
                      }
                      t.confirmSelectedLarerVaribleList = [];
                      t.recordVaribleValues = {};
                      return e.abrupt("return");
                    case 7:
                      i = Object(wt.a)(a);
                      try {
                        r = JSON.parse(i);
                        if (r && !Array.isArray(r)) {
                          o = r.texts;
                          c = r.images;
                          if (o && o.length) {
                            o.forEach(function (e) {
                              return e.type = t.textVariableType;
                            });
                          }
                          if (c && c.length) {
                            c.forEach(function (e) {
                              return e.type = t.imageVariableType;
                            });
                          }
                          s = [].concat(Object(ct.a)(o), Object(ct.a)(c));
                        }
                        t.confirmSelectedLarerVaribleList = s || r;
                        l = {};
                        t.confirmSelectedLarerVaribleList.forEach(function (t) {
                          return l[t.id] = t.name;
                        });
                        t.recordVaribleValues = l;
                        n(a);
                      } catch (u) {
                        n(false);
                      }
                    case 9:
                    case "end":
                      return e.stop();
                  }
                }
              }, e);
            }));
            return function (t) {
              return e.apply(this, arguments);
            };
          }());
        },
        getAllLayerList: function () {
          var t = this;
          return new Promise(function () {
            var e = Object(d.a)(regeneratorRuntime.mark(function e(n) {
              var a;
              var i;
              var r;
              return regeneratorRuntime.wrap(function (e) {
                while (1) {
                  switch (e.prev = e.next) {
                    case 0:
                      e.next = 2;
                      return t.$cep.jsxNoCheck("overprint_getAllLayers");
                    case 2:
                      a = e.sent;
                      if (a && a.err === 0) {
                        i = a.data;
                        r = [].concat(Object(ct.a)(i.texts), Object(ct.a)(i.images));
                        if (r.length <= 10) {
                          t.intellSort(i.texts);
                          t.intellSort(r, true);
                        }
                        t.variable.texts = i.texts;
                        t.variable.images = i.images;
                        t.variable.layerVariables = r;
                        t.showLayerVariableListInPopup = r;
                      }
                      n(true);
                    case 5:
                    case "end":
                      return e.stop();
                  }
                }
              }, e);
            }));
            return function (t) {
              return e.apply(this, arguments);
            };
          }());
        },
        intellSort: function (t, e) {
          var n = this;
          var a = ["名字", "价格"];
          var i = /\d/g;
          t.forEach(function (r, s) {
            if (e) {
              r.name = n.recordVaribleValues[r.id];
            }
            var o = a.find(function (t) {
              return r.layerName.includes(t);
            }) || i.test(r.layerName);
            if (r.type === n.textVariableType && o) {
              var c = t.splice(s, 1)[0];
              t.unshift(c);
            }
          });
        },
        handleAutoGetVariable: function () {
          var t = this;
          this.showAutoGetVariablePopup = true;
          this.isShowFilterSelect = true;
          this.recordHandleVaribleType = "auto";
          this.showLayerVariableListInPopup = [];
          if (this.confirmSelectedLarerVaribleList.length) {
            this.$refs.setVarListRef.selectLayerIds = this.confirmSelectedLarerVaribleList.map(function (t) {
              return t.id;
            });
          } else {
            this.$refs.setVarListRef.selectLayerIds = [];
          }
          if (this.isFirstLoad) {
            this.$load.show("识别中，请稍候...");
            setTimeout(function () {
              t.getAllLayerList().finally(function () {
                t.$load.hide();
              });
              t.isFirstLoad = false;
            }, 300);
          } else {
            this.showLayerVariableListInPopup = this.variable.layerVariables;
          }
        },
        testJsx: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    e.next = 2;
                    return t.$cep.jsxNoCheck("testJsx");
                  case 2:
                    e.sent;
                  case 3:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          }))();
        },
        handleAddVar: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            var n;
            var a;
            var i;
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    t.showAutoGetVariablePopup = true;
                    t.isShowFilterSelect = false;
                    t.recordHandleVaribleType = "handle";
                    t.showLayerVariableListInPopup = [];
                    if (t.confirmSelectedLarerVaribleList.length) {
                      t.$refs.setVarListRef.selectLayerIds = t.confirmSelectedLarerVaribleList.map(function (t) {
                        return t.id;
                      });
                    }
                    e.next = 7;
                    return t.$cep.jsxNoCheck("overprint_getSelectedLayerByItemIndex");
                  case 7:
                    n = e.sent;
                    if (n && n.err === 0) {
                      a = n.data;
                      t.showLayerVariableListInPopup = a || [];
                      t.recordHandleAddVaribleList = a || [];
                      i = a.map(function (t) {
                        return t.id;
                      });
                      if (i.length) {
                        t.$refs.setVarListRef.selectLayerIds = i;
                      }
                    }
                  case 9:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          }))();
        },
        handleClickSwitch: function (t) {
          if (this.switchindex > t) {
            this.switchindex = t;
          }
        },
        mouseOverSwitchIndex: function (t, e) {
          if (this.switchindex > e) {
            t.isShow = true;
          }
        },
        mouseLeaveSwitchIndex: function (t) {
          t.isShow = false;
        },
        cancelSelectLayerVariblePoPup: function () {
          this.showAutoGetVariablePopup = false;
        },
        confirmSelectLayerVariblePopup: function () {
          var t = this;
          this.showAutoGetVariablePopup = false;
          var e = JSON.parse(JSON.stringify(this.$refs.setVarListRef.selectLayerIds));
          var n = [];
          this.variable.layerVariables.forEach(function (t) {
            var a = e.indexOf(t.id);
            if (a > -1) {
              n.push(t);
              e.splice(a, 1);
            }
          });
          if (e.length) {
            var a = this.recordHandleAddVaribleList.filter(function (t) {
              return e.includes(t.id);
            });
            n.push.apply(n, Object(ct.a)(a));
          }
          function i(e) {
            var n = 0;
            if (e.length) {
              e.forEach(function (e) {
                if (!t.recordVaribleValues[e.id]) {
                  var a = function e() {
                    n += 1;
                    var a = `变量${n < 10 ? 0 : ""}${n}`;
                    var i = Object.values(t.recordVaribleValues);
                    if (i.includes(a)) {
                      return e();
                    } else {
                      return a;
                    }
                  };
                  var i = a();
                  e.name = i;
                  t.recordVaribleValues[e.id] = i;
                }
              });
            }
          }
          i(n);
          if (this.recordHandleVaribleType === "auto") {
            this.confirmSelectedLarerVaribleList = n;
          } else {
            n.forEach(function (e) {
              var n = t.confirmSelectedLarerVaribleList.find(function (t) {
                return t.id === e.id;
              });
              if (!n) {
                t.confirmSelectedLarerVaribleList.push(e);
              }
            });
          }
          this.updataToPsd();
        },
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
        preStep: function () {
          this.switchindex -= 1;
        },
        nextStep: function () {
          if (this.switchindex == 0) {
            if (!this.confirmSelectedLarerVaribleList.length) {
              return G.a.warning("请先选择套版的图层");
            }
            var t = Object.values(this.recordVaribleValues);
            var e = Object(ct.a)(new Set(t));
            if (t.length !== e.length) {
              var n = [];
              var a = {};
              for (var i = 0; i < t.length; i++) {
                if (a[t[i]]) {
                  n.push(t[i]);
                } else {
                  a[t[i]] = true;
                }
              }
              return this.$msg.showErr("变量名称存在重复项，请检查：" + n.join(", "));
            }
            this.$tracker.functionApply({
              function_source: "批量套版页_第一步",
              function_name: "完成第一步"
            });
          }
          if (this.switchindex == 1) {
            this.productList = this.$refs.setProductRef.productList;
            this.$tracker.functionApply({
              function_source: "批量套版页_第二步",
              function_name: "完成第二步"
            });
          }
          this.switchindex += 1;
        },
        dropOpen: function (t) {
          this.$refs[t].open();
        },
        getCurrentDropdownIsShow: function (t) {
          return this.$refs[t] && this.$refs[t].isShowCurDropdown;
        },
        getFileShowName: function () {
          if (this.setNameSelectValue) {
            var t = this.setNameSelectValue === 2 ? "_01" : "";
            return `${this.setNameValue || this.setNameInputPlaceHold}-${this.productList[0].tHeader || "套版01"}${t}.${this.exportFileTypeValue}`;
          }
          return `${this.setNameValue || this.setNameInputPlaceHold}-${this.suffixDropDown[this.setNameSelectValue].value}.${this.exportFileTypeValue}`;
        },
        selectFilterVarTypeChange: function (t) {
          this.showActiveTypeFilterValue = this.filterVarTypes[t[0]];
          switch (t[0]) {
            case 1:
              this.activeTypeFilterValue = "text";
              this.showLayerVariableListInPopup = this.variable.layerVariables.filter(function (t) {
                return t.type == "text";
              });
              break;
            case 2:
              this.activeTypeFilterValue = "image";
              this.showLayerVariableListInPopup = this.variable.layerVariables.filter(function (t) {
                return t.type == "image";
              });
              break;
            default:
              this.activeTypeFilterValue = "";
              this.showLayerVariableListInPopup = this.variable.layerVariables;
          }
        },
        selectExportFileTypeChange: function (t) {
          this.exportFileTypeValue = this.exportFileTypes[t[0]];
          this.set.cyExport.ext = this.exportFileTypes[t[0]];
        },
        selectPathTypesChange: function (t) {
          var e = this;
          return Object(d.a)(regeneratorRuntime.mark(function n() {
            var a;
            return regeneratorRuntime.wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    e.selectPathTypeValue = t[0];
                    if (t[0] + 1 != 3) {
                      n.next = 10;
                      break;
                    }
                    n.next = 4;
                    return e.$cep.jsxNoCheck("Fs_selectFolder");
                  case 4:
                    a = n.sent;
                    if (a != -1) {
                      n.next = 7;
                      break;
                    }
                    return n.abrupt("return", e.$tips.show("取消选择"));
                  case 7:
                    e.set.batch.customPath = a;
                    n.next = 11;
                    break;
                  case 10:
                    e.set.batch.customPath = "";
                  case 11:
                  case "end":
                    return n.stop();
                }
              }
            }, n);
          }))();
        },
        selectSetNameSuffixChange: function (t) {
          this.setNameSelectValue = t[0];
        },
        showMenu: function (t) {
          var e = this;
          var n = [{
            text: "刷新数据",
            callback: function () {
              e.refreshData();
              e.$tips.show("刷新成功");
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
          this.switchindex = 0;
          this.showAutoGetVariablePopup = false;
          this.isFirstLoad = true;
          this.readPsdXmpToData();
        },
        showTextMenu: function (t, e, n) {
          var a = this;
          var i = [{
            text: "删除",
            callback: function () {
              delete a.recordVaribleValues[e.id];
              a.confirmSelectedLarerVaribleList.splice(n, 1);
              a.updataToPsd();
            }
          }, {
            text: "修改变量名",
            callback: function () {
              a.$inputBox.show(function (t) {
                var n = a.checkTextVar(t);
                if (n) {
                  var i = JSON.parse(JSON.stringify(a.recordVaribleValues));
                  i[e.id] = t;
                  a.recordVaribleValues = i;
                  a.$tips.show("修改成功");
                  a.updataToPsd();
                }
              }, "请输入新变量名");
            }
          }, {
            text: "清空",
            callback: function () {
              a.$msg.confirm("清空列表", "操作不可恢复，是否继续？", function (t) {
                a.confirmSelectedLarerVaribleList = [];
                a.recordVaribleValues = {};
                a.$refs.setVarListRef.selectLayerIds = [];
                a.$tips.show("清空成功");
                a.updataToPsd();
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
            var o;
            var c;
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    if (t.confirmSelectedLarerVaribleList.length) {
                      e.next = 2;
                      break;
                    }
                    return e.abrupt("return", t.$msg.showErr("请添加变量后再批量套版"));
                  case 2:
                    t.set.batch.savePath = t.selectPathTypeValue + 1;
                    t.set.batch.imgReplaceType = t.selectImgReplaceType;
                    n = Object(ft.c)(t.set.batch);
                    if (n.exportImage || n.isExportPsd) {
                      e.next = 7;
                      break;
                    }
                    return e.abrupt("return", G.a.warning("导出格式至少选一种"));
                  case 7:
                    t.confirmSelectedLarerVaribleList.forEach(function (e) {
                      e.name = t.recordVaribleValues[e.id];
                    });
                    a = [];
                    t.productList.forEach(function (e) {
                      var n = {};
                      function i(a) {
                        var i = t.confirmSelectedLarerVaribleList.find(function (t) {
                          return t.id == a;
                        });
                        if (i) {
                          if (i.type === "image") {
                            var r = e[a].split("/");
                            n[i.name] = Xv(r[r.length - 1]);
                            r.pop();
                            n.图片所在目录 = Xv(r.join("/") || "");
                          } else {
                            var s = e[a] || e[a] === 0 ? `${e[a]}` : "";
                            n[i.name] = Xv(s);
                            n.图片所在目录 = n.图片所在目录 || "";
                          }
                        }
                      }
                      for (var r in e) {
                        i(r);
                      }
                      a.push(n);
                    });
                    t.batchData = a;
                    if (t.batchData.length != 0) {
                      e.next = 13;
                      break;
                    }
                    return e.abrupt("return", t.$msg.showErr("请先导入套版数据"));
                  case 13:
                    n.texts = JSON.parse(JSON.stringify(t.confirmSelectedLarerVaribleList.filter(function (e) {
                      return e.type === t.textVariableType;
                    })));
                    i = /'/g;
                    n.texts.forEach(function (t) {
                      return t.layerName = t.layerName.replace(i, "");
                    });
                    n.images = t.confirmSelectedLarerVaribleList.filter(function (e) {
                      return e.type === t.imageVariableType;
                    });
                    n.fileName.variable = t.beAfterData;
                    n.ext = t.set.cyExport.ext.toLowerCase();
                    r = "";
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
                    s = function (e) {
                      var n = t.setNameSelectValue === 2 ? "_01" : "";
                      var a = t.setNameSelectValue === 0 ? t.suffixDropDown[t.setNameSelectValue].value : t.productList[e].tHeader + n || `套版${e + 1 < 10 ? "0" : ""}${e + 1}`;
                      if (t.setNameSelectValue === 1) {
                        return `${t.setNameValue || "批量套版"}-${a}`;
                      }
                      a = a.substring(0, a.length - 1) + (e + 1);
                      var i = `${t.setNameValue || "批量套版"}-${a}`;
                      return i;
                    };
                    e.prev = 23;
                    o = 0;
                  case 25:
                    if (!(o < t.batchData.length)) {
                      e.next = 36;
                      break;
                    }
                    t.$load.show("正在批量套版:" + (o + 1) + "/" + t.batchData.length);
                    n.data = [t.batchData[o]];
                    n.fileFullName = s(o);
                    e.next = 31;
                    return t.$cep.jsxNoCheck("overprint_useOverprint", [n]);
                  case 31:
                    c = e.sent;
                    if (c && c.err == 1) {
                      r += c.msg + "<br><br>";
                    }
                  case 33:
                    o++;
                    e.next = 25;
                    break;
                  case 36:
                    e.next = 41;
                    break;
                  case 38:
                    e.prev = 38;
                    e.t0 = e.catch(23);
                    t.$msg.showErr("发生未知错误，请检查变量以及图片路径是否正确！");
                  case 41:
                    t.$load.hide();
                    t.$tips.show("套版完成");
                    t.$cep.jsxNoCheck("tb_openPsdFolder", [n]);
                    if (r != "") {
                      t.$msg.showErrHtml(r);
                    }
                    t.$tracker.functionApply({
                      function_source: "批量套版页_第三步",
                      function_name: "完成第三步"
                    });
                  case 46:
                  case "end":
                    return e.stop();
                }
              }
            }