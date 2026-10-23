# anon_03c3_L39

> 来源：`app/03c3.js`　大小：0.2KB
> 特征：props / methods

## props（1）

`name`

## methods（2）

`clickHandle`、`menu`

## 源码

```js
{
  props: {
    name: String
  },
  methods: {
    clickHandle: function (t) {
      this.$emit("handle", t);
    },
    menu: function (t) {
      this.$emit("menu", t);
    }
  }
}
```