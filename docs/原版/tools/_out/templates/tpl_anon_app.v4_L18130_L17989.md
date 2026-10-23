# 模板 · anon_app.v4_L18130

> 来源：`app.v4.js` render 函数 `Aa`（行 17989）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="relative">
  <LibLayout class="absolute right0 zindex99 topPopGap" @dropOpen v-show="switchIndex === 1" v-model="collapse">
    <TemplateCenter @scroll />
  </LibLayout>
  <MyTemplatesEntry @setSwitchIndex v-show="switchIndex === 0" />
  <div class="template-preview" @click>
    <Preview />
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
        staticClass: "relative"
      }, [n("LibLayout", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.switchIndex === 1,
          expression: "switchIndex === 1"
        }],
        attrs: {
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
                type: "template",
                visible: t.$route.name === "Template"
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
            return [n("TemplateCenterMenu", {
              ref: "templateCenterMenu",
              staticClass: "absolute right0 zindex99 topPopGap",
              on: {
                reload: t.reloadTemplateCenter
              }
            })];
          },
          proxy: true
        }])
      }, [n("TemplateCenter", {
        ref: "template-center",
        attrs: {
          visible: t.switchIndex === 1,
          updater: t.collapse
        },
        on: {
          scroll: t.onScrollList
        }
      })], 1), n("MyTemplatesEntry", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.switchIndex === 0,
          expression: "switchIndex === 0"
        }],
        ref: "templateOwn",
        attrs: {
          switchIndex: t.switchIndex
        },
        on: {
          setSwitchIndex: t.setSwitchIndex
        }
      }), t.previewInfo ? n("div", {
        staticClass: "template-preview",
        on: {
          click: t.closePreview
        }
      }, [n("Preview", {
        attrs: {
          previewInfo: t.previewInfo,
          materialType: "template"
        }
      })], 1) : t._e()], 1);
    }
```