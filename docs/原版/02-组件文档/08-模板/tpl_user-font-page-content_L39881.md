# 模板 · user-font-page-content

> 来源：`56d7.js` render 函数 `Ux`（行 39881）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__footer">
  <PreviewText />
  <PreviewSetting />
</div>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    staticClass: "font-manage__footer"
  }, [t.show ? n("PreviewText", {
    ref: "preview-text",
    attrs: {
      "default-text": t.previewText
    },
    on: {
      "use-text": t.useText,
      "set-preview-text": t.setPreviewText
    }
  }) : t._e(), n("PreviewSetting", {
    attrs: {
      "preview-mode": t.previewMode
    },
    on: {
      "set-preview-mode": t.setPreviewMode,
      "toggle-preview-text-panel": t.togglePreviewTextPanel
    }
  })], 1);
}
```