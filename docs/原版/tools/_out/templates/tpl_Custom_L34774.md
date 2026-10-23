# 模板 · Custom

> 来源：`app.v4.js` render 函数 `np`（行 34774）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="Custom">
  <Myvuescroll class="app-main">
    <div class="preview f-baseY">
      <div class="w100 f-baseY padd-top4" />
      <div class="f-center h100">
        <p class="f-size16">
          预览效果
        </p>
      </div>
    </div>
    <div class="app-padding switch-wrap f-center" />
    <div class="app-padding">
      <div class="f-baseX mt15 f-alignNone">
        <baseIconInput class="f-space mr10" v-model="set.columnSpacing" />
        <baseIconInput class="f-space" v-model="set.rowSpacing" />
      </div>
      <div class="f-baseX mt10">
        <baseInput class="inputcom-1 theme-mr" v-model="site.text">
          <baseSvg class="ml9" />
          <div class="f-baseX" v-show="inputcomColumn == i">
            <baseIcon class="custom-svg" @handle />
            <baseIcon class="mr6 custom-svg" @handle />
          </div>
        </baseInput>
        <baseIcon class="guide-two-Shape" @handle />
        <baseInput class="hiddenInput" v-model="site.height">
          <baseIcon class="ml4" @handle />
        </baseInput>
      </div>
      <div class="f-baseX mt10 f-space">
        <baseIconInput class="f-space mr10" v-model="set.textSize1" />
        <baseIconInput class="f-space" v-model="set.textSize2" />
      </div>
      <div class="w100 mt15">
        <div class="layout-wrap w100 f-alignNone" />
        <div class="layout-wrap w100 f-alignNone mt6" />
      </div>
      <button class="btn-1 mt12" @click>
        生成框架
      </button>
      <button class="btn-2" @click>
        重置参数
      </button>
      <button class="btn-2 mr0" @click>
        合并矩形
      </button>
    </div>
    <hr class="line mt15" />
    <baseOpen class="theme-mt-row app-padding" v-model="set.cyShowSetFolder">
      <p class="f-size12 mt12">
        1:2:1表示按比例生成3块
      </p>
      <p class="f-size12 mt12">
        3=1>2表示生成3块，第1块比例为2，其他为1
      </p>
      <p class="f-size12 mt12">
        3=1%50表示生成3块，第1块占比50%，其他2个平分50%
      </p>
    </baseOpen>
  </Myvuescroll>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 6 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "Custom"
      }, [n("Myvuescroll", {
        staticClass: "app-main"
      }, [n("div", {
        staticClass: "preview f-baseY",
        attrs: {
          title: "框架预览效果(间距和文字不显示预览哦)"
        }
      }, [t.inputval != 0 ? n("div", {
        staticClass: "w100 f-baseY padd-top4"
      }, t._l(t.set.line, function (e, a) {
        return n("div", {
          key: "custom" + a,
          staticClass: "f-arrayX w80"
        }, t._l(e.arr, function (a, i) {
          return n("div", {
            key: "custom1" + i,
            staticClass: "lie",
            class: t.set.shapeIndex == 1 ? "ring" : "",
            style: t.set.shapeIndex == 0 ? {
              width: "calc(" + (e.pattern == 0 ? a : a / e.allcount * 100) + "% - 2px)",
              height: 125 / t.inputval - 4 + "px"
            } : t.set.shapeIndex == 1 ? {
              width: "calc(" + (e.pattern == 0 ? a : a / e.allcount * 100) + "*0.7vw - 2px)",
              height: "calc(" + (e.pattern == 0 ? a : a / e.allcount * 100) + "*0.7vw - 2px)"
            } : t.set.shapeIndex == 2 ? {
              width: "calc(" + (e.pattern == 0 ? a : a / e.allcount * 100) + "% - 2px)",
              height: "calc(" + (e.pattern == 0 ? a : a / e.allcount * 100) + "*0.7vw - 2px)"
            } : ""
          });
        }), 0);
      }), 0) : t._e(), t.inputval == 0 ? n("div", {
        staticClass: "f-center h100"
      }, [n("p", {
        staticClass: "f-size16"
      }, [t._v("预览效果")])]) : t._e()]), n("div", {
        staticClass: "app-padding switch-wrap f-center"
      }, t._l(t.btnName, function (e, a) {
        return n("button", {
          key: "custom2" + a,
          staticClass: "switch-shape",
          class: t.set.shapeIndex == a ? "switchSelect" : "",
          attrs: {
            title: t.btnTitle[a]
          },
          on: {
            click: function (e) {
              t.set.shapeIndex = a;
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0), n("div", {
        staticClass: "app-padding"
      }, [n("div", {
        staticClass: "f-baseX mt15 f-alignNone"
      }, [n("baseIconInput", {
        staticClass: "f-space mr10",
        attrs: {
          leftPadding: "2px",
          name: "#iconliejianju",
          tips: "列间距",
          title: "列间距" + t.unitTips
        },
        nativeOn: {
          "!blur": function (e) {
            return t.checkColumn.apply(null, arguments);
          }
        },
        model: {
          value: t.set.columnSpacing,
          callback: function (e) {
            t.$set(t.set, "columnSpacing", e);
          },
          expression: "set.columnSpacing"
        }
      }), n("baseIconInput", {
        staticClass: "f-space",
        attrs: {
          leftPadding: "2px",
          name: "#iconhangjianju",
          tips: "行间距",
          title: "行间距" + t.unitTips
        },
        nativeOn: {
          "!blur": function (e) {
            return t.checkRow.apply(null, arguments);
          }
        },
        model: {
          value: t.set.rowSpacing,
          callback: function (e) {
            t.$set(t.set, "rowSpacing", e);
          },
          expression: "set.rowSpacing"
        }
      })], 1), t._l(t.set.line, function (e, a) {
        return n("div", {
          key: "custom3" + a,
          staticClass: "f-baseX mt10"
        }, [n("baseInput", {
          staticClass: "inputcom-1 theme-mr",
          attrs: {
            leftPadding: "8px",
            index: a,
            tips: "第" + (a + 1) + "行",
            title: "每行生成的数量，支持表达式"
          },
          nativeOn: {
            mouseenter: function (e) {
              t.inputcomColumn = a;
            },
            mouseleave: function (e) {
              t.inputcomColumn = -1;
            },
            keyup: function (n) {
              return t.preview(e, a);
            }
          },
          model: {
            value: e.text,
            callback: function (n) {
              t.$set(e, "text", n);
            },
            expression: "site.text"
          }
        }, [n("baseSvg", {
          staticClass: "ml9",
          attrs: {
            slot: "left",
            name: "#iconlieshu"
          },
          slot: "left"
        }), n("div", {
          directives: [{
            name: "show",
            rawName: "v-show",
            value: t.inputcomColumn == a,
            expression: "inputcomColumn == i"
          }],
          staticClass: "f-baseX",
          attrs: {
            slot: "right"
          },
          slot: "right"
        }, [n("baseIcon", {
          staticClass: "custom-svg",
          attrs: {
            hover: "no",
            width: "22px",
            name: "#icontianjialieshu",
            title: "添加一行"
          },
          on: {
            handle: function (e) {
              return t.add(e, a);
            }
          }
        }), n("baseIcon", {
          staticClass: "mr6 custom-svg",
          attrs: {
            hover: "no",
            width: "22px",
            name: "#iconshandiao",
            title: "删除行"
          },
          on: {
            handle: function (e) {
              return t.remove(e, a);
            }
          }
        })], 1)], 1), t.heightIstrue == 0 ? n("baseIcon", {
          staticClass: "guide-two-Shape",
          attrs: {
            name: "#icongaodu",
            svgWdith: "20px",
            title: "行高度"
          },
          on: {
            handle: function (e) {
              t.heightIstrue = true;
            }
          }
        }) : n("baseInput", {
          staticClass: "hiddenInput",
          attrs: {
            leftPadding: "2px",
            tips: "高度",
            title: "行高度",
            index: a
          },
          nativeOn: {
            "!blur": function (e) {
              return t.checkLineHeight(a);
            }
          },
          model: {
            value: e.height,
            callback: function (n) {
              t.$set(e, "height", n);
            },
            expression: "site.height"
          }
        }, [n("baseIcon", {
          staticClass: "ml4",
          attrs: {
            slot: "left",
            hover: "no",
            name: "#icongaodu",
            title: "收缩"
          },
          on: {
            handle: t.inputcomHeightFun
          },
          slot: "left"
        })], 1)], 1);
      }), n("div", {
        staticClass: "f-baseX mt10 f-space"
      }, [n("baseIconInput", {
        staticClass: "f-space mr10",
        attrs: {
          leftPadding: "2px",
          validate: "number",
          name: "#iconzhubiaotizihao",
          tips: "主标题字号",
          title: "字号大小，默认不生成"
        },
        model: {
          value: t.set.textSize1,
          callback: function (e) {
            t.$set(t.set, "textSize1", e);
          },
          expression: "set.textSize1"
        }
      }), n("baseIconInput", {
        staticClass: "f-space",
        attrs: {
          leftPadding: "2px",
          validate: "number",
          name: "#iconfubiaotizihao",
          tips: "副标题字号",
          title: "字号大小，默认不生成"
        },
        model: {
          value: t.set.textSize2,
          callback: function (e) {
            t.$set(t.set, "textSize2", e);
          },
          expression: "set.textSize2"
        }
      })], 1), n("div", {
        staticClass: "w100 mt15"
      }, [n("div", {
        staticClass: "layout-wrap w100 f-alignNone"
      }, t._l(t.positionSvgone, function (e, a) {
        return n("baseIcon", {
          key: "custom4" + a,
          attrs: {
            name: "#" + e,
            title: "文案出现的位置",
            select: t.set.textLocation == a
          },
          on: {
            handle: function (e) {
              t.set.textLocation = a;
            }
          }
        });
      }), 1), n("div", {
        staticClass: "layout-wrap w100 f-alignNone mt6"
      }, t._l(t.positionSvgtwo, function (e, a) {
        return n("baseIcon", {
          key: "custom5" + a,
          style: {
            visibility: a >= 3 ? "hidden" : ""
          },
          attrs: {
            name: "#" + e,
            title: "文案出现的位置",
            select: t.set.textLocation == a + 6
          },
          on: {
            handle: function (e) {
              t.set.textLocation = a + 6;
            }
          }
        });
      }), 1)]), n("button", {
        staticClass: "btn-1 mt12",
        attrs: {
          title: "生成框架"
        },
        on: {
          click: function (e) {
            return t.generate();
          },
          contextmenu: function (e) {
            return t.openFree();
          }
        }
      }, [t._v(" 生成框架 ")]), n("button", {
        staticClass: "btn-2",
        attrs: {
          title: "重置参数"
        },
        on: {
          click: t.reset
        }
      }, [t._v("重置参数")]), n("button", {
        staticClass: "btn-2 mr0",
        attrs: {
          title: "合并多个矩形图层"
        },
        on: {
          click: function (e) {
            return t.mergeRectangles();
          },
          contextmenu: function (e) {
            return t.openFreeMerge();
          }
        }
      }, [t._v(" 合并矩形 ")])], 2), n("hr", {
        staticClass: "line mt15"
      }), n("baseOpen", {
        staticClass: "theme-mt-row app-padding",
        attrs: {
          text: "表达式使用说明",
          align: "rightCenter"
        },
        model: {
          value: t.set.cyShowSetFolder,
          callback: function (e) {
            t.$set(t.set, "cyShowSetFolder", e);
          },
          expression: "set.cyShowSetFolder"
        }
      }, [n("p", {
        staticClass: "f-size12 mt12"
      }, [t._v("1:2:1表示按比例生成3块")]), n("p", {
        staticClass: "f-size12 mt12"
      }, [t._v("3=1>2表示生成3块，第1块比例为2，其他为1")]), n("p", {
        staticClass: "f-size12 mt12"
      }, [t._v("3=1%50表示生成3块，第1块占比50%，其他2个平分50%")])])], 1)], 1);
    }
```