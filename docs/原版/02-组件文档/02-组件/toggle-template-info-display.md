# toggle-template-info-display

> 来源：`app/56d7.js`　大小：0.5KB
> 特征：props / data / methods

## 子组件

`GDropdown`、`GMenu`、`GMenuItem`、`Icon`、`GCheckbox`

## props（2）

`showName`、`showSize`

## methods（2）

`toggleNameShow`、`togglePsdSizeShow`

## 源码

```js
{
  name: "toggle-template-info-display",
  components: {
    GDropdown: ii.a,
    GMenu: ai.a,
    GMenuItem: ai.a.Item,
    Icon: ie.a,
    GCheckbox: cu.a
  },
  props: {
    showName: {
      type: Boolean,
      default: true
    },
    showSize: {
      type: Boolean
    }
  },
  data: function () {
    return {};
  },
  methods: {
    toggleNameShow: function () {
      this.$emit("toggleNameShow");
    },
    togglePsdSizeShow: function () {
      this.$emit("togglePsdSizeShow");
    }
  }
}
```