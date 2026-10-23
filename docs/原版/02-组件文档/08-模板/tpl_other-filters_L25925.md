# 模板 · other-filters

> 来源：`56d7.js` render 函数 `Mf`（行 25925）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="w100 h100 template-list-wrapper">
  <section class="template-list h100">
    <WaterfallVirtualList class="template-list__material-preview-box" @loadMore v-show="list && list.length" />
  </section>
</div>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    staticClass: "w100 h100 template-list-wrapper"
  }, [n("section", {
    ref: "material-list",
    staticClass: "template-list h100"
  }, [n("WaterfallVirtualList", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.list && t.list.length,
      expression: "list && list.length"
    }],
    attrs: {
      data: t.list,
      columns: t.innerColumns,
      gap: [t.MATERIAL_MARGIN, t.MATERIAL_MARGIN_VERTICAL],
      "row-height": 100,
      fixedHeight: 10,
      "preload-distance": 50,
      loading: t.loading,
      "top-fixed-height": t.topDistance,
      extraHeight: 0,
      containerHeight: t.clientHeight,
      clientWidth: t.clientWidth,
      "key-prop": "assetInfo.id",
      virtual: true
    },
    on: {
      loadMore: t.nextPage,
      scroll: function (e) {
        return t.$emit("scroll", e);
      }
    },
    scopedSlots: t._u([{
      key: "default",
      fn: function (e) {
        var a = e.item;
        var i = e.index;
        return [n("div", [n("div", {
          staticClass: "template-list__material-preview-box"
        }, [n("Expose", {
          on: {
            expose: function (e) {
              return t.expose(a);
            }
          }
        }, [n("MaterialPreview", {
          attrs: {
            "show-popup": false,
            template: a,
            setRatio: t.setRatio,
            lazy: i > 10,
            columns: t.innerColumns,
            materialType: "material"
          },
          on: {
            click: t.handleMaterialPreviewClick,
            cancel: function (e) {
              return t.cancelDownload(a);
            }
          }
        })], 1)], 1)])];
      }
    }])
  })], 1)]);
}
```