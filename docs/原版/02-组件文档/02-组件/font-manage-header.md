# font-manage-header

> 来源：`app/56d7.js`　大小：0.6KB
> 特征：props / methods

## 子组件

`Icon`、`Search`、`FilterPreview`

## props（4）

`searchText`、`tagFilters`、`count`、`noFilter`

## methods（3）

`filterByText`、`removeTagFilter`、`toggleFilterPanel`

## 源码

```js
{
  name: "font-manage-header",
  components: {
    Icon: Jt.a,
    Search: nb,
    FilterPreview: kb
  },
  props: {
    searchText: {
      type: String,
      require: true
    },
    tagFilters: {
      type: Array,
      required: true
    },
    count: {
      type: Number,
      required: true
    },
    noFilter: {
      type: Boolean,
      required: true
    }
  },
  methods: {
    filterByText: function (t) {
      this.$emit("filter-by-text", t);
    },
    removeTagFilter: function (t) {
      this.$emit("remove-tag-filter", t);
    },
    toggleFilterPanel: function (t) {
      this.$emit("toggle-filter-panel", t);
    }
  }
}
```