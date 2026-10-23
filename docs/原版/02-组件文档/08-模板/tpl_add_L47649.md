# 模板 · add

> 来源：`56d7.js` render 函数 `TS`（行 47649）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="mian">
  <div class="app-padding wrap-search f-baseX cursor" @click>
    <baseSvg class="svg-18 mr6" @handle />
    <p class="f-space cursor overflow-text" @click>
    </p>
    <baseSvg class="svg-10" @handle />
  </div>
  <div class="warehouse-down">
    <div class="warehouse-down-main" />
    <hr />
    <div class="warehouse-downItem f-baseX" @click>
      <baseSvg class="svg-14 mr6 col-black" @handle />
      <p @click>
        创建新分组
      </p>
    </div>
  </div>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 1 | `v-for` |
| `if` 条件分支 | 2 | `v-if` / `v-else` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    staticClass: "mian"
  }, [n("div", {
    staticClass: "app-padding wrap-search f-baseX cursor",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.f_showDown();
      }
    }
  }, [n("baseSvg", {
    staticClass: "svg-18 mr6",
    attrs: {
      name: "#icondongzuoku"
    },
    on: {
      handle: function (e) {
        return t.f_showDown();
      }
    }
  }), n("p", {
    staticClass: "f-space cursor overflow-text",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.f_showDown();
      }
    }
  }, [t._v(" " + t._s(t.showData.list[t.showData.index].name) + " ")]), n("baseSvg", {
    staticClass: "svg-10",
    attrs: {
      name: "#iconzhankaizhedie"
    },
    on: {
      handle: function (e) {
        return t.f_showDown();
      }
    }
  })], 1), t.showDown && t.$store.state.showMenu == 1 ? n("div", {
    staticClass: "warehouse-down"
  }, [n("div", {
    staticClass: "warehouse-down-main"
  }, t._l(t.showData.list, function (e, a) {
    return n("div", {
      key: "action-ware" + a,
      staticClass: "warehouse-downItem f-baseX",
      on: {
        mouseenter: function (e) {
          t.showMore = a;
        },
        mouseleave: function (e) {
          t.showMore = -1;
        },
        click: function (e) {
          return t.f_select(a);
        }
      }
    }, [n("baseSvg", {
      staticClass: "mr6 svg-14 col-black",
      attrs: {
        name: t.showData.index == a ? "#icongouxuan" : " "
      },
      on: {
        handle: function (e) {
          return t.f_select(a);
        }
      }
    }), a != t.showEdit ? n("p", {
      staticClass: "ff1 overflow-text",
      on: {
        click: function (e) {
          e.stopPropagation();
          return t.f_select(a);
        }
      }
    }, [t._v(" " + t._s(e.name) + " ")]) : n("input", {
      directives: [{
        name: "model",
        rawName: "v-model",
        value: t.editValue,
        expression: "editValue"
      }],
      staticClass: "ff1 f-size12",
      attrs: {
        size: "3",
        type: "text"
      },
      domProps: {
        value: t.editValue
      },
      on: {
        click: function (t) {
          t.stopPropagation();
        },
        keyup: function (e) {
          if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
            return null;
          } else {
            return t.f_editEnd();
          }
        },
        input: function (e) {
          if (!e.target.composing) {
            t.editValue = e.target.value;
          }
        }
      }
    }), t.isMore ? n("div", {
      directives: [{
        name: "show",
        rawName: "v-show",
        value: a == t.showMore,
        expression: "i == showMore"
      }],
      staticClass: "f-baseX f-full"
    }, [n("baseSvg", {
      staticClass: "mr8 svg-15 col-black cursor",
      attrs: {
        name: "#iconshuru",
        title: "重命名"
      },
      nativeOn: {
        click: function (e) {
          e.stopPropagation();
          return t.f_edit(a);
        }
      }
    }), n("baseSvg", {
      staticClass: "col-black svg-15 cursor",
      attrs: {
        name: "#iconshanchu",
        title: "删除"
      },
      nativeOn: {
        click: function (e) {
          e.stopPropagation();
          return t.f_delete(a);
        }
      }
    })], 1) : t._e()], 1);
  }), 0), t.isAdd ? n("hr") : t._e(), t.isAdd ? n("div", {
    staticClass: "warehouse-downItem f-baseX",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.f_add.apply(null, arguments);
      }
    }
  }, [n("baseSvg", {
    staticClass: "svg-14 mr6 col-black",
    attrs: {
      name: "#iconchuangjian"
    },
    on: {
      handle: t.f_add
    }
  }), n("p", {
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.f_add.apply(null, arguments);
      }
    }
  }, [t._v("创建新分组")])], 1) : t._e(), t._t("default")], 2) : t._e()]);
}
```