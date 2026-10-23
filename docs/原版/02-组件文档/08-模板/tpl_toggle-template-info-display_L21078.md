# 模板 · toggle-template-info-display

> 来源：`56d7.js` render 函数 `nh`（行 21078）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<FilterPopover @showFilterManage>
  <div class="filter-manage__close-area" @click>
    <div class="filter-manage" @click>
      <div class="filter-manage__header">
        筛选器
      </div>
      <div class="filter-manage__line" />
      <Myvuescroll>
        <div class="filter-manage__tag">
          <div class="filter-manage__tag__title">
            常用标签 (
          </div>
          <div class="filter-manage__tag__list" />
        </div>
        <div class="filter-manage__tag">
          <div class="filter-manage__tag__title">
          </div>
          <div class="filter-manage__tag__list" />
        </div>
        <div class="filter-manage__tag">
          <div class="filter-manage__tag__title">
            未分组 (
          </div>
          <div class="filter-manage__tag__list" />
        </div>
        <div class="filter-manage__line" />
        <div class="filter-manage__tag">
          <div class="filter-manage__tag__title">
            评分
          </div>
          <div class="filter-manage__tag__list" />
        </div>
        <div class="filter-manage__tag">
          <div class="filter-manage__tag__title">
            时间
          </div>
          <div class="filter-manage__tag__list" />
        </div>
      </Myvuescroll>
    </div>
  </div>
</FilterPopover>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 6 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("FilterPopover", {
    attrs: {
      selectedNum: t.selectedNum
    },
    on: {
      showFilterManage: t.toggleFilterManageVisible
    }
  }, [t.isShowFilterManage ? n("div", {
    staticClass: "filter-manage__close-area",
    on: {
      click: function (e) {
        t.isShowFilterManage = false;
      }
    }
  }, [n("div", {
    staticClass: "filter-manage",
    on: {
      click: function (t) {
        t.stopPropagation();
      }
    }
  }, [n("div", {
    staticClass: "filter-manage__header"
  }, [t._v("筛选器")]), n("div", {
    staticClass: "filter-manage__line"
  }), n("Myvuescroll", {
    staticStyle: {
      "max-height": "438px"
    }
  }, [n("div", {
    staticClass: "filter-manage__tag"
  }, [n("div", {
    staticClass: "filter-manage__tag__title"
  }, [t._v(" 常用标签 (" + t._s(t.tagsData.commonLabel.labelData.length) + ") ")]), n("div", {
    staticClass: "filter-manage__tag__list"
  }, t._l(t.tagsData.commonLabel.labelData, function (e) {
    return n("div", {
      key: e,
      staticClass: "filter-manage__tag__list__item",
      class: {
        "filter-manage__tag__list__item--selected": t.tags.includes(e)
      },
      on: {
        click: function (n) {
          return t.filterTag(e);
        }
      }
    }, [t._v(" " + t._s(e) + " ")]);
  }), 0)]), t._l(t.tagsData.labelGroup.labelData, function (e) {
    return n("div", {
      key: e.name,
      staticClass: "filter-manage__tag"
    }, [n("div", {
      staticClass: "filter-manage__tag__title"
    }, [t._v(" " + t._s(e.name + " (" + e.data.length + ")") + " ")]), n("div", {
      staticClass: "filter-manage__tag__list"
    }, t._l(e.data, function (e) {
      return n("div", {
        key: e,
        staticClass: "filter-manage__tag__list__item",
        class: {
          "filter-manage__tag__list__item--selected": t.tags.includes(e)
        },
        on: {
          click: function (n) {
            return t.filterTag(e);
          }
        }
      }, [t._v(" " + t._s(e) + " ")]);
    }), 0)]);
  }), n("div", {
    staticClass: "filter-manage__tag"
  }, [n("div", {
    staticClass: "filter-manage__tag__title"
  }, [t._v(" 未分组 (" + t._s(t.tagsData.unclassified.labelData.length) + ") ")]), n("div", {
    staticClass: "filter-manage__tag__list"
  }, t._l(t.tagsData.unclassified.labelData, function (e) {
    return n("div", {
      key: e,
      staticClass: "filter-manage__tag__list__item",
      class: {
        "filter-manage__tag__list__item--selected": t.tags.includes(e)
      },
      on: {
        click: function (n) {
          return t.filterTag(e);
        }
      }
    }, [t._v(" " + t._s(e) + " ")]);
  }), 0)]), n("div", {
    staticClass: "filter-manage__line"
  }), n("div", {
    staticClass: "filter-manage__tag"
  }, [n("div", {
    staticClass: "filter-manage__tag__title"
  }, [t._v("评分")]), n("div", {
    staticClass: "filter-manage__tag__list"
  }, t._l(t.scoreOptions, function (e) {
    return n("div", {
      key: e,
      staticClass: "filter-manage__tag__list__item",
      class: {
        "filter-manage__tag__list__item--selected": t.scores.includes(e)
      },
      on: {
        click: function (n) {
          return t.filterScore(e);
        }
      }
    }, [t._v(" " + t._s(e) + " ")]);
  }), 0)]), n("div", {
    staticClass: "filter-manage__tag"
  }, [n("div", {
    staticClass: "filter-manage__tag__title"
  }, [t._v("时间")]), n("div", {
    staticClass: "filter-manage__tag__list"
  }, t._l(t.timeOptions, function (e) {
    return n("div", {
      key: e,
      staticClass: "filter-manage__tag__list__item",
      class: {
        "filter-manage__tag__list__item--selected": t.time.includes(e)
      },
      on: {
        click: function (n) {
          return t.filterTime(e);
        }
      }
    }, [t._v(" " + t._s(e) + " ")]);
  }), 0)])], 2)], 1)]) : t._e()]);
}
```