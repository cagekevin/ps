# confirm-pay-modal

> 来源：`app/56d7.js`　大小：0.4KB
> 特征：props / data / methods

## 子组件

`CepModal`

## props（2）

`visible`、`confirmLoading`

## methods（2）

`ok`、`close`

## 源码

```js
{
  name: "confirm-pay-modal",
  components: {
    CepModal: Yt
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    confirmLoading: {
      type: Boolean,
      default: false
    }
  },
  data: function () {
    return {};
  },
  methods: {
    ok: function () {
      this.$emit("ok");
    },
    close: function () {
      this.$emit("close");
    }
  }
}
```