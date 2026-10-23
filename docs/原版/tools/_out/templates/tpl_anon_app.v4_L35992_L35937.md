# 模板 · anon_app.v4_L35992

> 来源：`app.v4.js` render 函数 `kp`（行 35937）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="optimization-wrap f-baseX" @mousedown>
  <div class="app-padding w100">
    <baseCheck class="theme-mb" v-model="set.cyOptimizeAll">
      优化所有智能对象图层
    </baseCheck>
    <baseCheck class="theme-mb" v-model="set.cyOptimizeDeleteAllEmpty">
      删除所有空图层
    </baseCheck>
    <baseCheck v-model="set.cyOptimizeDeleteAllHide">
      删除所有隐藏图层
    </baseCheck>
    <button class="btn-1 mt10" @click>
      批量优化文档
    </button>
  </div>
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "optimization-wrap f-baseX",
        on: {
          mousedown: function (t) {
            t.stopPropagation();
          }
        }
      }, [n("div", {
        staticClass: "app-padding w100"
      }, [n("baseCheck", {
        staticClass: "theme-mb",
        model: {
          value: t.set.cyOptimizeAll,
          callback: function (e) {
            t.$set(t.set, "cyOptimizeAll", e);
          },
          expression: "set.cyOptimizeAll"
        }
      }, [t._v("优化所有智能对象图层")]), n("baseCheck", {
        staticClass: "theme-mb",
        model: {
          value: t.set.cyOptimizeDeleteAllEmpty,
          callback: function (e) {
            t.$set(t.set, "cyOptimizeDeleteAllEmpty", e);
          },
          expression: "set.cyOptimizeDeleteAllEmpty"
        }
      }, [t._v(" 删除所有空图层 ")]), n("baseCheck", {
        model: {
          value: t.set.cyOptimizeDeleteAllHide,
          callback: function (e) {
            t.$set(t.set, "cyOptimizeDeleteAllHide", e);
          },
          expression: "set.cyOptimizeDeleteAllHide"
        }
      }, [t._v("删除所有隐藏图层")]), n("button", {
        staticClass: "btn-1 mt10",
        attrs: {
          title: "批量优化文档"
        },
        on: {
          click: function (e) {
            return t.batch();
          },
          contextmenu: function (e) {
            return t.fpBatch();
          }
        }
      }, [t._v(" 批量优化文档 ")])], 1)]);
    }
```