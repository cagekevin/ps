# 模板 · anon_app.v4_L35851

> 来源：`app.v4.js` render 函数 `cp`（行 35422）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="CommonUse">
  <Myvuescroll class="scroll">
    <div class="app-padding f-center">
      <baseInput class="inputcom1 mr5" @handle v-model="enlargeVal">
        <baseSvg class="ml8" />
        <baseIcon @handle />
      </baseInput>
      <div class="partBtn-wrap f-baseX" />
    </div>
    <div class="app-padding theme-mt-small enlargeAll-wrap f-br" v-show="enlargeIstrue" />
    <div class="app-padding f-center theme-mt">
      <baseInput class="inputcom1 mr5" @secondFun v-model="narrowVal">
        <baseSvg class="ml8" />
        <baseIcon @handle />
      </baseInput>
      <div class="partBtn-wrap f-baseX" />
    </div>
    <div class="app-padding theme-mt-small narrowAll-wrap" v-show="narrowIstrue" />
    <div class="app-padding theme-mt-row f-alignNone" />
    <hr class="line theme-mt-row" />
    <div class="f-br">
      <div class="context-one-wrap drag-common" @click>
        <div class="f-baseY">
          <div class="context-svg-wrap f-center mb6" @mouseenter>
            <div class="ff1" />
            <svg class="icon cursor context-svg">
              <use />
            </svg>
            <svg class="icon cursor context-svg">
              <use />
            </svg>
            <svg class="icon cursor context-svg">
              <use />
            </svg>
            <div class="ff1">
              <svg class="icon cursor mark">
                <use />
              </svg>
            </div>
          </div>
          <p class="context-text cur-default" />
        </div>
      </div>
    </div>
  </Myvuescroll>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 6 | `v-for` |
| `if` 条件分支 | 3 | `v-if` / `v-else` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "CommonUse"
      }, [n("Myvuescroll", {
        staticClass: "scroll"
      }, [t.set.cyShowZoom ? n("div", {
        staticClass: "app-padding f-center",
        attrs: {
          title: "放大元素"
        }
      }, [n("baseInput", {
        staticClass: "inputcom1 mr5",
        attrs: {
          leftPadding: "6px",
          tips: "放大"
        },
        on: {
          handle: t.enlargeOpen
        },
        nativeOn: {
          keyup: function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.inputSize(t.enlargeVal);
            }
          },
          contextmenu: function (e) {
            e.preventDefault();
            return t.enlargeOpen.apply(null, arguments);
          }
        },
        model: {
          value: t.enlargeVal,
          callback: function (e) {
            t.enlargeVal = e;
          },
          expression: "enlargeVal"
        }
      }, [n("baseSvg", {
        staticClass: "ml8",
        attrs: {
          slot: "left",
          name: "#iconfangda"
        },
        slot: "left"
      }), n("baseIcon", {
        attrs: {
          slot: "right",
          name: "#iconzhankaizhedie",
          svgClass: "mr4",
          svgWidth: "10px",
          width: "18px",
          hover: "no"
        },
        on: {
          handle: t.enlargeOpen
        },
        slot: "right"
      })], 1), n("div", {
        staticClass: "partBtn-wrap f-baseX"
      }, t._l(t.enlargePart, function (e, a) {
        return n("button", {
          key: "comUse" + a,
          staticClass: "enlargePart btn-small btn-small-4",
          class: a == 3 ? "mr0" : "",
          on: {
            click: function (n) {
              return t.changeSize(e);
            },
            contextmenu: function (n) {
              return t.fpZoom(e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0)], 1) : t._e(), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.enlargeIstrue,
          expression: "enlargeIstrue"
        }],
        staticClass: "app-padding theme-mt-small enlargeAll-wrap f-br"
      }, t._l(t.enlargeAll, function (e, a) {
        return n("button", {
          key: "comUse1" + a,
          staticClass: "btn-small btn-small-5",
          class: (a + 1) % 5 == 0 && a != 0 ? "mr0" : "",
          on: {
            click: function (n) {
              return t.changeSize(e);
            },
            contextmenu: function (n) {
              return t.fpZoom(e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0), t.set.cyShowZoom ? n("div", {
        staticClass: "app-padding f-center theme-mt",
        attrs: {
          title: "缩小元素"
        }
      }, [n("baseInput", {
        staticClass: "inputcom1 mr5",
        attrs: {
          leftPadding: "6px",
          tips: "缩小"
        },
        on: {
          secondFun: t.narrowOpen
        },
        nativeOn: {
          keyup: function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.inputSize(t.narrowVal);
            }
          },
          contextmenu: function (e) {
            e.preventDefault();
            return t.narrowOpen.apply(null, arguments);
          }
        },
        model: {
          value: t.narrowVal,
          callback: function (e) {
            t.narrowVal = e;
          },
          expression: "narrowVal"
        }
      }, [n("baseSvg", {
        staticClass: "ml8",
        attrs: {
          slot: "left",
          name: "#iconshousuo"
        },
        slot: "left"
      }), n("baseIcon", {
        attrs: {
          slot: "right",
          name: "#iconzhankaizhedie",
          svgClass: "mr4",
          svgWidth: "10px",
          width: "18px",
          hover: "no"
        },
        on: {
          handle: t.narrowOpen
        },
        slot: "right"
      })], 1), n("div", {
        staticClass: "partBtn-wrap f-baseX"
      }, t._l(t.narrowPart, function (e, a) {
        return n("button", {
          key: "comUse2" + a,
          staticClass: "enlargePart btn-small btn-small-4",
          class: a == 3 ? "mr0" : "",
          on: {
            click: function (n) {
              return t.changeSize(e);
            },
            contextmenu: function (n) {
              return t.fpZoom(e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0)], 1) : t._e(), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.narrowIstrue,
          expression: "narrowIstrue"
        }],
        staticClass: "app-padding theme-mt-small narrowAll-wrap"
      }, t._l(t.narrowAll, function (e, a) {
        return n("button", {
          key: "comUse3" + a,
          staticClass: "btn-small btn-small-5",
          class: (a + 1) % 5 == 0 && a != 0 ? "mr0" : "",
          on: {
            click: function (n) {
              return t.changeSize(e);
            },
            contextmenu: function (n) {
              return t.fpZoom(e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0), t.set.cyShowTransformation ? n("div", {
        staticClass: "app-padding theme-mt-row f-alignNone"
      }, t._l(t.transformData, function (e, a) {
        return n("baseIcon", {
          key: "comUse4" + a,
          attrs: {
            svgWidth: "18px",
            name: "#" + e.svg,
            title: e.title
          },
          on: {
            handle: function (n) {
              return t.transformPosition(e.text);
            },
            menu: function (n) {
              return t.fpTransformPosition(e.text);
            }
          }
        });
      }), 1) : t._e(), t.set.cyShowTransformation || t.set.cyShowZoom ? n("hr", {
        staticClass: "line theme-mt-row"
      }) : t._e(), n("div", {
        staticClass: "f-br"
      }, [t._l(t.contextjson, function (e, a) {
        return [e.isShow || e.hasOwnProperty("created") ? n("div", {
          key: a,
          ref: "context",
          refInFor: true,
          staticClass: "context-one-wrap drag-common",
          class: [e.created ? "created" : ""],
          on: {
            click: function (n) {
              return t.clickFunction(e, a);
            },
            contextmenu: function (n) {
              return t.fpFunction(e, a);
            },
            mousedown: function (e) {
              e.stopPropagation();
              return t.drag(a, ".drag-common");
            },
            mousemove: function (e) {
              return t.drop(a);
            }
          }
        }, [e.created ? n(e.comName, {
          tag: "div",
          on: {
            batchExportLayer: t.batchExportLayer,
            batchExportSecondLayer: t.batchExportSecondLayer
          }
        }) : n("div", {
          staticClass: "f-baseY",
          attrs: {
            title: e.title
          }
        }, [n("div", {
          staticClass: "context-svg-wrap f-center mb6",
          class: [t.openfun == e.name ? "contextmenu" : "", e.name == "优化文档" ? "oldguide-therr-context" : "", e.name == "图层颜色互换" ? "guide-therr-exchange" : ""],
          on: {
            mouseenter: function (n) {
              if (e.fillSvg != 1) {
                t.fillSvgName = a;
              }
            },
            mouseleave: function (e) {
              t.fillSvgName = null;
            },
            contextmenu: function (e) {
              return t.open(a);
            }
          }
        }, [n("div", {
          staticClass: "ff1"
        }), e.name == "导出图片" ? n("svg", {
          staticClass: "icon cursor context-svg",
          attrs: {
            "aria-hidden": "true"
          }
        }, [n("use", {
          attrs: {
            "xlink:href": t.set.cyExport.ext == "PNG" ? "#icondaochutupian2" : "#icondaochutupian"
          }
        })]) : e.name == "自动填充颜色" ? n("svg", {
          staticClass: "icon cursor context-svg",
          attrs: {
            "aria-hidden": "true"
          }
        }, [n("use", {
          attrs: {
            "xlink:href": t.set.cyAutoFillColor ? "#iconzidongtianchongsanse" : "#iconzidongtianchongyanse"
          }
        })]) : n("svg", {
          staticClass: "icon cursor context-svg",
          attrs: {
            "aria-hidden": "true"
          }
        }, [n("use", {
          attrs: {
            "xlink:href": t.fillSvgName != a && t.openfun != e.name || !e.fillSvg ? e.svg : e.fillSvg
          }
        })]), n("div", {
          staticClass: "ff1"
        }, [e.ismark ? n("svg", {
          staticClass: "icon cursor mark",
          attrs: {
            "aria-hidden": "true"
          }
        }, [n("use", {
          attrs: {
            "xlink:href": "#iconjiaobiao"
          }
        })]) : t._e()])]), n("p", {
          staticClass: "context-text cur-default"
        }, [t._v(t._s(e.name))])])], 1) : t._e()];
      })], 2)])], 1);
    }
```