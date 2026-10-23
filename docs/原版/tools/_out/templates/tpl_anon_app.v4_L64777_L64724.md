# 模板 · anon_app.v4_L64777

> 来源：`app.v4.js` render 函数 `VI`（行 64724）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="topic-list-item" @click>
  <img class="topic-list-item__bg" :src="t.topic.background" />
  <div class="topic-list-item__default">
    <div class="topic-list-item__title" />
    <div class="topic-list-item__subtitle" />
  </div>
  <div class="topic-list-item__hover">
    <div class="topic-list-item__title topic-list-item__title__hover">
    </div>
    <div class="topic-list-item__subtitle topic-list-item__subtitle__hover">
    </div>
    <div class="topic-list-item__previews topic-list-item__previews__hover" />
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
        staticClass: "topic-list-item",
        on: {
          click: function (e) {
            return t.$emit("click", e);
          }
        }
      }, [n("img", {
        staticClass: "topic-list-item__bg",
        attrs: {
          src: t.topic.background
        }
      }), n("div", {
        staticClass: "topic-list-item__default"
      }, [n("div", {
        staticClass: "topic-list-item__title"
      }, [t._v(t._s(t.topic.title))]), n("div", {
        staticClass: "topic-list-item__subtitle"
      }, [t._v(t._s(t.topic.subtitle))])]), n("div", {
        staticClass: "topic-list-item__hover"
      }, [n("div", {
        staticClass: "topic-list-item__title topic-list-item__title__hover"
      }, [t._v(" " + t._s(t.topic.title) + " ")]), n("div", {
        staticClass: "topic-list-item__subtitle topic-list-item__subtitle__hover"
      }, [t._v(" " + t._s(t.topic.subtitle) + " ")]), n("div", {
        staticClass: "topic-list-item__previews topic-list-item__previews__hover"
      }, t._l(t.topic.previews, function (t) {
        return n("div", {
          staticClass: "topic-list-item__previews__img"
        }, [n("img", {
          attrs: {
            src: t
          }
        })]);
      }), 0)])]);
    }
```