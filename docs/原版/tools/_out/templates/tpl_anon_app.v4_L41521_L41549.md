# 模板 · anon_app.v4_L41521

> 来源：`app.v4.js` render 函数 `_v`（行 41549）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="f-baseX" v-show="total != 0">
  <div class="cursor mr5" @click>
    <svg class="icon cursor">
      <use />
    </svg>
  </div>
  <li class="cursor" @click>
    1
  </li>
  <div class="cursor mr5" @click>
    ......
  </div>
  <li class="cursor ml5 mr5" @click>
  </li>
  <div class="cursor ml5" @click>
    ......
  </div>
  <li class="cursor" @click>
  </li>
  <div class="cursor ml5" @click>
    <svg class="icon cursor">
      <use />
    </svg>
  </div>
  <div />
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
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.total != 0,
          expression: "total != 0"
        }],
        staticClass: "f-baseX"
      }, [n("div", {
        staticClass: "cursor mr5",
        on: {
          click: t.prev
        }
      }, [n("svg", {
        staticClass: "icon cursor",
        attrs: {
          "aria-hidden": "true"
        }
      }, [n("use", {
        attrs: {
          "xlink:href": "#iconzuo"
        }
      })])]), t.arr[0] != 1 ? n("li", {
        staticClass: "cursor",
        on: {
          click: function (e) {
            return t.curr(null, 1);
          }
        }
      }, [t._v("1")]) : t._e(), t.arr[0] != 1 ? n("div", {
        staticClass: "cursor mr5",
        on: {
          click: function (e) {
            return t.curr(null, t.cen - 7);
          }
        }
      }, [t._v("......")]) : t._e(), t._l(t.arr, function (e, a) {
        return n("li", {
          key: "com-paging" + a,
          staticClass: "cursor ml5 mr5",
          class: t.arr[a] == t.cen ? "ligh" : "",
          on: {
            click: function (e) {
              return t.curr(a);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), t.arr[t.arr.length - 1] != t.dataval ? n("div", {
        staticClass: "cursor ml5",
        on: {
          click: function (e) {
            return t.curr(null, t.cen + 7);
          }
        }
      }, [t._v(" ...... ")]) : t._e(), t.arr[t.arr.length - 1] != t.dataval ? n("li", {
        staticClass: "cursor",
        on: {
          click: function (e) {
            return t.curr(null, t.dataval);
          }
        }
      }, [t._v(" " + t._s(t.dataval) + " ")]) : t._e(), n("div", {
        staticClass: "cursor ml5",
        on: {
          click: t.next
        }
      }, [n("svg", {
        staticClass: "icon cursor",
        attrs: {
          "aria-hidden": "true"
        }
      }, [n("use", {
        attrs: {
          "xlink:href": "#iconyou"
        }
      })])]), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: false,
          expression: "false"
        }]
      }, [t._v(t._s(t.cenChange))])], 2);
    }
```