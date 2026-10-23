# 模板 · font-manage-user-tag-overlay

> 来源：`app.v4.js` render 函数 `Fb`（行 44546）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__user-tag-overlay">
  <div @click>
    删除
  </div>
  <div @click>
    重命名
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
        staticClass: "font-manage__user-tag-overlay"
      }, [n("div", {
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.remove.apply(null, arguments);
          }
        }
      }, [t._v("删除")]), n("div", {
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.rename.apply(null, arguments);
          }
        }
      }, [t._v("重命名")])]);
    }
```