# 模板 · lib-top-nav

> 来源：`56d7.js` render 函数 `fc`（行 15796）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="preview">
  <div class="preview__safe-area" />
  <div class="preview__contain">
    <div class="preview__contain__long-img">
      <img @mousemove :src="t.previewImg.url" alt="" />
      <div class="preview__contain__long-img__progress">
        <div class="preview__contain__long-img__progress__body">
          <div class="preview__contain__long-img__progress__body__show" :style="{ width: t.progress } }" />
        </div>
      </div>
    </div>
    <div class="preview__contain__img">
      <img :src="t.previewImg.url" alt="" />
    </div>
    <div class="preview__material__title" />
    <div class="preview__material__picture-button" @click>
      <div class="preview__material__name" />
      <div class="preview__material__size" />
      <div class="preview__material__info" />
    </div>
    <div class="preview__material__button" @click>
      应用到当前设计稿
    </div>
    <div class="preview__contain__name" />
    <div class="preview__contain__size" />
    <div class="preview__contain__size" />
    <div class="preview__contain__button" @click>
      应用到当前设计稿
      <GIcon type="thin_up" />
    </div>
  </div>
  <div class="preview__safe-area" />
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 1 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    ref: "previewer",
    staticClass: "preview"
  }, [n("div", {
    staticClass: "preview__safe-area"
  }), n("div", {
    staticClass: "preview__contain"
  }, [t.isLong && !t.isPersonalTemplate ? n("div", {
    staticClass: "preview__contain__long-img"
  }, [n("img", {
    style: t.longImgStyle,
    attrs: {
      src: t.previewImg.url,
      alt: ""
    },
    on: {
      mousemove: t.mousemove,
      mouseenter: t.mouseenter,
      mouseleave: t.mouseleave
    }
  }), t.showProgress ? n("div", {
    staticClass: "preview__contain__long-img__progress"
  }, [n("div", {
    staticClass: "preview__contain__long-img__progress__body"
  }, [n("div", {
    staticClass: "preview__contain__long-img__progress__body__show",
    style: {
      width: t.progress
    }
  })])]) : t._e()]) : n("div", {
    staticClass: "preview__contain__img"
  }, [n("img", {
    style: t.normalImgStyle,
    attrs: {
      src: t.previewImg.url,
      alt: ""
    }
  })]), t.materialType === "material" ? [n("div", {
    staticClass: "preview__material__title"
  }, [t._v(t._s(t.previewInfo.title))]), t.previewInfo.pictureInfos ? t._l(t.previewInfo.pictureInfos, function (e) {
    return n("div", {
      key: e.key,
      staticClass: "preview__material__picture-button",
      on: {
        click: function (n) {
          n.stopPropagation();
          return t.usePsdFile(e.key);
        }
      }
    }, [n("div", {
      staticClass: "preview__material__name"
    }, [t._v(t._s(e.keyDesc))]), n("div", {
      staticClass: "preview__material__size"
    }, [t._v(t._s(e.width) + "x" + t._s(e.height))]), n("div", {
      staticClass: "preview__material__info"
    }, [t._v(t._s(e.sizeDesc) + " | " + t._s(e.typeDesc))])]);
  }) : n("div", {
    staticClass: "preview__material__button",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.usePsdFile();
      }
    }
  }, [t._v("应用到当前设计稿")])] : [n("div", {
    staticClass: "preview__contain__name"
  }, [t._v(t._s(t.previewInfo.title))]), t.isPersonalTemplate ? n("div", {
    staticClass: "preview__contain__size"
  }, [t._v(t._s(t.previewImg.width) + "x" + t._s(t.previewImg.height))]) : n("div", {
    staticClass: "preview__contain__size"
  }, [t._v(t._s(t.fileSizeString))]), n("div", {
    staticClass: "preview__contain__button",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.openOrUse.apply(null, arguments);
      }
    }
  }, [t.isPersonalTemplate ? [t._v("应用到当前设计稿")] : n("GIcon", {
    attrs: {
      type: "thin_up"
    }
  })], 2)]], 2), n("div", {
    staticClass: "preview__safe-area"
  })]);
}
```