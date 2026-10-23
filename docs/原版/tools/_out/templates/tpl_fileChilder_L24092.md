# 模板 · fileChilder

> 来源：`app.v4.js` render 函数 `Tc`（行 24092）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<LibLayout class="absolute right0 zindex99 topPopGap" @dropOpen>
  <TemplateOwn @importFolder />
  <LabelManegePanel @toggleTagPanelVisible />
</LibLayout>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("LibLayout", {
        attrs: {
          menuActive: t.centerMenuShow
        },
        on: {
          dropOpen: t.dropOpen
        },
        scopedSlots: t._u([{
          key: "nav",
          fn: function () {
            return [n("LibTopNav", {
              attrs: {
                navList: t.navList,
                switchIndex: t.switchIndex
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
            return [n("PersonalTemplateMenu", {
              ref: "personaTemplateMenu",
              staticClass: "absolute right0 zindex99 topPopGap",
              on: {
                updataPreview: t.updataPreview,
                toggleTagPanelVisible: t.toggleTagPanelVisible
              }
            })];
          },
          proxy: true
        }])
      }, [n("TemplateOwn", {
        ref: "templateOwn",
        on: {
          importFolder: t.importFolder,
          importPack: t.importPack,
          createNewTemplate: t.createNewTemplate,
          openTemplate: t.openTemplate,
          toggleTagPanelVisible: t.toggleTagPanelVisible
        }
      }), t.isShowLabelManegePanel ? n("LabelManegePanel", {
        on: {
          toggleTagPanelVisible: t.toggleTagPanelVisible,
          filterListByTag: t.filterListByTag
        }
      }) : t._e()], 1);
    }
```