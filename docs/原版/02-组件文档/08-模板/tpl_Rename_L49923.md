# 模板 · Rename

> 来源：`56d7.js` render 函数 `KS`（行 49923）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="overprint-add-wrap f-center">
  <div class="card">
    <p>
      导入变量数据
    </p>
    <textarea class="textarea mt15" @mousewheel v-model="strData" />
    <div class="f-center mt15">
      <button class="add-button data" @click>
        解析数据
      </button>
      <button class="add-button close mr0" @click>
        取消
      </button>
    </div>
  </div>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
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
    staticClass: "overprint-add-wrap f-center"
  }, [n("div", {
    staticClass: "card"
  }, [n("p", [t._v("导入变量数据")]), n("textarea", {
    directives: [{
      name: "model",
      rawName: "v-model",
      value: t.strData,
      expression: "strData"
    }],
    staticClass: "textarea mt15",
    attrs: {
      placeholder: "复制表格数据到此"
    },
    domProps: {
      value: t.strData
    },
    on: {
      mousewheel: function (t) {
        t.stopPropagation();
      },
      input: function (e) {
        if (!e.target.composing) {
          t.strData = e.target.value;
        }
      }
    }
  }), n("div", {
    staticClass: "f-center mt15"
  }, [n("button", {
    staticClass: "add-button data",
    on: {
      click: t.analysis
    }
  }, [t._v("解析数据")]), n("button", {
    staticClass: "add-button close mr0",
    on: {
      click: t.close
    }
  }, [t._v("取消")])])])]);
}
```