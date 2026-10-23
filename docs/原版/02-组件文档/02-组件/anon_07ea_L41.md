# anon_07ea_L41

> 来源：`app/07ea.js`　大小：0.2KB
> 特征：props / methods

## props（1）

`value`

## methods（1）

`clickHandle`

## 源码

```js
{
  props: {
    value: {
      type: Boolean,
      default: true
    }
  },
  methods: {
    clickHandle: function () {
      this.$emit("input", !this.value);
      this.$emit("change", !this.value);
    }
  }
}
```