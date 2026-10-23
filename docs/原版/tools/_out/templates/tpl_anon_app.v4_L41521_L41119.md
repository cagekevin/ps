# 模板 · anon_app.v4_L41521

> 来源：`app.v4.js` render 函数 `vv`（行 41119）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="square-wrap" @click v-show="$store.state.showMenu == condition">
  <div class="app-padding w100 relative">
    <div class="relative w100 mt10">
      <div class="f-baseX">
        <div class="cursor dropbutton f-center mr6" @click>
          <p class="cursor">
            全部
          </p>
        </div>
        <div class="cursor dropbutton f-center mr6" @click>
          <p class="cursor">
            最近
          </p>
        </div>
        <div class="f-center dropbutton" @click>
          <p class="cursor mr7 " />
          <baseSvg class="svg-more" @handle />
        </div>
      </div>
      <div class="absolute w100  zindex99" v-show="button1">
        <div class="lately w100">
          <Myvuescroll class="context-wrap">
            <div class="f-arrayX context w100">
              <p class="key" />
              <div class="f-baseX f-br f-space w100" />
            </div>
            <div class="f-arrayX context w100 mt6">
              <p class="key">
                标签
              </p>
              <div class="f-baseX f-br f-space w100" />
            </div>
          </Myvuescroll>
        </div>
      </div>
      <div class="f-baseX mt10">
        <div class="relative">
          <baseDropdownMenu class="selectInput" @handle />
          <dropDowncom class="w100 button2 zindex99" @dropchange v-show="button2" />
        </div>
        <div class="f-space" />
        <score @select />
      </div>
    </div>
  </div>
  <div class="w100">
    <Myvuescroll class="w100 f-space square-list mt10 square-svuescroll">
      <div />
      <div />
      <div class="f-baseY matching-wrap f-space w100 ">
        <baseSvg class="matching" />
        <p>
          没有找到匹配的字体
        </p>
      </div>
    </Myvuescroll>
    <div class="paging-wrap w100 f-center">
      <paging class="mt10 mb10 paging" v-model="pageIndex" />
    </div>
  </div>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 7 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.$store.state.showMenu == t.condition,
          expression: "$store.state.showMenu == condition"
        }],
        staticClass: "square-wrap",
        on: {
          click: function (e) {
            e.stopPropagation();
            t.button1 = false;
            t.button2 = false;
          }
        }
      }, [n("div", {
        staticClass: "app-padding w100 relative"
      }, [n("div", {
        staticClass: "relative w100 mt10"
      }, [n("div", {
        staticClass: "f-baseX"
      }, [n("div", {
        staticClass: "cursor dropbutton f-center mr6",
        class: t.lighindex == 0 ? "lighbule" : "",
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.showAll();
          }
        }
      }, [n("p", {
        staticClass: "cursor"
      }, [t._v("全部")])]), n("div", {
        staticClass: "cursor dropbutton f-center mr6",
        class: t.lighindex == 1 ? "lighbule" : "",
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.showHistory();
          }
        }
      }, [n("p", {
        staticClass: "cursor"
      }, [t._v("最近")])]), n("div", {
        staticClass: "f-center dropbutton",
        class: [t.button1 ? "clickDropbutton" : "", t.lighindex == 2 ? "lighbule" : ""],
        attrs: {
          title: t.fontNav
        },
        on: {
          click: function (e) {
            e.stopPropagation();
            t.button1 = !t.button1;
            t.button2 = false;
            t.lighindex = 2;
          }
        }
      }, [n("p", {
        staticClass: "cursor mr7 "
      }, [t._v(t._s(t.fontNav))]), n("baseSvg", {
        staticClass: "svg-more",
        attrs: {
          name: "#iconxiala"
        },
        on: {
          handle: function (e) {
            t.button1 = !t.button1;
            t.button2 = false;
            t.lighindex = 2;
          }
        }
      })], 1)]), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.button1,
          expression: "button1"
        }],
        staticClass: "absolute w100  zindex99"
      }, [n("div", {
        staticClass: "lately w100"
      }, [n("Myvuescroll", {
        staticClass: "context-wrap"
      }, [t._l(t.lately, function (e, a) {
        return n("div", {
          key: "zt-square" + a,
          staticClass: "f-arrayX context w100"
        }, [n("p", {
          staticClass: "key"
        }, [t._v(t._s(a))]), n("div", {
          staticClass: "f-baseX f-br f-space w100"
        }, t._l(e, function (e, i) {
          return n("p", {
            key: "zt-square1" + i,
            staticClass: "val",
            on: {
              click: function (n) {
                return t.chineBtnHandle(a, i, e);
              }
            }
          }, [t._v(" " + t._s(e) + " ")]);
        }), 0)]);
      }), n("div", {
        staticClass: "f-arrayX context w100 mt6"
      }, [n("p", {
        staticClass: "key"
      }, [t._v("标签")]), n("div", {
        staticClass: "f-baseX f-br f-space w100"
      }, t._l(t.font.tags, function (e, a) {
        return n("p", {
          key: "zt-square2" + a,
          staticClass: "val",
          on: {
            click: function (n) {
              return t.tagsBtnHandle(a, e.text);
            }
          }
        }, [t._v(" " + t._s(e.text) + " ")]);
      }), 0)])], 2)], 1)]), n("div", {
        staticClass: "f-baseX mt10"
      }, [n("div", {
        staticClass: "relative"
      }, [n("baseDropdownMenu", {
        staticClass: "selectInput",
        attrs: {
          whiteTheme: true,
          text: t.previewNav
        },
        on: {
          handle: function (e) {
            t.button2 = !t.button2;
            t.button1 = false;
          }
        }
      }), n("dropDowncom", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.button2,
          expression: "button2"
        }],
        staticClass: "w100 button2 zindex99",
        attrs: {
          text: t.previewdata
        },
        on: {
          dropchange: t.dropchange
        }
      })], 1), n("div", {
        staticClass: "f-space"
      }), n("score", {
        attrs: {
          select: t.font.findStar
        },
        on: {
          select: t.changeScore
        }
      })], 1)])]), n("div", {
        staticClass: "w100"
      }, [n("Myvuescroll", {
        staticClass: "w100 f-space square-list mt10 square-svuescroll",
        attrs: {
          scrollColor: "#CCCCCC"
        }
      }, [t.set.ztPreview != 0 ? n("div", t._l(t.renderFontList, function (e, a) {
        return n("div", {
          key: "zt-square3" + a,
          staticClass: "list-everyOne f-full w100",
          on: {
            click: function (n) {
              return t.clickFont(e, a);
            }
          }
        }, [n("div", {
          staticClass: "back",
          class: t.font.singleIndex == a ? "back-select" : "",
          on: {
            mouseleave: function (e) {
              t.fontFamily = -1;
            }
          }
        }, [n("div", {
          staticClass: "f-baseX font-family-wrap"
        }, [n("div", {
          staticClass: "f-space f-baseX"
        }, [n("pre", {
          staticClass: "font-family mr5",
          class: [t.ctrlArr.includes(a) ? "theme-act-col2" : "", t.fontFamily == a ? "fontFamilyHover" : ""],
          on: {
            click: function (n) {
              n.stopPropagation();
              return t.clickFont(e, a);
            }
          }
        }, [t._v(t._s(e.name))]), e.mz.length != 1 ? n("div", {
          staticClass: "font-btn cursor",
          on: {
            click: function (e) {
              e.stopPropagation();
              return t.showFontWeight(a);
            }
          }
        }, [t._v(" " + t._s(e.mz.length) + " ")]) : t._e()]), n("score", {
          staticClass: "f-full",
          attrs: {
            select: e.star
          },
          on: {
            select: function (e) {
              return t.listChangescore(e, a);
            }
          }
        })], 1), n("p", {
          staticClass: "back-context",
          class: [t.ctrlArr.includes(a) ? "theme-act-col2" : ""],
          style: {
            fontFamily: t.fontStyleList[a],
            fontSize: t.set.ztPreview + "px"
          },
          on: {
            click: function (n) {
              n.stopPropagation();
              return t.clickFont(e, a);
            }
          }
        }, [t._v(" " + t._s(t.psStatus.layer.name) + " ")])]), a == t.showWeightIndex ? n("div", {
          staticClass: "list-hidden mb4 "
        }, t._l(e.zz, function (e, i) {
          return n("div", {
            key: "zt-square4" + i,
            staticClass: "app-padding f-baseX list-hidden-everyone",
            on: {
              click: function (e) {
                e.stopPropagation();
                return t.clickFontWeight(a, i);
              }
            }
          }, [n("baseSvg", {
            staticClass: "select ml14",
            attrs: {
              name: t.hiddenIndex == "str" + a + i ? "#icongouxuan" : ""
            },
            on: {
              handle: function (e) {
                return t.clickFontWeight(a, i);
              }
            }
          }), n("p", {
            staticClass: "ml7",
            on: {
              click: function (e) {
                e.stopPropagation();
                return t.clickFontWeight(a, i);
              }
            }
          }, [t._v(" " + t._s(e) + " ")])], 1);
        }), 0) : t._e()]);
      }), 0) : n("div", t._l(t.renderFontList, function (e, a) {
        return n("div", {
          key: "zt-square5" + a,
          staticClass: "list-everyOne f-full w100",
          on: {
            click: function (n) {
              return t.clickFont(e, a);
            }
          }
        }, [n("div", {
          staticClass: "back",
          class: t.font.singleIndex == a ? "back-select" : "",
          on: {
            mouseenter: function (e) {
              t.fontFamily = a;
            },
            mouseleave: function (e) {
              t.fontFamily = -1;
            }
          }
        }, [n("div", {
          staticClass: "f-baseX font-family-wrap"
        }, [n("div", {
          staticClass: "f-space f-baseX"
        }, [n("pre", {
          staticClass: "font-family font-family-14 mr5",
          class: [t.ctrlArr.includes(a) ? "theme-act-col2" : "", t.fontFamily == a ? "fontFamilyHover" : "", "back-context"],
          style: {
            fontFamily: e.name
          }
        }, [t._v(t._s(e.name))]), e.mz.length != 1 ? n("div", {
          staticClass: "font-btn cursor",
          on: {
            click: function (e) {
              e.stopPropagation();
              return t.showFontWeight(a);
            }
          }
        }, [t._v(" " + t._s(e.mz.length) + " ")]) : t._e()]), n("score", {
          staticClass: "f-full",
          attrs: {
            select: e.star
          },
          on: {
            select: function (e) {
              return t.listChangescore(e, a);
            }
          }
        })], 1)]), a == t.showWeightIndex ? n("div", {
          staticClass: "list-hidden mb4 "
        }, t._l(e.zz, function (e, i) {
          return n("div", {
            key: "zt-square6" + i,
            staticClass: "app-padding f-baseX list-hidden-everyone",
            on: {
              click: function (e) {
                e.stopPropagation();
                return t.clickFontWeight(a, i);
              }
            }
          }, [n("baseSvg", {
            staticClass: "select ml14",
            attrs: {
              name: t.hiddenIndex == "str" + a + i ? "#icongouxuan" : ""
            },
            on: {
              handle: function (e) {
                return t.clickFontWeight(a, i);
              }
            }
          }), n("p", {
            staticClass: "ml7",
            on: {
              click: function (e) {
                e.stopPropagation();
                return t.clickFontWeight(a, i);
              }
            }
          }, [t._v(" " + t._s(e) + " ")])], 1);
        }), 0) : t._e()]);
      }), 0), t.font.showList.length == 0 ? n("div", {
        staticClass: "f-baseY matching-wrap f-space w100 "
      }, [n("baseSvg", {
        staticClass: "matching",
        attrs: {
          name: "#iconmeiyoupipeidao"
        }
      }), n("p", [t._v("没有找到匹配的字体")])], 1) : t._e()]), t.font.showList.length > t.pageMax ? n("div", {
        staticClass: "paging-wrap w100 f-center"
      }, [n("paging", {
        staticClass: "mt10 mb10 paging",
        attrs: {
          total: t.font.showList.length,
          pageSize: t.pageMax
        },
        model: {
          value: t.pageIndex,
          callback: function (e) {
            t.pageIndex = e;
          },
          expression: "pageIndex"
        }
      })], 1) : t._e()], 1)]);
    }
```