# 模板 · font-manage-list-font-weight

> 来源：`56d7.js` render 函数 `_x`（行 39567）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<pre class="font-manage__list-item__preview" :style="{ fontFamily: t.fontFamily } }" />
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("pre", {
    staticClass: "font-manage__list-item__preview",
    class: [t.classes],
    style: {
      fontFamily: t.fontFamily
    }
  }, [t._v(t._s(t.showText))]);
}
```