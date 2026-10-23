# other-filters

> 来源：`app/56d7.js`　大小：0.6KB
> 特征：props / data / methods

## 子组件

`FilterPopover`、`SelectButton`

## props（3）

`colorOptions`、`colors`、`disabled`

## computed（1）

`selectedNum`

## methods（1）

`filterColor`

## 源码

```js
{
  name: "other-filters",
  components: {
    FilterPopover: Ps,
    SelectButton: Oi
  },
  props: {
    colorOptions: {
      type: Array,
      default: function () {
        return [];
      }
    },
    colors: {
      type: String | Number,
      required: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data: function () {
    return {};
  },
  computed: {
    selectedNum: function () {
      var t = 0;
      if (this.colors) {
        t++;
      }
      if (this.ratios) {
        t++;
      }
      return t;
    }
  },
  methods: {
    filterColor: function (t) {
      this.$emit("filterColor", t);
    }
  }
}
```