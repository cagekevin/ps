# category-filter

> 来源：`app/56d7.js`　大小：1.0KB
> 特征：props / data / methods

## 子组件

`SelectButton`、`IconFont`

## props（3）

`categoryOptions`、`filter_id`、`disabled`

## computed（2）

`moreTipShow`、`categoryOptionsForShow`

## methods（2）

`toggleMore`、`filter`

## 源码

```js
{
  name: "category-filter",
  components: {
    SelectButton: Oi,
    IconFont: ie.a
  },
  props: {
    categoryOptions: {
      type: Array,
      default: function () {
        return [];
      }
    },
    filter_id: {
      type: String | Number,
      required: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    moreTipShow: function () {
      return this.categoryOptions.length > 6;
    },
    categoryOptionsForShow: function () {
      if (!this.moreShow && this.categoryOptions.length > 6) {
        return this.categoryOptions.slice(0, 6);
      } else {
        return this.categoryOptions;
      }
    }
  },
  data: function () {
    return {
      moreShow: false
    };
  },
  methods: {
    toggleMore: function () {
      if (!this.disabled) {
        this.moreShow = !this.moreShow;
        this.$emit("categoreFilterMoreChange");
      }
    },
    filter: function (t) {
      this.$emit("filter", t);
    }
  }
}
```