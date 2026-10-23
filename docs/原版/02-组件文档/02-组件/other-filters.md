# other-filters

> 来源：`app/56d7.js`　大小：0.8KB
> 特征：props / data / methods

## 子组件

`FilterPopover`、`SelectButton`

## props（4）

`colorOptions`、`formatOptions`、`ratios`、`colors`

## computed（1）

`selectedNum`

## methods（2）

`filterColor`、`filterFormat`

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
    formatOptions: {
      type: Array,
      default: function () {
        return [];
      }
    },
    ratios: {
      type: String,
      required: true
    },
    colors: {
      type: String | Number,
      required: true
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
    },
    filterFormat: function (t) {
      this.$emit("filterFormat", t);
    }
  }
}
```