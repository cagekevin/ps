# 模板 · CommonUse

> 来源：`56d7.js` render 函数 `cm`（行 30297）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="FontSet">
  <Myvuescroll class="w100 h100">
    <fontSetQuick @changeFont />
    <hr class="line mt10 mb8" />
    <fontSetColor />
    <div class="app-padding">
      <div class="f-baseX f-alignNone mt10 mb10">
        <baseIcon @menu>
          <baseSvg class="svg-4 mt12" @menu />
        </baseIcon>
        <div class="verline" />
        <baseIcon @menu>
          <baseSvg class="svg-4 mt12" @menu />
        </baseIcon>
      </div>
    </div>
    <div class="setFont-hidden">
      <translateCom />
      <split />
      <btnCom />
      <pasteFont />
    </div>
    <hr class="line set-line mb10" />
    <div class="f-baseX f-alignNone app-padding">
      <baseIcon @handle />
      <div class="verline" />
      <baseIcon @handle />
    </div>
    <div class="f-baseX f-alignNone app-padding mt4">
      <baseIcon @handle />
      <div class="verline" />
      <baseIcon @handle />
    </div>
    <hr class="line mt10 mb8" />
    <fontSetHierarych />
    <distributed @close />
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
    staticClass: "FontSet"
  }, [n("Myvuescroll", {
    staticClass: "w100 h100"
  }, [n("fontSetQuick", {
    on: {
      changeFont: function (e) {
        return t.changeFont();
      }
    }
  }), n("hr", {
    staticClass: "line mt10 mb8"
  }), n("fontSetColor", {
    ref: "refFontSet"
  }), n("div", {
    staticClass: "app-padding"
  }, [n("div", {
    staticClass: "f-baseX f-alignNone mt10 mb10"
  }, [t._l(t.setFontSvgOne, function (e, a) {
    return n("baseIcon", {
      key: "fontSet" + a,
      class: [a == 0 ? "guide-four-translate" : ""],
      attrs: {
        svgWidth: "20px",
        width: "32px",
        height: "28px",
        select: t.setFontShow == "one" + a,
        title: t.btnTitleOne[a],
        name: e
      },
      on: {
        menu: function (e) {
          return t.ctrlMysvgOne(a);
        },
        handle: function (e) {
          return t.handle(a);
        }
      }
    }, [a == 0 || a == 2 ? n("baseSvg", {
      staticClass: "svg-4 mt12",
      attrs: {
        name: "#iconjiaobiao"
      },
      on: {
        menu: function (e) {
          return t.ctrlMysvgOne(a);
        },
        handle: function (e) {
          return t.handle(a);
        }
      }
    }) : t._e()], 1);
  }), n("div", {
    staticClass: "verline"
  }), t._l(t.setFontSvgTwo, function (e, a) {
    return n("baseIcon", {
      key: "fontSet1" + a,
      attrs: {
        svgWidth: "20px",
        width: "32px",
        height: "28px",
        title: t.btnTitleTwo[a],
        select: t.setFontShow == "two" + a,
        name: e
      },
      on: {
        menu: function (e) {
          return t.ctrlMysvgTwo(a);
        },
        handle: function (e) {
          return t.handle2(a);
        }
      }
    }, [a == 1 ? n("baseSvg", {
      staticClass: "svg-4 mt12",
      attrs: {
        name: "#iconjiaobiao"
      },
      on: {
        menu: function (e) {
          return t.ctrlMysvgOne(a);
        },
        handle: function (e) {
          return t.handle(a);
        }
      }
    }) : t._e()], 1);
  })], 2)]), n("div", {
    staticClass: "setFont-hidden"
  }, [n("translateCom", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.setFontShow == "one0",
      expression: "setFontShow == 'one0'"
    }]
  }), n("split", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.setFontShow == "one1",
      expression: "setFontShow == 'one1'"
    }]
  }), n("btnCom", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.setFontShow == "one2",
      expression: "setFontShow == 'one2'"
    }]
  }), n("pasteFont", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.setFontShow == "two1",
      expression: "setFontShow == 'two1'"
    }]
  })], 1), n("hr", {
    staticClass: "line set-line mb10"
  }), n("div", {
    staticClass: "f-baseX f-alignNone app-padding"
  }, [t._l(t.bottomSvgOne, function (e, a) {
    return n("baseIcon", {
      key: "fontSet3" + a,
      attrs: {
        svgWidth: "18px",
        width: "28px",
        height: "28px",
        title: t.bottomTitleOne[a],
        name: e
      },
      on: {
        handle: function (e) {
          return t.setLeftRightAlign(a);
        },
        menu: function (e) {
          return t.fpSetLeftRightAlign(a);
        }
      }
    });
  }), n("div", {
    staticClass: "verline"
  }), t._l(t.bottomSvgTwo, function (e, a) {
    return n("baseIcon", {
      key: "fontSet4" + a,
      attrs: {
        svgWidth: "18px",
        width: "28px",
        height: "28px",
        title: t.bottomTitleTwo[a],
        name: e
      },
      on: {
        handle: function (e) {
          return t.setAlignHandle(a);
        },
        menu: function (e) {
          return t.fpSetBackgroudAlign(a);
        }
      }
    });
  })], 2), n("div", {
    staticClass: "f-baseX f-alignNone app-padding mt4"
  }, [t._l(t.bottomSvgTherr, function (e, a) {
    return n("baseIcon", {
      key: "fontSet5" + a,
      attrs: {
        svgWidth: "18px",
        width: "28px",
        height: "28px",
        title: t.bottomTitleTherr[a],
        name: e
      },
      on: {
        handle: function (e) {
          return t.setUpDownAlign(a);
        },
        menu: function (e) {
          return t.fpSetUpDownAlign(a);
        }
      }
    });
  }), n("div", {
    staticClass: "verline"
  }), t._l(t.bottomSvgFour, function (e, a) {
    return n("baseIcon", {
      key: "fontSet6" + a,
      attrs: {
        svgWidth: "18px",
        width: "28px",
        height: "28px",
        title: t.bottomTitleFour[a],
        name: e
      },
      on: {
        handle: function (e) {
          return t.setAlignHandle(a + 2);
        },
        menu: function (e) {
          return t.fpSetBackgroudAlign(a + 2);
        }
      }
    });
  })], 2), n("hr", {
    staticClass: "line mt10 mb8"
  }), n("fontSetHierarych"), t.showDistribution > 0 ? n("distributed", {
    attrs: {
      title: t.distributedTitle
    },
    on: {
      close: function (e) {
        t.showDistribution = 0;
      },
      ok: t.distributedHangle
    }
  }) : t._e()], 1)], 1);
}
```