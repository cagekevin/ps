# font-manage-list-font-weight

> 来源：`app/56d7.js`　大小：1.0KB
> 特征：props / data / methods

## 子组件

`Icon`

## props（4）

`family`、`weights`、`postScriptNames`、`language`

## computed（2）

`fontFamilies`、`previewText`

## methods（2）

`toggle`、`selectFontWeight`

## 文案（1）

永

## 源码

```js
{
  name: "font-manage-list-font-weight",
  components: {
    Icon: Jt.a
  },
  props: {
    family: {
      type: String,
      required: true
    },
    weights: {
      type: Array,
      required: true
    },
    postScriptNames: {
      type: Array,
      required: true
    },
    language: {
      type: String,
      default: ""
    }
  },
  data: function () {
    return {
      current: 0,
      open: false
    };
  },
  computed: {
    fontFamilies: function () {
      if (this.postScriptNames && this.postScriptNames.length > 1) {
        return this.postScriptNames.slice(0, 7);
      } else {
        return [];
      }
    },
    previewText: function () {
      if (this.language === "en") {
        return "A";
      } else {
        return "永";
      }
    }
  },
  methods: {
    toggle: function () {
      this.open = !this.open;
    },
    selectFontWeight: function (t) {
      this.current = t;
      this.$emit("select-font-weight", t);
    }
  }
}
```