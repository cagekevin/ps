# font-manage-filter-panel

> 来源：`app/56d7.js`　大小：0.4KB
> 特征：props / methods

## 子组件

`Tag`、`TagGroup`

## props（1）

`tagCategories`

## methods（2）

`toggleTagFilter`、`cleanCategoryFilter`

## 源码

```js
{
  name: "font-manage-filter-panel",
  components: {
    Tag: fb,
    TagGroup: bb
  },
  props: {
    tagCategories: {
      type: Object,
      required: true
    }
  },
  methods: {
    toggleTagFilter: function (t) {
      this.$emit("toggle-tag-filter", t);
    },
    cleanCategoryFilter: function (t) {
      this.$emit("clean-category-filter", t);
    }
  }
}
```