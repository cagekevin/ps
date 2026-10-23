# 模板 · member

> 来源：`56d7.js` render 函数 `rT`（行 54378）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="tips f-center" @click>
  <div class="card" @click>
    <p>
      快捷键设置方式
    </p>
    <div class="w100 f-center mt15">
      <button class="button f-center cursor button-help" @click>
        查看教程
      </button>
      <button class="button f-center cursor mr0" @click>
        知道了
      </button>
    </div>
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
    staticClass: "tips f-center",
    on: {
      click: t.close
    }
  }, [n("div", {
    staticClass: "card",
    on: {
      click: function (t) {
        t.stopPropagation();
      }
    }
  }, [n("p", [t._v("快捷键设置方式")]), t._m(0), n("div", {
    staticClass: "w100 f-center mt15"
  }, [n("button", {
    staticClass: "button f-center cursor button-help",
    on: {
      click: function (e) {
        return t.help();
      }
    }
  }, [t._v("查看教程")]), n("button", {
    staticClass: "button f-center cursor mr0",
    on: {
      click: t.close
    }
  }, [t._v("知道了")])])])]);
}
```