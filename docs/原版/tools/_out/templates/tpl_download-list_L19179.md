# 模板 · download-list

> 来源：`app.v4.js` render 函数 `tr`（行 19179）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="w100 h100">
  <section class="template-list h100">
    <Waterfall class="template-list__material-preview-box" @click />
    <div class="right_key_modal" @contextmenu v-show="showFileMenu" />
  </section>
  <TemplateRightKeyMenu @close v-show="showFileMenu" :style="{ left: t.fileMenuX, top: t.fileMenuY, opacity: t.opacity }" />
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "w100 h100",
        staticStyle: {
          "padding-right": "9px",
          "overflow-y": "auto"
        }
      }, [n("section", {
        ref: "template-list",
        staticClass: "template-list h100"
      }, [n("Waterfall", {
        attrs: {
          margin: [t.MATERIAL_MARGIN, t.MATERIAL_MARGIN_VERTICAL],
          list: t.materials,
          getItemSize: t.getItemSize,
          columns: t.innerColumns
        },
        scopedSlots: t._u([{
          key: "default",
          fn: function (e) {
            var a = e.item;
            var i = e.index;
            return [n("div", {
              staticClass: "template-list__material-preview-box"
            }, [n("MaterialPreview", {
              attrs: {
                "show-popup": t.showFileMenu && t.selectTemItem === a,
                template: a,
                columns: t.innerColumns,
                setRatio: t.setRatio,
                lazy: i > 10,
                materialType: "template"
              },
              on: {
                click: function (e) {
                  return t.openContent(e, a);
                },
                "open-right-key-menu": t.showRightkeyMenu
              },
              nativeOn: {
                contextmenu: function (e) {
                  return t.showRightkeyMenu(e, a);
                }
              }
            })], 1)];
          }
        }])
      }), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.showFileMenu,
          expression: "showFileMenu"
        }],
        staticClass: "right_key_modal",
        on: {
          contextmenu: function (e) {
            t.showFileMenu = false;
          }
        }
      })], 1), n("TemplateRightKeyMenu", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.showFileMenu,
          expression: "showFileMenu"
        }],
        ref: "fileMenu",
        style: {
          left: t.fileMenuX,
          top: t.fileMenuY,
          opacity: t.opacity
        },
        attrs: {
          show: t.showFileMenu,
          item: t.selectTemItem
        },
        on: {
          close: function (e) {
            t.showFileMenu = false;
          }
        },
        nativeOn: {
          click: function (t) {
            t.stopPropagation();
          }
        }
      })], 1);
    }
```