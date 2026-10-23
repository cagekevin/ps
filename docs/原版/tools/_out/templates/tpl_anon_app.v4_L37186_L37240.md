# 模板 · anon_app.v4_L37186

> 来源：`app.v4.js` render 函数 `Wp`（行 37240）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="spacing-wrap" @mousedown>
  <div class="app-padding f-baseX">
    <baseInput class="f-space" v-model="width" />
    <baseIcon class="ml10 mr3" @handle />
    <baseIcon class=" f-center mr4" @handle />
  </div>
  <hr class="line mt15" />
  <div class="f-baseX app-padding mt15">
    <baseRadio v-model="mode">
      按图层排序
    </baseRadio>
    <baseRadio class="ml40" v-model="mode">
      按坐标排序
    </baseRadio>
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
        staticClass: "spacing-wrap",
        on: {
          mousedown: function (t) {
            t.stopPropagation();
          }
        }
      }, [n("div", {
        staticClass: "app-padding f-baseX"
      }, [n("baseInput", {
        staticClass: "f-space",
        attrs: {
          dark: true,
          tips: "间距",
          title: "图层相隔的距离，支持像素(px)、厘米(cm)、毫米(mm)、英尺(in)、点(pt)、派卡(pc)"
        },
        nativeOn: {
          "!blur": function (e) {
            return t.checkUnit.apply(null, arguments);
          }
        },
        model: {
          value: t.width,
          callback: function (e) {
            t.width = e;
          },
          expression: "width"
        }
      }), n("baseIcon", {
        staticClass: "ml10 mr3",
        attrs: {
          name: "#iconshuipingjuzhongfenbu",
          width: "28px",
          height: "28px",
          title: "从上到下排序图层"
        },
        on: {
          handle: function (e) {
            return t.handle(1);
          },
          menu: function (e) {
            return t.fpSpacingDistribution(1);
          }
        }
      }), n("baseIcon", {
        staticClass: " f-center mr4",
        attrs: {
          name: "#iconchuizhijuzhongfenbu",
          width: "28px",
          height: "28px",
          title: "从左到右排序图层"
        },
        on: {
          handle: function (e) {
            return t.handle(2);
          },
          menu: function (e) {
            return t.fpSpacingDistribution(2);
          }
        }
      })], 1), n("hr", {
        staticClass: "line mt15"
      }), n("div", {
        staticClass: "f-baseX app-padding mt15"
      }, [n("baseRadio", {
        attrs: {
          label: 1,
          title: "按图层面板排序"
        },
        model: {
          value: t.mode,
          callback: function (e) {
            t.mode = e;
          },
          expression: "mode"
        }
      }, [t._v("按图层排序")]), n("baseRadio", {
        staticClass: "ml40",
        attrs: {
          label: 2,
          title: "按文档坐标排序"
        },
        model: {
          value: t.mode,
          callback: function (e) {
            t.mode = e;
          },
          expression: "mode"
        }
      }, [t._v(" 按坐标排序 ")])], 1)]);
    }
```