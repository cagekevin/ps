# font-manage-filter-preview

> 来源：`app/56d7.js`　大小：0.6KB
> 特征：props / methods

## 子组件

`Icon`、`TagGroup`、`Badge`

## props（2）

`tags`、`count`

## methods（2）

`closeTag`、`toggleFilterPanel`

## 源码

```js
{
  name: "font-manage-filter-preview",
  components: {
    Icon: Jt.a,
    TagGroup: bb,
    Badge: rb.a
  },
  props: {
    tags: {
      type: Array,
      required: true
    },
    count: {
      type: Number,
      default: 0
    }
  },
  methods: {
    closeTag: function (t) {
      this.$emit("remove-tag-filter", t);
    },
    toggleFilterPanel: function () {
      var t = this.$refs["filter-preview-header"].getBoundingClientRect();
      var e = t.bottom;
      this.$emit("toggle-filter-panel", {
        right: 8,
        top: e + 5
      });
    }
  }
}
```