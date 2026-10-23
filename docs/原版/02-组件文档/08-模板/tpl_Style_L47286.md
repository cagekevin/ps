# 模板 · Style

> 来源：`56d7.js` render 函数 `lS`（行 47286）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="f-baseX opencom">
  <div class="open-wrap f-baseX" @click>
    <svg class="icon firstsvg cursor" :style="{ transform: "rotate(" + t.rota + "deg)" }">
      <use />
    </svg>
  </div>
  <p class="f-space f-size12 f-baseX cursor" @click />
  <div class="hover f-center cursor" @click>
    <svg class="icon secondSvg">
      <use />
    </svg>
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
    staticClass: "f-baseX opencom"
  }, [n("div", {
    staticClass: "open-wrap f-baseX",
    on: {
      click: t.firstFun
    }
  }, [t.firstSvg ? n("svg", {
    staticClass: "icon firstsvg cursor",
    style: {
      transform: "rotate(" + t.rota + "deg)"
    },
    attrs: {
      "aria-hidden": "true"
    }
  }, [n("use", {
    attrs: {
      "xlink:href": t.firstSvg
    }
  })]) : t._e()]), n("p", {
    staticClass: "f-space f-size12 f-baseX cursor",
    attrs: {
      title: t.title
    },
    on: {
      click: t.firstFun
    }
  }, [t._v(t._s(t.Tips))]), t.secondSvg ? n("div", {
    staticClass: "hover f-center cursor",
    attrs: {
      title: t.secondTitle
    },
    on: {
      click: t.secondFun
    }
  }, [n("svg", {
    staticClass: "icon secondSvg",
    attrs: {
      "aria-hidden": "true"
    }
  }, [n("use", {
    attrs: {
      "xlink:href": t.secondSvg
    }
  })])]) : t._e()]);
}
```