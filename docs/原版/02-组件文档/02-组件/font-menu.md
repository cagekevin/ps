# font-menu

> 来源：`app/56d7.js`　大小：0.6KB
> 特征：methods

## 子组件

`Icon`

## methods（6）

`importFont`、`exportFont`、`disclaimer`、`setOptionType`、`closeMenu`、`setTimeout`

## 源码

```js
{
  name: "font-menu",
  components: {
    Icon: Jt.a
  },
  methods: {
    importFont: function () {
      this.setOptionType(bg.Import);
      this.closeMenu();
    },
    exportFont: function () {
      this.setOptionType(bg.Export);
      this.closeMenu();
    },
    disclaimer: function () {
      this.setOptionType(bg.Disclaimer);
      this.closeMenu();
    },
    setOptionType: function (t) {
      this.$emit("set-option-type", t);
    },
    closeMenu: function () {
      var t = this;
      setTimeout(function () {
        return t.$emit("close-menu");
      }, 20);
    }
  }
}
```