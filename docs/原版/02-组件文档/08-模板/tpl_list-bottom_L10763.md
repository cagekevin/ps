# 模板 · list-bottom

> 来源：`56d7.js` render 函数 `yi`（行 10763）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="category-filter">
  <div class="category-bar">
    <div class="category-title">
      分类
    </div>
    <div class="category-more" @click :class="{ disabled: t.disabled }">
      <IconFont class="icon-more" :class="{ close: t.moreShow }" type="open" />
    </div>
  </div>
  <div class="category-list-wrapper">
    <div class="category-list" />
  </div>
</div>
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
  return n("div", {
    staticClass: "category-filter"
  }, [n("div", {
    staticClass: "category-bar"
  }, [n("div", {
    staticClass: "category-title"
  }, [t._v("分类")]), t.moreTipShow ? n("div", {
    staticClass: "category-more",
    class: {
      disabled: t.disabled
    },
    on: {
      click: function (e) {
        return t.toggleMore();
      }
    }
  }, [t._v(" " + t._s(t.moreShow ? "收起" : "更多") + " "), n("IconFont", {
    staticClass: "icon-more",
    class: {
      close: t.moreShow
    },
    attrs: {
      type: "open"
    }
  })], 1) : t._e()]), n("div", {
    staticClass: "category-list-wrapper"
  }, [n("div", {
    staticClass: "category-list"
  }, t._l(t.categoryOptionsForShow, function (e) {
    return n("dd", {
      key: e.id,
      staticClass: "button-item-wrapper"
    }, [n("SelectButton", {
      staticClass: "button-item",
      class: {
        disabled: t.disabled
      },
      attrs: {
        selected: t.filter_id === e.fe_id_path
      },
      nativeOn: {
        click: function (n) {
          return t.filter({
            filter_id: e.fe_id_path,
            name: e.name
          });
        }
      }
    }, [t._v(" " + t._s(e.name) + " ")])], 1);
  }), 0)])]);
}
```