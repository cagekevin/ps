# user-font-page-dialog

> 来源：`app/56d7.js`　大小：0.6KB
> 特征：props / data / methods

## 子组件

`CepModal`、`GInput`

## props（1）

`type`

## computed（1）

`context`

## methods（2）

`confirm`、`cancel`

## 源码

```js
{
  name: "user-font-page-dialog",
  components: {
    CepModal: Yt,
    GInput: Qg.a
  },
  props: {
    type: {
      type: String
    }
  },
  data: function () {
    return {
      inputVal: ""
    };
  },
  computed: {
    context: function () {
      switch (this.type) {
        case "remove":
          return iC;
        case "rename":
          return rC;
        default:
          return null;
      }
    }
  },
  methods: {
    confirm: function () {
      this.$emit(`confirm-${this.type}`, {
        value: this.inputVal
      });
    },
    cancel: function () {
      this.$emit(`cancel-${this.type}`);
    }
  }
}
```