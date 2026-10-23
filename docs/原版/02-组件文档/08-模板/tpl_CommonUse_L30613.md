# 模板 · CommonUse

> 来源：`56d7.js` render 函数 `dm`（行 30613）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<Myvuescroll class="dropDown-wrap" v-show="$store.state.showMenu == condition" :style="{ right: t.right ? 0 : "" }">
  <div class="context f-baseX" @mouseenter>
    <svg class="icon firstsvg" @click :style="{ visibility: t.firstSvgIstrue[a] ? "visible" : "hidden" }">
      <use @click />
    </svg>
    <p class="f-full f-size12 f-space" />
    <svg class="icon secondSvg mr8 cursor" @click v-show="mouseIndex == i">
      <use @click />
    </svg>
    <svg class="icon therrSvg mr8 cursor" @click v-show="mouseIndex == i">
      <use @click />
    </svg>
  </div>
  <div class="add-wrap f-baseX mt6 ml8" @click>
    <svg class="icon add" @click>
      <use @click />
    </svg>
    <p class="addtext" @click />
  </div>
</Myvuescroll>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 1 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("Myvuescroll", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.$store.state.showMenu == t.condition,
      expression: "$store.state.showMenu == condition"
    }],
    ref: "test",
    staticClass: "dropDown-wrap",
    style: {
      right: t.right ? 0 : ""
    },
    attrs: {
      scrollColor: "#CCCCCC"
    }
  }, [t._l(t.text, function (e, a) {
    return n("div", {
      key: "com-dropDown" + a,
      staticClass: "context f-baseX",
      on: {
        mouseenter: function (e) {
          t.mouseIndex = a;
        },
        mouseleave: function (e) {
          t.mouseIndex = -1;
        },
        click: function (e) {
          return t.select(a);
        }
      }
    }, [t.firstSvg ? n("svg", {
      staticClass: "icon firstsvg",
      style: {
        visibility: t.firstSvgIstrue[a] ? "visible" : "hidden"
      },
      attrs: {
        "aria-hidden": "true"
      },
      on: {
        click: function (e) {
          e.stopPropagation();
          return t.select(a);
        }
      }
    }, [n("use", {
      attrs: {
        "xlink:href": t.firstSvg
      },
      on: {
        click: function (e) {
          e.stopPropagation();
          return t.select(a);
        }
      }
    })]) : t._e(), t._t("default", function () {
      return [n("p", {
        staticClass: "f-full f-size12 f-space",
        class: t.textClass
      }, [t._v(t._s(e))])];
    }, {
      msg: e
    }), t.secondSvg ? n("svg", {
      directives: [{
        name: "show",
        rawName: "v-show",
        value: t.mouseIndex == a,
        expression: "mouseIndex == i"
      }],
      staticClass: "icon secondSvg mr8 cursor",
      attrs: {
        "aria-hidden": "true"
      },
      on: {
        click: function (e) {
          return t.secondHandle(a);
        }
      }
    }, [n("use", {
      attrs: {
        "xlink:href": t.secondSvg
      },
      on: {
        click: function (e) {
          e.stopPropagation();
          return t.secondHandle(a);
        }
      }
    })]) : t._e(), t.therrSvg ? n("svg", {
      directives: [{
        name: "show",
        rawName: "v-show",
        value: t.mouseIndex == a,
        expression: "mouseIndex == i"
      }],
      staticClass: "icon therrSvg mr8 cursor",
      attrs: {
        "aria-hidden": "true"
      },
      on: {
        click: function (e) {
          e.stopPropagation();
          return t.therrHandle(a);
        }
      }
    }, [n("use", {
      attrs: {
        "xlink:href": t.therrSvg
      },
      on: {
        click: function (e) {
          e.stopPropagation();
          return t.therrHandle(a);
        }
      }
    })]) : t._e()], 2);
  }), t._t("bottom", function () {
    return [t.bottom != null && t.bottom != "" ? n("div", {
      staticClass: "add-wrap f-baseX mt6 ml8",
      on: {
        click: function (e) {
          return t.clickBottom();
        }
      }
    }, [n("svg", {
      staticClass: "icon add",
      attrs: {
        "aria-hidden": "true"
      },
      on: {
        click: function (e) {
          e.stopPropagation();
          return t.clickBottom();
        }
      }
    }, [n("use", {
      attrs: {
        "xlink:href": "#iconchuangjian"
      },
      on: {
        click: function (e) {
          e.stopPropagation();
          return t.clickBottom();
        }
      }
    })]), n("p", {
      staticClass: "addtext",
      on: {
        click: function (e) {
          e.stopPropagation();
          return t.clickBottom();
        }
      }
    }, [t._v(t._s(t.bottom))])]) : t._e()];
  })], 2);
}
```