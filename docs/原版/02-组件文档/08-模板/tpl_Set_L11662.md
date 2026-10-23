# 模板 · Set

> 来源：`56d7.js` render 函数 `fr`（行 11662）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="long-preview">
  <LazyImage :src="t.url" :alt="t.template.title" />
  <transition>
    <img class="long-preview__img" @load v-show="hover && previewLoad" :src="t.previewUrl" />
  </transition>
  <div class="long-preview__mask" @mousemove>
    <div class="long-preview__progress">
      <div />
    </div>
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
    staticClass: "long-preview"
  }, [n("LazyImage", {
    ref: "preview",
    attrs: {
      src: t.url,
      srcset: t.doubleUrl,
      lazy: t.lazy,
      alt: t.template.title,
      ratio: 0,
      aspectRatio: t.imgAspectRatio,
      color: t.preview.hex || "#f0f3f4"
    }
  }), n("transition", {
    attrs: {
      name: "long-preview__img"
    }
  }, [t.previewUrl && t.doublePreviewUrl ? n("img", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.hover && t.previewLoad,
      expression: "hover && previewLoad"
    }],
    staticClass: "long-preview__img",
    style: t.style,
    attrs: {
      src: t.previewUrl,
      srcset: t.doublePreviewUrl
    },
    on: {
      load: function (e) {
        t.previewLoad = true;
      }
    }
  }) : t._e()]), t._t("default"), n("div", {
    staticClass: "long-preview__mask",
    on: {
      mousemove: t.mousemove,
      mouseenter: t.mouseenter,
      mouseleave: t.mouseleave
    }
  }, [t.hover && t.previewLoad ? n("div", {
    staticClass: "long-preview__progress"
  }, [n("div", {
    style: t.progressStyle
  })]) : t._e()])], 2);
}
```