# 模板 · Custom

> 来源：`56d7.js` render 函数 `up`（行 27797）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="embed-wrap" @mousedown>
  <div class="app-padding">
    <baseCheck class="theme-mb" v-model="set.cyDragInAutoEmbed">
      拖入图片自动嵌入图片
    </baseCheck>
    <baseCheck class="theme-mb" v-model="set.cyPasetImageAutoEmbed">
      粘贴图片自动嵌入图片
    </baseCheck>
    <baseCheck v-model="set.cyClipMaskAutoEmbed">
      使用剪贴蒙版时自动嵌入图片
    </baseCheck>
  </div>
  <hr class="line mt15" />
  <div class="mt15 app-padding">
    <baseRadio class="theme-mb" v-model="set.cyLinkObject">
      嵌入时不存链接对象
    </baseRadio>
    <baseRadio class="theme-mb" v-model="set.cyLinkObject">
      嵌入时存链接对象(图片原始路径)
    </baseRadio>
    <baseRadio class="theme-mb" v-model="set.cyLinkObject">
      嵌入时存链接对象(与PSD同一目录)
    </baseRadio>
    <baseCheck v-model="set.cyDeleteNext">
      删除下一图层
    </baseCheck>
  </div>
  <hr class="line mt15" />
  <baseCheck class="app-padding mt15 " v-model="set.cyOpenDranInToLinkObject">
    拖入图片转成链接智能对象
  </baseCheck>
  <hr class="line mt15" />
  <div class="f-baseX app-padding mt15">
    <button class="btn-2 mb0" @click>
      转链接智能对象
    </button>
    <button class="btn-2 mr0 mb0" @click>
      转智能对象
    </button>
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
    staticClass: "embed-wrap",
    on: {
      mousedown: function (t) {
        t.stopPropagation();
      }
    }
  }, [n("div", {
    staticClass: "app-padding"
  }, [n("baseCheck", {
    staticClass: "theme-mb",
    model: {
      value: t.set.cyDragInAutoEmbed,
      callback: function (e) {
        t.$set(t.set, "cyDragInAutoEmbed", e);
      },
      expression: "set.cyDragInAutoEmbed"
    }
  }, [t._v(" 拖入图片自动嵌入图片 ")]), n("baseCheck", {
    staticClass: "theme-mb",
    model: {
      value: t.set.cyPasetImageAutoEmbed,
      callback: function (e) {
        t.$set(t.set, "cyPasetImageAutoEmbed", e);
      },
      expression: "set.cyPasetImageAutoEmbed"
    }
  }, [t._v(" 粘贴图片自动嵌入图片 ")]), n("baseCheck", {
    model: {
      value: t.set.cyClipMaskAutoEmbed,
      callback: function (e) {
        t.$set(t.set, "cyClipMaskAutoEmbed", e);
      },
      expression: "set.cyClipMaskAutoEmbed"
    }
  }, [t._v(" 使用剪贴蒙版时自动嵌入图片 ")])], 1), n("hr", {
    staticClass: "line mt15"
  }), n("div", {
    staticClass: "mt15 app-padding"
  }, [n("baseRadio", {
    staticClass: "theme-mb",
    attrs: {
      label: -1
    },
    model: {
      value: t.set.cyLinkObject,
      callback: function (e) {
        t.$set(t.set, "cyLinkObject", e);
      },
      expression: "set.cyLinkObject"
    }
  }, [t._v(" 嵌入时不存链接对象 ")]), n("baseRadio", {
    staticClass: "theme-mb",
    attrs: {
      label: 1
    },
    model: {
      value: t.set.cyLinkObject,
      callback: function (e) {
        t.$set(t.set, "cyLinkObject", e);
      },
      expression: "set.cyLinkObject"
    }
  }, [t._v(" 嵌入时存链接对象(图片原始路径) ")]), n("baseRadio", {
    staticClass: "theme-mb",
    attrs: {
      label: 2
    },
    model: {
      value: t.set.cyLinkObject,
      callback: function (e) {
        t.$set(t.set, "cyLinkObject", e);
      },
      expression: "set.cyLinkObject"
    }
  }, [t._v(" 嵌入时存链接对象(与PSD同一目录) ")]), n("baseCheck", {
    model: {
      value: t.set.cyDeleteNext,
      callback: function (e) {
        t.$set(t.set, "cyDeleteNext", e);
      },
      expression: "set.cyDeleteNext"
    }
  }, [t._v("删除下一图层")])], 1), n("hr", {
    staticClass: "line mt15"
  }), n("baseCheck", {
    staticClass: "app-padding mt15 ",
    model: {
      value: t.set.cyOpenDranInToLinkObject,
      callback: function (e) {
        t.$set(t.set, "cyOpenDranInToLinkObject", e);
      },
      expression: "set.cyOpenDranInToLinkObject"
    }
  }, [t._v(" 拖入图片转成链接智能对象 ")]), n("hr", {
    staticClass: "line mt15"
  }), n("div", {
    staticClass: "f-baseX app-padding mt15"
  }, [n("button", {
    staticClass: "btn-2 mb0",
    on: {
      click: function (e) {
        return t.toLinkSmart();
      }
    }
  }, [t._v("转链接智能对象")]), n("button", {
    staticClass: "btn-2 mr0 mb0",
    on: {
      click: function (e) {
        return t.linkToSmart();
      }
    }
  }, [t._v("转智能对象")])])], 1);
}
```