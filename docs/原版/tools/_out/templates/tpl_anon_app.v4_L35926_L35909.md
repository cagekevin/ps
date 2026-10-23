# 模板 · anon_app.v4_L35926

> 来源：`app.v4.js` render 函数 `vp`（行 35909）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="import-wrap f-baseX app-padding">
  <baseCheck v-model="set.cyImportToLinkObject">
    转成链接智能对象
  </baseCheck>
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "import-wrap f-baseX app-padding"
      }, [n("baseCheck", {
        model: {
          value: t.set.cyImportToLinkObject,
          callback: function (e) {
            t.$set(t.set, "cyImportToLinkObject", e);
          },
          expression: "set.cyImportToLinkObject"
        }
      }, [t._v("转成链接智能对象")])], 1);
    }
```