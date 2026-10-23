# font-manage-layouts-tabs · 方法实现

> 来源：`font-manage-layouts-tabs.js`
> 方法数：4

## `changeTab`

参数：`t`

```js
function (t) {
      var e = !(arguments.length > 1) || arguments[1] === undefined || arguments[1];
      var n = this.tabs[t] || {
        id: "",
        content: null,
        others: {}
      };
      var a = n.id;
      n.tab;
      var i = n.content;
      var r = Object(Vn.a)(n, hg);
      this.current = a;
      this.content = i;
      this.others = r;
      if (e) {
        this.$emit("change-tab", this.current);
      }
    }
```

## `closeMenu`


```js
function () {
      this.toggleMenu();
    }
```

## `closeMenuOutside`

参数：`t`

```js
function (t) {
      if (this.open) {
        var e = this.$refs["tab-menu"];
        if (e && !e.contains(t.target)) {
          this.toggleMenu();
        }
      }
    }
```

## `toggleMenu`


```js
function () {
      this.open = !this.open;
      this.$emit("toggle-menu", this.open);
    }
```
