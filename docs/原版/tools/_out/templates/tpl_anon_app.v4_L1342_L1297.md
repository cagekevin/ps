# 模板 · anon_app.v4_L1342

> 来源：`app.v4.js` render 函数 `st`（行 1297）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="sync-mian">
  <div class=" f-baseX">
    <span class="ml10" />
    <div class="f-space" />
    <baseSvg @handle />
  </div>
  <div class="f-baseX success ">
    <baseSvg />
    <span class="ml10 " />
  </div>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `if` 条件分支 | 1 | `v-if` / `v-else` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      if (t.isShow) {
        return n("div", {
          staticClass: "sync-mian"
        }, [t.progressNum != 100 ? n("div", {
          staticClass: " f-baseX"
        }, [t._m(0), n("span", {
          staticClass: "ml10"
        }, [t._v(t._s(t.text))]), n("div", {
          staticClass: "f-space"
        }), n("baseSvg", {
          attrs: {
            name: "#iconguanbi"
          },
          on: {
            handle: function (e) {
              return t.hide();
            }
          }
        })], 1) : n("div", {
          staticClass: "f-baseX success "
        }, [n("baseSvg", {
          attrs: {
            name: "#iconwancheng1"
          }
        }), n("span", {
          staticClass: "ml10 "
        }, [t._v(t._s(t.successText))])], 1)]);
      } else {
        return t._e();
      }
    }
```