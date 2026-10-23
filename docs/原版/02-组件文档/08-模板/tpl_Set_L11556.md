# 模板 · Set

> 来源：`56d7.js` render 函数 `rr`（行 11556）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="normal-preview">
  <LazyImage :src="t.previewUrl" :alt="t.template.title" />
</div>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    staticClass: "normal-preview"
  }, [n("LazyImage", {
    ref: "preview",
    attrs: {
      src: t.previewUrl,
      srcset: t.doublePreviewUrl,
      lazy: t.lazy,
      alt: t.template.title,
      ratio: 0,
      aspectRatio: t.imgAspectRatio,
      color: t.preview.hex || "#f0f3f4"
    }
  }), t._t("default")], 2);
}
```