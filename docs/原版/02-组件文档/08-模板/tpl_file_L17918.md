# 模板 · file

> 来源：`56d7.js` render 函数 `el`（行 17918）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="empty">
  <div class="empty-content" />
</div>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    staticClass: "empty"
  }, [n("div", {
    staticClass: "empty-content"
  }, [t._t("default")], 2)]);
}
```