# 模板 · anon_app.v4_L38709

> 来源：`app.v4.js` render 函数 `um`（行 38454）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="translate-wrap">
  <div class="f-baseX f-alignNone">
    <div class="star ff1">
      <button class="f-center w100" @click>
        <baseSvg class="mysvg" @handle />
      </button>
      <dropDown class="star-dropDown zindex99" @dropchange />
    </div>
    <baseIcon class="ml10 mr10 contextHover cursor" @handle />
    <div class="end ff1">
      <button class="f-center w100" @click>
        <baseSvg class="mysvg" @handle />
      </button>
      <dropDown class="end-dropDown zindex99" @dropchange />
    </div>
  </div>
  <baseCheck class="mt15" v-model="set.ztTranslate.delete">
    替换原图层
  </baseCheck>
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "translate-wrap"
      }, [n("div", {
        staticClass: "f-baseX f-alignNone"
      }, [n("div", {
        staticClass: "star ff1"
      }, [n("button", {
        staticClass: "f-center w100",
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.dropOpen("starIstrue");
          }
        }
      }, [t._v(" " + t._s(t.starval) + " "), n("baseSvg", {
        staticClass: "mysvg",
        attrs: {
          name: "#iconxiala"
        },
        on: {
          handle: function (e) {
            return t.dropOpen("starIstrue");
          }
        }
      })], 1), n("dropDown", {
        ref: "starIstrue",
        staticClass: "star-dropDown zindex99",
        attrs: {
          ischeck: "1",
          text: t.starDropDown,
          textClass: "mr8 f-center"
        },
        on: {
          dropchange: t.starFun
        }
      })], 1), n("baseIcon", {
        staticClass: "ml10 mr10 contextHover cursor",
        attrs: {
          name: "#iconzhuanhuan",
          title: "切换翻译语言"
        },
        on: {
          handle: t.switchFun
        }
      }), n("div", {
        staticClass: "end ff1"
      }, [n("button", {
        staticClass: "f-center w100",
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.dropOpen("endIstrue");
          }
        }
      }, [t._v(" " + t._s(t.endval) + " "), n("baseSvg", {
        staticClass: "mysvg",
        attrs: {
          name: "#iconxiala"
        },
        on: {
          handle: function (e) {
            return t.dropOpen("endIstrue");
          }
        }
      })], 1), n("dropDown", {
        ref: "endIstrue",
        staticClass: "end-dropDown zindex99",
        attrs: {
          ischeck: "1",
          text: t.endDraopDown,
          textClass: "mr8 f-center"
        },
        on: {
          dropchange: t.endFun
        }
      })], 1)], 1), n("baseCheck", {
        staticClass: "mt15",
        attrs: {
          title: "翻译结果替换原文本"
        },
        model: {
          value: t.set.ztTranslate.delete,
          callback: function (e) {
            t.$set(t.set.ztTranslate, "delete", e);
          },
          expression: "set.ztTranslate.delete"
        }
      }, [t._v(" 替换原图层 ")])], 1);
    }
```