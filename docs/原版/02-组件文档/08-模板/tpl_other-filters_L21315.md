# 模板 · other-filters

> 来源：`56d7.js` render 函数 `ph`（行 21315）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<GDropdown v-model="visible">
  <GTooltip>
    <template>
    </template>
    <LongPress class="add-wrap f-center" @longPress>
      <AddTemplateIcon :type="t.TEMPLATE[t.addToTemplateMode].icon" />
    </LongPress>
  </GTooltip>
  <GMenu class="options-menu" @click>
    <GMenuItem class="option-item" @click>
      <Icon :type="t.TEMPLATE.multiple.icon" />
      <span />
    </GMenuItem>
    <GMenuItem class="option-item" @click>
      <Icon :type="t.TEMPLATE.one.icon" />
      <span />
    </GMenuItem>
  </GMenu>
</GDropdown>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("GDropdown", {
    attrs: {
      trigger: [""],
      placement: "topRight"
    },
    model: {
      value: t.visible,
      callback: function (e) {
        t.visible = e;
      },
      expression: "visible"
    }
  }, [n("GTooltip", {
    attrs: {
      placement: "left"
    }
  }, [n("template", {
    slot: "title"
  }, [t._v(" " + t._s(t.TEMPLATE[t.addToTemplateMode].text) + " ")]), n("LongPress", {
    staticClass: "add-wrap f-center",
    on: {
      longPress: t.showMenu,
      click: t.runCacheOperation
    },
    nativeOn: {
      contextmenu: function (e) {
        return t.showMenu.apply(null, arguments);
      }
    }
  }, [n("AddTemplateIcon", {
    attrs: {
      type: t.TEMPLATE[t.addToTemplateMode].icon
    }
  })], 1)], 2), n("GMenu", {
    staticClass: "options-menu",
    attrs: {
      slot: "overlay"
    },
    on: {
      click: t.hideMenu
    },
    slot: "overlay"
  }, [n("GMenuItem", {
    staticClass: "option-item",
    on: {
      click: function (e) {
        return t.addTemplate(t.TEMPLATE.multiple.value);
      }
    }
  }, [n("Icon", {
    attrs: {
      type: t.TEMPLATE.multiple.icon
    }
  }), n("span", [t._v(t._s(t.TEMPLATE.multiple.text))])], 1), n("GMenuItem", {
    staticClass: "option-item",
    on: {
      click: function (e) {
        return t.addTemplate(t.TEMPLATE.one.value);
      }
    }
  }, [n("Icon", {
    attrs: {
      type: t.TEMPLATE.one.icon
    }
  }), n("span", [t._v(t._s(t.TEMPLATE.one.text))])], 1)], 1)], 1);
}
```