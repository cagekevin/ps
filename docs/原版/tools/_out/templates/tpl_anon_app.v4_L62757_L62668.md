# 模板 · anon_app.v4_L62757

> 来源：`app.v4.js` render 函数 `IT`（行 62668）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<CepModal @cancel>
  <div class="modal_body">
    <div class="f-alignNone mt5">
      <div>
        缓存大小
      </div>
      <div class="text_white" />
    </div>
    <div class="clear_btn mt8" @click>
      清理缓存
    </div>
    <div class="text_white mt25">
      缓存设置
    </div>
    <div class="f-alignNone f-verticalC mt15">
      <div>
        设置缓存上限
      </div>
      <div class="select_box" @click>
        <div class="select_content text_white" @click>
          <span />
          <Icon class="select_icon" type="Icon" />
        </div>
        <div class="dropdown_list" v-show="isShowSetCacheDropdownList" />
      </div>
    </div>
  </div>
</CepModal>
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
      return n("CepModal", {
        attrs: {
          title: "清理缓存",
          footer: false,
          closable: false,
          mask: true,
          hasOffset: true
        },
        on: {
          cancel: function (e) {
            return t.$emit("showClearCacheDialog", false);
          },
          handleModalContentClick: function () {
            return t.handleShowSetCacheDropdownList(false);
          }
        }
      }, [n("div", {
        staticClass: "modal_body"
      }, [n("div", {
        staticClass: "f-alignNone mt5"
      }, [n("div", [t._v("缓存大小")]), n("div", {
        staticClass: "text_white"
      }, [t._v(t._s(t.showCacheSize))])]), n("div", {
        staticClass: "clear_btn mt8",
        class: [t.encryptedFileSize ? "clear_color" : "empty_color"],
        on: {
          click: function (e) {
            return t.clearCache();
          }
        }
      }, [t._v(" 清理缓存 ")]), n("div", {
        staticClass: "text_white mt25"
      }, [t._v("缓存设置")]), n("div", {
        staticClass: "f-alignNone f-verticalC mt15"
      }, [n("div", [t._v("设置缓存上限")]), n("div", {
        staticClass: "select_box",
        on: {
          click: function (t) {
            t.stopPropagation();
          }
        }
      }, [n("div", {
        staticClass: "select_content text_white",
        on: {
          click: function (e) {
            return t.handleShowSetCacheDropdownList(true);
          }
        }
      }, [n("span", [t._v(t._s(t.cacheCapacityOptions[t.currentSelectIndex].label))]), n("Icon", {
        staticClass: "select_icon",
        attrs: {
          type: "Icon"
        }
      })], 1), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.isShowSetCacheDropdownList,
          expression: "isShowSetCacheDropdownList"
        }],
        staticClass: "dropdown_list"
      }, t._l(t.cacheCapacityOptions, function (e, a) {
        return n("div", {
          key: e.label,
          staticClass: "dropdown_item",
          class: {
            active_dropdown_item: a === t.currentSelectIndex
          },
          on: {
            click: function (e) {
              return t.handleSelectDropdownItem(a);
            }
          }
        }, [a === t.currentSelectIndex ? n("Icon", {
          staticClass: "select_icon check_icon",
          attrs: {
            type: "check_outline"
          }
        }) : t._e(), n("span", [t._v(t._s(e.label))])], 1);
      }), 0)])])])]);
    }
```