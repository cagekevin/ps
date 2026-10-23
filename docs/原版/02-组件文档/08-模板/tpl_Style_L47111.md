# 模板 · Style

> 来源：`56d7.js` render 函数 `oS`（行 47111）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="Action f-baseY relative">
  <Myvuescroll class="w100 h100 f-baseY drag-action-vueScroll">
    <warehouse @add />
    <Myvuescroll class="w100 mt10 ff1" />
    <div class="w100 app-padding button-nav-wrap f-baseX">
      <baseIcon class="mr4" @handle />
      <baseIcon class="mr10" @handle>
        <baseSvg class="svg-4 mt10" @handle />
      </baseIcon>
      <div class="verline mr10" />
      <baseIcon class="mr4" @handle />
      <baseIcon class="mr4" @handle />
    </div>
    <addContext @cancel />
  </Myvuescroll>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 2 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    staticClass: "Action f-baseY relative"
  }, [n("Myvuescroll", {
    staticClass: "w100 h100 f-baseY drag-action-vueScroll"
  }, [n("warehouse", {
    attrs: {
      title: "仓库分组",
      updata: t.updataWh,
      data: t.wh.info
    },
    on: {
      add: t.addWarehouseGroup,
      rename: t.renameWarehouse,
      delete: t.delWarehouseGroup,
      select: t.selectWarehouse
    }
  }), n("Myvuescroll", {
    staticClass: "w100 mt10 ff1"
  }, t._l(t.data.info, function (e, a) {
    return n("div", {
      key: "action" + a,
      staticClass: "mb4 drag-action-wrap",
      on: {
        mouseenter: function (e) {
          t.mouseFunIstrue = a;
        },
        mouseleave: function (e) {
          t.mouseFunIstrue = -1;
        },
        mousedown: function (e) {
          return t.dragColorWrap(a, ".drag-action-wrap", ".drag-action-vueScroll");
        },
        mousemove: function (e) {
          return t.dragColorWrapDrop(a);
        }
      }
    }, [n("baseGroup", {
      staticClass: "btn-padding",
      attrs: {
        text: e.groupName,
        value: e.show,
        title: "按住Ctrl拖拽位置"
      },
      on: {
        menu: function (e) {
          return t.showGroupMenu(e, a);
        },
        change: function (e) {
          return t.funOpen(a);
        }
      }
    }, [t.mouseFunIstrue == a ? n("baseIcon", {
      staticClass: "ml12 add-btn",
      attrs: {
        name: "#iconchuangjian",
        select: t.HierarchySvgNavIstrue,
        title: "添加动作"
      },
      on: {
        handle: function (e) {
          return t.showAddPopup(a);
        }
      }
    }) : t._e(), n("div", {
      directives: [{
        name: "show",
        rawName: "v-show",
        value: e.show,
        expression: "item.show"
      }],
      staticClass: "w100 mt5 f-arrayX f-br"
    }, [t._l(e.list, function (e, i) {
      return n("button", {
        key: "action1" + i,
        staticClass: "btn-min drag-action f-center overflow-btn",
        class: [t.btnLayout],
        attrs: {
          title: e.name + "  按住Ctrl拖拽位置"
        },
        on: {
          click: function (e) {
            return t.callAction(a, i);
          },
          contextmenu: function (e) {
            e.preventDefault();
            e.stopPropagation();
            return t.showMenu(e, a, i);
          },
          mousedown: function (e) {
            e.stopPropagation();
            return t.drag(a, i, ".drag-action", e);
          },
          mousemove: function (e) {
            return t.drop(a, i);
          }
        }
      }, [t._v(" " + t._s(typeof e.alias != "undefined" ? e.alias : e.name) + " ")]);
    }), e.list.length == 0 ? n("p", {
      staticClass: "action-empty"
    }, [t._v(" 该动作组空空如也 ")]) : t._e()], 2)], 1)], 1);
  }), 0), n("div", {
    ref: "refShowList",
    staticClass: "w100 app-padding button-nav-wrap f-baseX"
  }, [n("baseIcon", {
    staticClass: "mr4",
    attrs: {
      name: "#iconxinjiandongzuofenzu",
      title: "添加分组"
    },
    on: {
      handle: function (e) {
        return t.addGroup();
      }
    }
  }), n("baseIcon", {
    staticClass: "mr10",
    attrs: {
      width: "28px",
      name: "#iconliebiao",
      isMore: true,
      title: "显示方式"
    },
    on: {
      handle: function (e) {
        return t.setShowListType(e);
      }
    }
  }, [n("baseSvg", {
    staticClass: "svg-4 mt10",
    attrs: {
      name: "#iconjiaobiao"
    },
    on: {
      handle: function (e) {
        return t.dropOpen("chinaHidden");
      }
    }
  })], 1), n("div", {
    staticClass: "verline mr10"
  }), n("baseIcon", {
    staticClass: "mr4",
    attrs: {
      svgWidth: "18px",
      name: "#icondaoru",
      title: "导入预设"
    },
    on: {
      handle: function (e) {
        return t.importFile();
      }
    }
  }), n("baseIcon", {
    staticClass: "mr4",
    attrs: {
      svgWidth: "18px",
      name: "#icondaochu",
      title: "导出预设"
    },
    on: {
      handle: function (e) {
        return t.exportFile();
      }
    }
  })], 1), t.showAdd ? n("addContext", {
    on: {
      cancel: t.hideAddPopup,
      confirm: t.addAction
    }
  }) : t._e()], 1)], 1);
}
```