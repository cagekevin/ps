# 模板 · VirtualLayoutWF

> 来源：`app.v4.js` render 函数 `Ys`（行 21481）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="waterfall">
  <VirtualLayoutWF @isNeedScroll />
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "waterfall"
      }, [t.collection.length ? n("VirtualLayoutWF", {
        ref: "virtualLayoutWF",
        attrs: {
          width: t.clientWidth,
          height: t.clientHeight,
          collection: t.collection,
          columns: t.columns,
          cellSizeAndPositionGetter: t.cellSizeAndPositionGetter,
          otherSlotHeight: t.otherSlotHeight,
          fixedHeight: t.fixedHeight
        },
        on: {
          isNeedScroll: t.handleSetIsNeedScroll,
          scroll: t.handleScroll,
          loadMore: t.loadMore
        },
        scopedSlots: t._u([{
          key: "other",
          fn: function () {
            return [t._t("other")];
          },
          proxy: true
        }, {
          key: "cell",
          fn: function (e) {
            var n = e.item;
            return [t._t("default", null, {
              item: n,
              index: n._index,
              width: t.actualWidth,
              height: n._height
            })];
          }
        }], null, true)
      }) : t._t("other")], 2);
    }
```