# 模板 · anon_app.v4_L63251

> 来源：`app.v4.js` render 函数 `WT`（行 63128）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="devices-list">
  <div class="device">
    <svg class="point">
      <circle />
    </svg>
    <Input class="device__name" @change />
    <div class="device__desc">
      最近登录：
    </div>
    <div class="device__remove-btn device__remove-btn-position" @click>
      移除
    </div>
  </div>
  <div class="device empty">
    <svg class="point">
      <circle />
    </svg>
    <div class="device__name">
      未绑定设备
    </div>
    <div class="device__desc">
      暂无
    </div>
  </div>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 2 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "devices-list"
      }, [t._l(t.devices, function (e, a) {
        return n("div", {
          key: a,
          staticClass: "device"
        }, [n("svg", {
          staticClass: "point",
          attrs: {
            width: "6",
            height: "6",
            viewBox: "0 0 6 6",
            fill: e.current ? "#3565FF" : "#6E6E6E",
            xmlns: "http://www.w3.org/2000/svg"
          }
        }, [n("circle", {
          attrs: {
            cx: "3",
            cy: "3",
            r: "3"
          }
        })]), n("Input", {
          staticClass: "device__name",
          attrs: {
            value: e.name,
            suffixText: e.current ? "(当前)" : ""
          },
          on: {
            change: function (n) {
              return t.renameDevice(n, e, a);
            }
          }
        }), n("div", {
          staticClass: "device__desc"
        }, [t._v("最近登录：" + t._s(t.timeToDate(e.lastLoginTime)))]), n("div", {
          staticClass: "device__remove-btn device__remove-btn-position",
          on: {
            click: function (n) {
              return t.removeDevice(e, a);
            }
          }
        }, [t._v(" 移除 ")])], 1);
      }), t._l(t.emptyDevices, function (e, a) {
        return n("div", {
          key: "empty" + a,
          staticClass: "device empty"
        }, [n("svg", {
          staticClass: "point",
          attrs: {
            width: "6",
            height: "6",
            viewBox: "0 0 6 6",
            fill: "#6E6E6E",
            xmlns: "http://www.w3.org/2000/svg"
          }
        }, [n("circle", {
          attrs: {
            cx: "3",
            cy: "3",
            r: "3"
          }
        })]), n("div", {
          staticClass: "device__name"
        }, [t._v("未绑定设备")]), n("div", {
          staticClass: "device__desc"
        }, [t._v("暂无")])]);
      })], 2);
    }
```