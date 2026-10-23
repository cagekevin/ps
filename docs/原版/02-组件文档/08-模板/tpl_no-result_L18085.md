# 模板 · no-result

> 来源：`56d7.js` render 函数 `Fl`（行 18085）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="dropDown-wrap" @click v-show="$store.state.showMenu == condition">
  <div class="item-tips">
    <p>
      配置信息丢失
    </p>
  </div>
  <div class="item" @click>
    修正文件夹内容
  </div>
  <div>
    <div class="item" @click>
      应用到当前设计稿
    </div>
    <div class="item" @click>
      新建设计稿
    </div>
    <div class="item" @click>
      编辑模板源文件
    </div>
    <div class="item" @click>
      重命名
    </div>
    <hr class="line" />
    <div class="item-tips">
      <p>
        选择了
      </p>
    </div>
    <div class="item" @click>
      移动到文件夹
    </div>
    <div class="item" @click>
      添加到文件夹
    </div>
    <div class="item" @click>
      打开所在目录
    </div>
    <hr class="line" />
    <div class="app-padding" @click>
      <div class="div-input">
        <Myvuescroll class="find-main f-base" />
        <input class="tag-input" @click />
      </div>
    </div>
    <hr class="line" />
    <div class="f-baseX item score-item" @click>
      <span class="score-text">
        评分
      </span>
      <Score @select />
    </div>
    <hr class="line" />
    <div class="item" @click>
      更新/修正预览图
    </div>
    <div class="item" @click>
      移入回收站
    </div>
  </div>
</div>
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
  return n("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.$store.state.showMenu == t.condition,
      expression: "$store.state.showMenu == condition"
    }],
    staticClass: "dropDown-wrap",
    on: {
      click: function (e) {
        return t.close();
      }
    }
  }, [t.status == 0 ? n("div", {
    staticClass: "item-tips"
  }, [n("p", [t._v("配置信息丢失")])]) : t._e(), t.status == 0 ? n("div", {
    staticClass: "item",
    on: {
      click: function (e) {
        return t.refreshFolderInfo();
      }
    }
  }, [t._v("修正文件夹内容")]) : n("div", [t.select.length == 1 ? [n("div", {
    staticClass: "item",
    on: {
      click: t.useTempInCurrentDoc
    }
  }, [t._v("应用到当前设计稿")]), n("div", {
    staticClass: "item",
    on: {
      click: function (e) {
        return t.copyNewDoc();
      }
    }
  }, [t._v("新建设计稿")]), n("div", {
    staticClass: "item",
    on: {
      click: function (e) {
        return t.openFile();
      }
    }
  }, [t._v("编辑模板源文件")]), n("div", {
    staticClass: "item",
    on: {
      click: function (e) {
        return t.renameFile();
      }
    }
  }, [t._v("重命名")]), n("hr", {
    staticClass: "line"
  })] : t._e(), t.select.length > 1 ? n("div", {
    staticClass: "item-tips"
  }, [n("p", [t._v("选择了" + t._s(t.select.length) + "个文件")])]) : t._e(), n("div", {
    staticClass: "item",
    on: {
      click: function (e) {
        return t.moveToFolder();
      }
    }
  }, [t._v("移动到文件夹")]), n("div", {
    staticClass: "item",
    on: {
      click: function (e) {
        return t.addToFolder();
      }
    }
  }, [t._v("添加到文件夹")]), t.select.length == 1 ? n("div", {
    staticClass: "item",
    on: {
      click: function (e) {
        return t.openFileFolder();
      }
    }
  }, [t._v("打开所在目录")]) : t._e(), t.select.length == 1 ? n("hr", {
    staticClass: "line"
  }) : t._e(), n("div", {
    staticClass: "app-padding",
    on: {
      click: function (t) {
        t.stopPropagation();
      }
    }
  }, [n("div", {
    staticClass: "div-input"
  }, [n("Myvuescroll", {
    staticClass: "find-main f-base"
  }, t._l(t.tags, function (e, a) {
    return n("TagsButton", {
      key: "mb-menuDropDown" + a,
      attrs: {
        type: "remove"
      },
      on: {
        remove: function (n) {
          return t.removeTags(e);
        }
      }
    }, [t._v(" " + t._s(e) + " ")]);
  }), 1), n("input", {
    staticClass: "tag-input",
    attrs: {
      placeholder: "添加标签…"
    },
    on: {
      click: function (e) {
        return t.showTags();
      }
    }
  })], 1)]), n("hr", {
    staticClass: "line"
  }), n("div", {
    staticClass: "f-baseX item score-item",
    on: {
      click: function (t) {
        t.stopPropagation();
      }
    }
  }, [n("span", {
    staticClass: "score-text"
  }, [t._v("评分")]), n("Score", {
    attrs: {
      num: 5,
      select: t.score
    },
    on: {
      select: function (e) {
        return t.setScore(e);
      }
    }
  })], 1), n("hr", {
    staticClass: "line"
  }), n("div", {
    staticClass: "item",
    on: {
      click: function (e) {
        return t.updataPreview();
      }
    }
  }, [t._v("更新/修正预览图")]), n("div", {
    staticClass: "item",
    on: {
      click: function (e) {
        return t.deleteFile();
      }
    }
  }, [t._v("移入回收站")])], 2)]);
}
```