# 模板 · Template

> 来源：`56d7.js` render 函数 `gf`（行 25515）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="relative">
  <LibLayout class="absolute right0 zindex99 topPopGap" @dropOpen v-model="collapse" />
  <div class="template-preview" @click>
    <Preview />
  </div>
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
    staticClass: "relative"
  }, [n("LibLayout", {
    attrs: {
      disabled: t.disableOtherActionsWhenDownloading,
      menuActive: t.centerMenuShow
    },
    on: {
      dropOpen: t.dropOpen
    },
    scopedSlots: t._u([{
      key: "banner",
      fn: function () {
        return [n("TopicBanner", {
          attrs: {
            type: "material",
            visible: t.$route.name === "Material"
          },
          model: {
            value: t.collapse,
            callback: function (e) {
              t.collapse = e;
            },
            expression: "collapse"
          }
        })];
      },
      proxy: true
    }, {
      key: "nav",
      fn: function () {
        return [n("LibTopNav", {
          attrs: {
            navList: t.navList,
            switchIndex: t.switchIndex,
            disabled: t.disableOtherActionsWhenDownloading
          },
          on: {
            setSwitchIndex: t.setSwitchIndex
          }
        })];
      },
      proxy: true
    }, {
      key: "menu",
      fn: function () {
        return [n("MaterialCenterMenu", {
          ref: "templateCenterMenu",
          staticClass: "absolute right0 zindex99 topPopGap",
          attrs: {
            disabled: t.disableOtherActionsWhenDownloading
          },
          on: {
            reload: t.reloadTemplateCenter
          }
        })];
      },
      proxy: true
    }])
  }, t._l(t.navList, function (e) {
    return n("div", {
      directives: [{
        name: "show",
        rawName: "v-show",
        value: t.switchIndex === e.index,
        expression: "switchIndex === module.index"
      }],
      key: e.index,
      staticClass: "w100 ff1",
      staticStyle: {
        overflow: "hidden"
      }
    }, [e.hasInited ? n("MaterialCenter", {
      ref: "materialCenter",
      refInFor: true,
      attrs: {
        visible: t.switchIndex === e.index,
        type: e.type,
        updater: t.collapse
      },
      on: {
        scroll: t.onScrollList
      }
    }) : t._e()], 1);
  }), 0), t.previewInfo ? n("div", {
    staticClass: "template-preview",
    on: {
      click: t.closePreview
    }
  }, [n("Preview", {
    attrs: {
      previewInfo: t.previewInfo,
      materialType: "material"
    }
  })], 1) : t._e()], 1);
}
```