# 模板 · anon_app.v4_L39697

> 来源：`app.v4.js` render 函数 `Wm`（行 39344）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="w100">
  <div class="Hierarchy-open mt10">
    <div>
      <div class="f-baseX app-padding">
        <div class="f-space HierarchySvgContext-drop-wrap">
          <baseDropdownMenu class="f-space" @handle />
          <hierarchyDropDown class="HierarchySvgContext-drop" @change />
        </div>
        <baseIcon class="ml12 oldguide-four-preset" @handle />
      </div>
      <div class="app-padding mt10">
        <div class="f-alignNone" />
      </div>
      <div class="Hierarchy-svg-context mt10" v-show="HierarchySvgNavIstrue">
        <div class="f-alignNone" />
        <div class="f-baseX mt10">
          <button class="btn-2 mb0 " @click>
            保存到预设
          </button>
          <button class="btn-2 mb0 mr0" @click>
            新建预设
          </button>
        </div>
      </div>
      <hr class="line mt10" />
    </div>
    <div>
      <baseOpen class="mt6  " v-model="layoutIstrue">
        <div class="smarttype-main app-padding mt6">
          <div>
            <div class="f-baseX">
              <p>
                场景
              </p>
              <div class="f-space ml8 relative">
                <baseDropdownMenu @handle />
                <dropDowncom class="absolute zindex99 w100" @dropchange />
              </div>
              <p class="ml17">
                对齐
              </p>
              <div class="ml8 f-space relative">
                <baseDropdownMenu @handle />
                <dropDowncom class="absolute zindex99 w100" @dropchange />
              </div>
            </div>
            <div class="layout-button mt7" />
          </div>
          <div class=" mt7">
            <div class="f-baseX">
              <p>
                间隔基数
              </p>
              <baseInput class="f-space ml8" v-model="layoutIntervalOne" />
              <baseCheck class="ml17" v-model="autoCountInterval">
                自动计算间隔
              </baseCheck>
            </div>
            <div class="f-baseX mt10">
              <p>
                间隔比例
              </p>
              <div class=" f-space ml8 relative">
                <baseInputMore @handle v-model="layoutScaleText" />
                <dropDowncom class="absolute zindex99 w100 autoCount" @dropchange />
              </div>
            </div>
          </div>
        </div>
      </baseOpen>
    </div>
  </div>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 3 | `v-for` |
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
        staticClass: "w100"
      }, [n("div", {
        staticClass: "Hierarchy-open mt10"
      }, [t.set.ztShowCustom ? n("div", [n("div", {
        staticClass: "f-baseX app-padding"
      }, [n("div", {
        staticClass: "f-space HierarchySvgContext-drop-wrap"
      }, [n("baseDropdownMenu", {
        staticClass: "f-space",
        attrs: {
          text: t.HierarchySvgContext,
          title: "添加自定义层级预设"
        },
        on: {
          handle: function (e) {
            return t.dropOpen("HierarchySvgContextDropDown");
          }
        }
      }), n("hierarchyDropDown", {
        ref: "HierarchySvgContextDropDown",
        staticClass: "HierarchySvgContext-drop",
        attrs: {
          text: t.data.info.list
        },
        on: {
          change: t.changeHierarych,
          secondHandle: function (e) {
            return t.edie(e);
          },
          therrHandle: function (e) {
            return t.deleteIndex(e);
          }
        }
      })], 1), n("baseIcon", {
        staticClass: "ml12 oldguide-four-preset",
        attrs: {
          name: "#iconchangguicengjiyushe",
          select: t.HierarchySvgNavIstrue,
          title: "设置层级预设"
        },
        on: {
          handle: t.ctrlMysvg
        }
      })], 1), n("div", {
        staticClass: "app-padding mt10"
      }, [n("div", {
        staticClass: "f-alignNone"
      }, t._l(t.set.ztHierarych, function (e, a) {
        return n("button", {
          key: "zt-hierarych" + a,
          staticClass: "btn-small btn-small-6 mb0",
          class: [a == 5 ? "mr0" : ""],
          attrs: {
            title: t.setButtonTitle[a]
          },
          on: {
            click: function (n) {
              return t.setFontSize(e);
            },
            contextmenu: function (n) {
              return t.fpSetFontSize(e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0)]), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.HierarchySvgNavIstrue,
          expression: "HierarchySvgNavIstrue"
        }],
        staticClass: "Hierarchy-svg-context mt10"
      }, [n("div", {
        staticClass: "f-alignNone"
      }, t._l(t.hierarchyInput, function (e, a) {
        return n("input", {
          directives: [{
            name: "model",
            rawName: "v-model",
            value: t.set.ztHierarych[a],
            expression: "set.ztHierarych[i]"
          }],
          key: "zt-hierarych1" + a,
          staticClass: "hierarchy-layout-input",
          attrs: {
            title: t.setButtonTitle[a]
          },
          domProps: {
            value: t.set.ztHierarych[a]
          },
          on: {
            input: function (e) {
              if (!e.target.composing) {
                t.$set(t.set.ztHierarych, a, e.target.value);
              }
            }
          }
        });
      }), 0), n("div", {
        staticClass: "f-baseX mt10"
      }, [n("button", {
        staticClass: "btn-2 mb0 ",
        attrs: {
          title: "替换当前层级"
        },
        on: {
          click: function (e) {
            return t.updata();
          }
        }
      }, [t._v(" 保存到预设 ")]), n("button", {
        staticClass: "btn-2 mb0 mr0",
        attrs: {
          title: "保存到新预设"
        },
        on: {
          click: function (e) {
            return t.saveHierarych();
          }
        }
      }, [t._v(" 新建预设 ")])])]), n("hr", {
        staticClass: "line mt10"
      })]) : t._e(), t.set.ztShowSmartType ? n("div", [n("baseOpen", {
        staticClass: "mt6  ",
        attrs: {
          text: "智能排版",
          align: "rightCenter"
        },
        model: {
          value: t.layoutIstrue,
          callback: function (e) {
            t.layoutIstrue = e;
          },
          expression: "layoutIstrue"
        }
      }, [n("div", {
        staticClass: "smarttype-main app-padding mt6"
      }, [n("div", {}, [n("div", {
        staticClass: "f-baseX"
      }, [n("p", {
        attrs: {
          title: "用于决定排版的字号大小"
        }
      }, [t._v("场景")]), n("div", {
        staticClass: "f-space ml8 relative"
      }, [n("baseDropdownMenu", {
        attrs: {
          dark: true,
          padding: "6px",
          text: t.layoutSceneArr[t.layoutScene - 1],
          title: "排版场景"
        },
        on: {
          handle: function (e) {
            return t.dropOpen("layoutSceneArr");
          }
        }
      }), n("dropDowncom", {
        ref: "layoutSceneArr",
        staticClass: "absolute zindex99 w100",
        attrs: {
          text: t.layoutSceneArr
        },
        on: {
          dropchange: function (e) {
            return t.changeSence(e);
          }
        }
      })], 1), n("p", {
        staticClass: "ml17",
        attrs: {
          title: "排版对齐方式"
        }
      }, [t._v("对齐")]), n("div", {
        staticClass: "ml8 f-space relative"
      }, [n("baseDropdownMenu", {
        attrs: {
          dark: true,
          padding: "6px",
          text: t.layoutAlignmentArr[t.layoutAlignment]
        },
        on: {
          handle: function (e) {
            return t.dropOpen("layoutAlignmentArr");
          }
        }
      }), n("dropDowncom", {
        ref: "layoutAlignmentArr",
        staticClass: "absolute zindex99 w100",
        attrs: {
          text: t.layoutAlignmentArr
        },
        on: {
          dropchange: function (e) {
            return t.changeAlign(e);
          }
        }
      })], 1)]), n("div", {
        staticClass: "layout-button mt7"
      }, t._l(t.layoutButton, function (e, a) {
        return n("button", {
          key: "zt-hierarych2" + a,
          staticClass: "btn-small btn-small-4",
          class: a == 3 ? "mr0" : "",
          attrs: {
            title: e
          },
          on: {
            click: function (e) {
              return t.setType(a + 1);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0)]), n("div", {
        staticClass: " mt7"
      }, [n("div", {
        staticClass: "f-baseX"
      }, [n("p", {
        attrs: {
          title: "文案的间距"
        }
      }, [t._v("间隔基数")]), n("baseInput", {
        staticClass: "f-space ml8",
        class: t.autoCountInterval ? "input-auto-none" : "",
        attrs: {
          dark: true,
          size: "small",
          disabled: t.autoCountInterval,
          title: "回车应用调整"
        },
        nativeOn: {
          keyup: function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.setSpacing();
            }
          }
        },
        model: {
          value: t.layoutIntervalOne,
          callback: function (e) {
            t.layoutIntervalOne = e;
          },
          expression: "layoutIntervalOne"
        }
      }), n("baseCheck", {
        staticClass: "ml17",
        attrs: {
          title: "自动根据字体大小计算文案的间距"
        },
        model: {
          value: t.autoCountInterval,
          callback: function (e) {
            t.autoCountInterval = e;
          },
          expression: "autoCountInterval"
        }
      }, [t._v(" 自动计算间隔 ")])], 1), n("div", {
        staticClass: "f-baseX mt10"
      }, [n("p", {
        attrs: {
          title: "控制文案距离的比例"
        }
      }, [t._v("间隔比例")]), n("div", {
        staticClass: " f-space ml8 relative"
      }, [n("baseInputMore", {
        attrs: {
          dark: true,
          size: "small",
          title: "回车应用调整"
        },
        on: {
          handle: function (e) {
            return t.dropOpen("autoCount");
          }
        },
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.dropOpen("autoCount");
          },
          keyup: function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.setSpacing();
            }
          }
        },
        model: {
          value: t.layoutScaleText,
          callback: function (e) {
            t.layoutScaleText = e;
          },
          expression: "layoutScaleText"
        }
      }), n("dropDowncom", {
        ref: "autoCount",
        staticClass: "absolute zindex99 w100 autoCount",
        attrs: {
          text: t.layoutAlignScale
        },
        on: {
          dropchange: function (e) {
            return t.changeScale(e);
          }
        }
      })], 1)])])])])], 1) : t._e()])]);
    }
```