# 模板 · long-press

> 来源：`56d7.js` render 函数 `kh`（行 21436）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="add-template-icon">
  <Icon class="main" :type="t.type" />
</div>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    staticClass: "add-template-icon"
  }, [n("Icon", {
    staticClass: "main",
    attrs: {
      type: t.type
    }
  })], 1);
}
```