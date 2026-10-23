# other-filters

> 来源：`app/56d7.js`　大小：1.0KB
> 特征：props / data / methods

## 子组件

`FilterPopover`

## props（6）

`selectedNum`、`scoreOptions`、`timeOptions`、`time`、`scores`、`tags`

## methods（4）

`filterTime`、`filterScore`、`filterTag`、`toggleFilterManageVisible`

## 源码

```js
{
  name: "other-filters",
  components: {
    FilterPopover: lh
  },
  props: {
    selectedNum: {
      type: Number,
      default: 0
    },
    scoreOptions: {
      type: Array,
      required: true
    },
    timeOptions: {
      type: Array,
      required: true
    },
    time: {
      type: Array,
      required: true
    },
    scores: {
      type: Array,
      required: true
    },
    tags: {
      type: Array,
      required: true
    }
  },
  data: function () {
    return {
      isShowFilterManage: false
    };
  },
  computed: Object(P.a)({}, Object(mu.d)({
    tagsData: function (t) {
      return t.templateCenter.labelClassifyData;
    }
  })),
  methods: {
    filterTime: function (t) {
      this.$emit("filterTime", t);
    },
    filterScore: function (t) {
      this.$emit("filterScore", t);
    },
    filterTag: function (t) {
      console.log(t, "val");
      this.$emit("filterTag", t);
    },
    toggleFilterManageVisible: function () {
      this.isShowFilterManage = true;
      this.$emit("visibleChange", true);
    }
  }
}
```