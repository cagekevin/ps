# 模板 · font-menu

> 来源：`app.v4.js` render 函数 `zg`（行 43721）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manager__menu">
  <div @click>
    <Icon type="daoru" />
    <span>
      导入标签
    </span>
  </div>
  <div @click>
    <Icon type="daochu" />
    <span>
      导出标签
    </span>
  </div>
  <div class="font-manager__menu__divider" />
  <div @click>
    <Icon type="mianze" />
    <span>
      免责声明
    </span>
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
        staticClass: "font-manager__menu"
      }, [n("div", {
        on: {
          click: t.importFont
        }
      }, [n("Icon", {
        attrs: {
          type: "daoru"
        }
      }), n("span", [t._v("导入标签")])], 1), n("div", {
        on: {
          click: t.exportFont
        }
      }, [n("Icon", {
        attrs: {
          type: "daochu"
        }
      }), n("span", [t._v("导出标签")])], 1), n("div", {
        staticClass: "font-manager__menu__divider"
      }), n("div", {
        on: {
          click: t.disclaimer
        }
      }, [n("Icon", {
        attrs: {
          type: "mianze"
        }
      }), n("span", [t._v("免责声明")])], 1)]);
    }
```