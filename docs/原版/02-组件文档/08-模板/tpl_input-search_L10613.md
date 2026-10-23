# 模板 · input-search

> 来源：`56d7.js` render 函数 `ri`（行 10613）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div>
  <Icon class="zoomout-btn" :class="{ disabled: t.disabled }" type="Smaller" />
  <span class="slider-wrapper">
    <GSlider class="slider" @change />
  </span>
  <Icon class="zoomin-btn" :class="{ disabled: t.disabled }" type="bigger" />
</div>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", [n("Icon", {
    staticClass: "zoomout-btn",
    class: {
      disabled: t.disabled
    },
    attrs: {
      type: "Smaller"
    },
    nativeOn: {
      click: function (e) {
        return t.zoomout.apply(null, arguments);
      }
    }
  }), n("span", {
    staticClass: "slider-wrapper"
  }, [n("GSlider", {
    staticClass: "slider",
    attrs: {
      value: t.sliderValue,
      disabled: t.disabled
    },
    on: {
      change: t.handleSliderChange
    }
  })], 1), n("Icon", {
    staticClass: "zoomin-btn",
    class: {
      disabled: t.disabled
    },
    attrs: {
      type: "bigger"
    },
    nativeOn: {
      click: function (e) {
        return t.zoomin.apply(null, arguments);
      }
    }
  })], 1);
}
```