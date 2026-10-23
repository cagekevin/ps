# 模板 · anon_app.v4_L37186

> 来源：`app.v4.js` render 函数 `Bp`（行 37097）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="reference" @mousedown>
  <div class="app-padding">
    <baseCheck v-model="open">
      开启智能参考线(使用后请关闭)
    </baseCheck>
    <div class="f-baseX w100 mt15">
      <baseInput class="f-space" v-model="width" />
      <button class="ml10 mb0" @click>
        应用
      </button>
    </div>
  </div>
  <hr class="line mt15" />
  <div class="f-baseX app-padding mt15">
    <button class="btn-2 mb0" @click>
      清除参考线
    </button>
    <button class="btn-2 mr0 mb0" @click>
      基于参考线切片
    </button>
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
        staticClass: "reference",
        on: {
          mousedown: function (t) {
            t.stopPropagation();
          }
        }
      }, [n("div", {
        staticClass: "app-padding"
      }, [n("baseCheck", {
        attrs: {
          title: "开启后，点击即可生成参考线"
        },
        model: {
          value: t.open,
          callback: function (e) {
            t.open = e;
          },
          expression: "open"
        }
      }, [t._v(" 开启智能参考线(使用后请关闭) ")]), n("div", {
        staticClass: "f-baseX w100 mt15"
      }, [n("baseInput", {
        staticClass: "f-space",
        attrs: {
          dark: true,
          tips: "安全区域宽度",
          title: "安全区域宽度"
        },
        nativeOn: {
          "!blur": function (e) {
            return t.chenckWidth.apply(null, arguments);
          }
        },
        model: {
          value: t.width,
          callback: function (e) {
            t.width = e;
          },
          expression: "width"
        }
      }), n("button", {
        staticClass: "ml10 mb0",
        attrs: {
          title: "在文档中间安全区域生成2条参考线"
        },
        on: {
          click: t.useGuide,
          contextmenu: function (e) {
            return t.fpUseGuide();
          }
        }
      }, [t._v(" 应用 ")])], 1)], 1), n("hr", {
        staticClass: "line mt15"
      }), n("div", {
        staticClass: "f-baseX app-padding mt15"
      }, [n("button", {
        staticClass: "btn-2 mb0",
        attrs: {
          title: "清除参考线"
        },
        on: {
          click: function (e) {
            return t.guidFunc(1);
          },
          contextmenu: function (e) {
            return t.fpGuidFunc(1);
          }
        }
      }, [t._v(" 清除参考线 ")]), n("button", {
        staticClass: "btn-2 mr0 mb0",
        attrs: {
          title: "基于参考线切片"
        },
        on: {
          click: function (e) {
            return t.guidFunc(2);
          },
          contextmenu: function (e) {
            return t.fpGuidFunc(2);
          }
        }
      }, [t._v(" 基于参考线切片 ")])])]);
    }
```