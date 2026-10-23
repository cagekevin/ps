# 模板 · anon_app.v4_L28384

> 来源：`app.v4.js` render 函数 `fu`（行 27263）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="relate-tag-wrap f-center" @click>
  <Myvuescroll class="card f-arrayY">
    <div class="nav f-baseX">
      <span>
        标签
      </span>
      <div class="to-label-management" @click>
        管理
      </div>
    </div>
    <hr class="line" />
    <div class="search-wrap">
      <InputSearch class="input-search" @change v-model="findText" />
      <div class="mt3 err_text" v-show="isShowErrText" />
    </div>
    <Myvuescroll class="ff1 content">
      <div class="mb8">
        <TagsButton class="tag-btn create" type="add">
          新建\
        </TagsButton>
        <TagsButton class="tag-btn" @add type="add">
        </TagsButton>
      </div>
      <div class="mb8">
        <p>
          已添加标签 (
        </p>
        <div class="mt6">
          <div class="f-base" />
        </div>
      </div>
      <div class="f-space">
        <div>
          <p>
            最近使用 (
          </p>
          <div class="mt6" />
        </div>
        <div class="comUsed">
          <p>
            常用标签 (
          </p>
          <div class="mt6">
            <TagsButton class="tag-btn" @add type="add">
            </TagsButton>
          </div>
        </div>
        <div class="mt8">
          <p />
          <TagsButton class="tag-btn" @add type="add">
          </TagsButton>
        </div>
      </div>
    </Myvuescroll>
  </Myvuescroll>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 6 | `v-for` |
| `if` 条件分支 | 1 | `v-if` / `v-else` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "relate-tag-wrap f-center",
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.close();
          }
        }
      }, [n("Myvuescroll", {
        staticClass: "card f-arrayY",
        nativeOn: {
          click: function (t) {
            t.stopPropagation();
          }
        }
      }, [n("div", {
        staticClass: "nav f-baseX"
      }, [n("span", [t._v("标签")]), n("div", {
        staticClass: "to-label-management",
        on: {
          click: function (e) {
            return t.openLabelManage();
          }
        }
      }, [t._v("管理")])]), n("hr", {
        staticClass: "line"
      }), n("div", {
        staticClass: "search-wrap"
      }, [n("InputSearch", {
        staticClass: "input-search",
        attrs: {
          size: "small",
          placeholder: "新增或搜索标签"
        },
        on: {
          change: t.onChange
        },
        nativeOn: {
          keyup: function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.createTags();
            }
          }
        },
        model: {
          value: t.findText,
          callback: function (e) {
            t.findText = e;
          },
          expression: "findText"
        }
      }), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.isShowErrText,
          expression: "isShowErrText"
        }],
        staticClass: "mt3 err_text"
      }, [t._v(t._s(t.errText))])], 1), n("Myvuescroll", {
        staticClass: "ff1 content"
      }, [t.showCreate || t.find.length > 0 ? n("div", {
        staticClass: "mb8"
      }, [t.showCreate ? n("TagsButton", {
        staticClass: "tag-btn create",
        attrs: {
          type: "add"
        },
        nativeOn: {
          click: function (e) {
            return t.createTags();
          }
        }
      }, [t._v(" 新建\"" + t._s(t.findText) + "\" ")]) : t._e(), t._l(t.find, function (e, a) {
        return n("TagsButton", {
          key: "mb-menuIn2" + a,
          staticClass: "tag-btn",
          attrs: {
            type: "add"
          },
          on: {
            add: function (n) {
              return t.addTags(e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      })], 2) : t._e(), t.added.length != 0 ? n("div", {
        staticClass: "mb8"
      }, [n("p", [t._v("已添加标签 (" + t._s(t.added.length) + ")")]), n("div", {
        staticClass: "mt6"
      }, [n("div", {
        staticClass: "f-base"
      }, t._l(t.added, function (e, a) {
        return n("TagsButton", {
          key: "mb-menuIn3" + a,
          attrs: {
            type: "remove"
          },
          on: {
            remove: function (n) {
              return t.removeTags(e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 1)])]) : t._e(), n("div", {
        staticClass: "f-space"
      }, [t.data.historyTags.length > 0 ? n("div", {}, [n("p", [t._v("最近使用 (" + t._s(t.data.historyTags.length) + ")")]), n("div", {
        staticClass: "mt6"
      }, t._l(t.data.historyTags, function (e, a) {
        return n("TagsButton", {
          key: "mb-menuIn4" + a,
          staticClass: "tag-btn",
          attrs: {
            type: "add"
          },
          on: {
            add: function (n) {
              return t.addTags(e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 1)]) : t._e(), n("div", {
        staticClass: "comUsed"
      }, [n("p", [t._v("常用标签 (" + t._s(t.commonTags.length) + ")")]), n("div", {
        staticClass: "mt6"
      }, [t._l(t.commonTags, function (e, a) {
        return [n("TagsButton", {
          key: "mb-menuIn6" + a,
          staticClass: "tag-btn",
          attrs: {
            type: "add"
          },
          on: {
            add: function (n) {
              return t.addTags(e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")])];
      })], 2)]), t._l(t.groupTags, function (e, a) {
        return n("div", {
          key: "str" + a,
          staticClass: "mt8"
        }, [n("p", [t._v(t._s(e.name) + " (" + t._s(e.data.length) + ")")]), t._l(e.data, function (e, a) {
          return n("TagsButton", {
            key: "mb-menuIn5" + a,
            staticClass: "tag-btn",
            attrs: {
              type: "add"
            },
            on: {
              add: function (n) {
                return t.addTags(e);
              }
            }
          }, [t._v(" " + t._s(e) + " ")]);
        })], 2);
      })], 2)])], 1)], 1);
    }
```