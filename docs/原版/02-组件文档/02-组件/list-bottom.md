# list-bottom

> 来源：`app/56d7.js`　大小：0.7KB
> 特征：props / methods

## 子组件

`Icon`、`Dropdown`、`Menu`、`MenuItem`、`ZoomInOut`

## props（4）

`sortOptions`、`columns`、`sort`、`disabled`

## methods（2）

`handleSort`、`handleColumnChange`

## 源码

```js
{
  name: "list-bottom",
  components: {
    Icon: ie.a,
    Dropdown: ii.a,
    Menu: ai.a,
    MenuItem: ai.a.Item,
    ZoomInOut: pi
  },
  props: {
    sortOptions: {
      type: Array,
      default: function () {
        return [];
      }
    },
    columns: {
      type: Number,
      required: true
    },
    sort: {
      type: String,
      required: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    handleSort: function (t) {
      if (!this.disabled) {
        this.$emit("handleSort", t);
      }
    },
    handleColumnChange: function (t) {
      if (!this.disabled) {
        this.$emit("handleColumnChange", t);
      }
    }
  }
}
```