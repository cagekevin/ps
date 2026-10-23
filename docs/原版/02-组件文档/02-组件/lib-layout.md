# lib-layout

> 来源：`app/56d7.js`　大小：0.3KB
> 特征：props / methods

## 子组件

`Icon`

## props（2）

`menuActive`、`disabled`

## methods（1）

`dropOpen`

## 源码

```js
{
  name: "lib-layout",
  props: {
    menuActive: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  components: {
    Icon: ie.a
  },
  methods: {
    dropOpen: function () {
      if (!this.disabled) {
        this.$emit("dropOpen");
      }
    }
  }
}
```