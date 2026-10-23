# 模板 · Rename

> 来源：`app.v4.js` render 函数 `BS`（行 56474）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="Rename f-baseY">
  <div class="w100 f-space">
    <div class="top-switch f-baseX">
      <div class="switch-text f-center mr30 cursor" @click>
      </div>
      <div class="f-space" />
      <div>
        <baseSvg class="cursor contextHover" @handle />
        <dropDown class="filter" @dropchange />
      </div>
    </div>
    <div class="app-padding mt10">
      <baseInput class="inputcom-1" v-show="switchindex == 0" v-model="changeval">
        <baseIcon class="mr4 rename-svg" @handle />
      </baseInput>
      <div class="f-baseX f-alignNone" v-show="switchindex == 1">
        <baseInput class="f-space mr10" v-model="replace" />
        <baseInput class="f-space" v-model="newtext" />
      </div>
    </div>
    <div class="mt10 mb8" />
    <hr class="line theme-mb" />
    <div class="app-padding">
      <baseOpen class="theme-mt-row" v-model="showColorSign">
        <div class="w100 f-base mt6">
          <div class="colorButton" @click :style="{ backgroundColor: e }" />
          <div class="colorButton colorButton-lastOne f-center" @click>
            <baseSvg class="svg-9" @handle />
          </div>
        </div>
      </baseOpen>
    </div>
  </div>
  <div class="reanme-bottom app-padding f-baseX">
    <baseIcon class="mr10" @handle />
    <div class="verline mr10" />
    <baseIcon class="mr4" @handle />
    <baseIcon class="mr4" @handle />
  </div>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 4 | `v-for` |
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
        staticClass: "Rename f-baseY"
      }, [n("div", {
        staticClass: "w100 f-space"
      }, [n("div", {
        staticClass: "top-switch f-baseX"
      }, [t._l(t.switchdata, function (e, a) {
        return n("div", {
          key: "rename" + a,
          staticClass: "switch-text f-center mr30 cursor",
          class: t.switchindex == a ? "switch-context-boder" : "",
          attrs: {
            title: e
          },
          on: {
            click: function (e) {
              t.switchindex = a;
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), n("div", {
        staticClass: "f-space"
      }), n("div", {
        attrs: {
          title: "过滤子图层设置"
        }
      }, [n("baseSvg", {
        staticClass: "cursor contextHover",
        attrs: {
          name: "#iconguolv"
        },
        on: {
          handle: function (e) {
            return t.dropOpen("filter");
          }
        }
      }), n("dropDown", {
        ref: "filter",
        staticClass: "filter",
        attrs: {
          text: t.filterData,
          firstSvg: "#icongouxuan",
          ischeck: 2,
          selectIndex: t.isFilter ? 0 : 1
        },
        on: {
          dropchange: t.filterFun
        },
        nativeOn: {
          click: function (t) {
            t.stopPropagation();
          }
        }
      })], 1)], 2), n("div", {
        ref: "topInput",
        staticClass: "app-padding mt10"
      }, [n("baseInput", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.switchindex == 0,
          expression: "switchindex == 0"
        }],
        ref: "refInput",
        staticClass: "inputcom-1",
        attrs: {
          title: "重命名图层",
          secondSvgcssText: {
            color: "#515151"
          },
          tips: "回车确认修改"
        },
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.showTips(e);
          },
          keyup: function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.useRename.apply(null, arguments);
            }
          }
        },
        model: {
          value: t.changeval,
          callback: function (e) {
            t.changeval = e;
          },
          expression: "changeval"
        }
      }, [n("baseIcon", {
        staticClass: "mr4 rename-svg",
        attrs: {
          slot: "right",
          hover: "no",
          name: "#iconyingyong"
        },
        on: {
          handle: t.clickUseRename
        },
        slot: "right"
      })], 1), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.switchindex == 1,
          expression: "switchindex == 1"
        }],
        staticClass: "f-baseX f-alignNone"
      }, [n("baseInput", {
        staticClass: "f-space mr10",
        attrs: {
          tips: "替换文字"
        },
        nativeOn: {
          keyup: function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.useReplace.apply(null, arguments);
            }
          }
        },
        model: {
          value: t.replace,
          callback: function (e) {
            t.replace = e;
          },
          expression: "replace"
        }
      }), n("baseInput", {
        staticClass: "f-space",
        attrs: {
          tips: "新文字"
        },
        nativeOn: {
          keyup: function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.useReplace.apply(null, arguments);
            }
          }
        },
        model: {
          value: t.newtext,
          callback: function (e) {
            t.newtext = e;
          },
          expression: "newtext"
        }
      })], 1)], 1), t.data != null ? n("div", {
        staticClass: "mt10 mb8"
      }, t._l(t.data.info, function (e, a) {
        return n("div", {
          key: "rename1" + a,
          staticClass: "mb2",
          class: a != 0 ? "drag-rename-wrap" : "",
          on: {
            mousedown: function (e) {
              return t.dragColorWrap(a, ".drag-rename-wrap", ".Rename");
            },
            mousemove: function (e) {
              return t.dragColorWrapDrop(a);
            }
          }
        }, [n("baseGroup", {
          staticClass: "app-padding",
          attrs: {
            text: e.name,
            value: e.show
          },
          on: {
            menu: function (e) {
              return t.showGroupMenu(e, a);
            },
            change: function (e) {
              return t.latelyUsed(e, a);
            }
          }
        }, [n("div", {
          staticClass: "w100 mt6"
        }, [t._l(e.list, function (e, i) {
          return n("button", {
            key: "rename2" + i,
            staticClass: "btn-small drag-rename",
            attrs: {
              title: "按住Ctrl拖拽位置"
            },
            on: {
              click: function (n) {
                return t.useBatchRename(e);
              },
              contextmenu: function (e) {
                e.preventDefault();
                e.stopPropagation();
                return t.showMenu(e, a, i);
              },
              mousedown: function (e) {
                e.stopPropagation();
                return t.drag(a, i, ".drag-rename");
              },
              mousemove: function (e) {
                return t.drop(a, i);
              }
            }
          }, [t._v(" " + t._s(e) + " ")]);
        }), a > 0 ? n("button", {
          staticClass: "btn-small iconFun",
          on: {
            click: function (e) {
              return t.addToGroup(a);
            }
          }
        }, [n("baseSvg", {
          staticClass: "svg-14",
          attrs: {
            name: "#iconchuangjian"
          },
          on: {
            handle: function (e) {
              return t.addToGroup(a);
            }
          }
        })], 1) : t._e()], 2)])], 1);
      }), 0) : t._e(), n("hr", {
        staticClass: "line theme-mb"
      }), n("div", {
        staticClass: "app-padding"
      }, [n("baseOpen", {
        staticClass: "theme-mt-row",
        attrs: {
          text: "图层颜色标记",
          align: "left"
        },
        model: {
          value: t.showColorSign,
          callback: function (e) {
            t.showColorSign = e;
          },
          expression: "showColorSign"
        }
      }, [n("div", {
        staticClass: "w100 f-base mt6"
      }, [t._l(t.colorData, function (e, a) {
        return n("div", {
          key: "rename3" + a,
          staticClass: "colorButton",
          style: {
            backgroundColor: e
          },
          attrs: {
            title: "设置图层颜色"
          },
          on: {
            click: function (e) {
              return t.setLayerColor(a + 1);
            }
          }
        });
      }), n("div", {
        staticClass: "colorButton colorButton-lastOne f-center",
        attrs: {
          title: "清除图层颜色"
        },
        on: {
          click: function (e) {
            return t.setLayerColor(0);
          }
        }
      }, [n("baseSvg", {
        staticClass: "svg-9",
        attrs: {
          name: "#iconguanbi"
        },
        on: {
          handle: function (e) {
            return t.setLayerColor(0);
          }
        }
      })], 1)], 2)])], 1)]), n("div", {
        staticClass: "reanme-bottom app-padding f-baseX"
      }, [n("baseIcon", {
        staticClass: "mr10",
        attrs: {
          name: "#iconxinjiandongzuofenzu",
          title: "添加分组"
        },
        on: {
          handle: function (e) {
            return t.addGroup();
          }
        }
      }), n("div", {
        staticClass: "verline mr10"
      }), n("baseIcon", {
        staticClass: "mr4",
        attrs: {
          name: "#icondaoru",
          title: "导入预设"
        },
        on: {
          handle: function (e) {
            return t.importFile();
          }
        }
      }), n("baseIcon", {
        staticClass: "mr4",
        attrs: {
          name: "#icondaochu",
          title: "导出预设"
        },
        on: {
          handle: function (e) {
            return t.exportFile();
          }
        }
      })], 1)]);
    }
```