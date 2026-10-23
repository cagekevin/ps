# 模板 · toggle-template-info-display

> 来源：`app.v4.js` render 函数 `Ku`（行 28935）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<GDropdown class="toggle-template-info-display">
  <div>
    <button class="dropdown-btn">
      <Icon type="eye_outline" />
    </button>
  </div>
  <GMenu class="template-info-menu">
    <GMenuItem class="template-info-menu-item" @click>
      <GCheckbox class="template-info-menu-check-box" />
      <span>
        显示名称
      </span>
    </GMenuItem>
    <GMenuItem class="template-info-menu-item" @click>
      <GCheckbox class="template-info-menu-check-box" />
      <span>
        显示尺寸
      </span>
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
        staticClass: "toggle-template-info-display",
        attrs: {
          trigger: ["click"]
        }
      }, [n("div", [n("button", {
        staticClass: "dropdown-btn"
      }, [n("Icon", {
        attrs: {
          type: "eye_outline"
        }
      })], 1)]), n("GMenu", {
        staticClass: "template-info-menu",
        attrs: {
          slot: "overlay"
        },
        slot: "overlay"
      }, [n("GMenuItem", {
        staticClass: "template-info-menu-item",
        on: {
          click: t.toggleNameShow
        }
      }, [n("GCheckbox", {
        staticClass: "template-info-menu-check-box",
        attrs: {
          checked: t.showName
        }
      }), n("span", [t._v("显示名称")])], 1), n("GMenuItem", {
        staticClass: "template-info-menu-item",
        on: {
          click: t.togglePsdSizeShow
        }
      }, [n("GCheckbox", {
        staticClass: "template-info-menu-check-box",
        attrs: {
          checked: t.showSize
        }
      }), n("span", [t._v("显示尺寸")])], 1)], 1)], 1);
    }
```