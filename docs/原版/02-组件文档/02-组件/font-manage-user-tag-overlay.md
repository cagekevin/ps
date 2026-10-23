# font-manage-user-tag-overlay

> 来源：`app/56d7.js`　大小：0.3KB
> 特征：props / methods

## props（1）

`closeOverlay`

## methods（2）

`remove`、`rename`

## 源码

```js
{
  name: "font-manage-user-tag-overlay",
  props: {
    closeOverlay: {
      type: Function,
      default: function () {}
    }
  },
  methods: {
    remove: function () {
      this.$emit("remove-tag");
      this.closeOverlay();
    },
    rename: function () {
      this.$emit("rename-tag");
      this.closeOverlay();
    }
  }
}
```