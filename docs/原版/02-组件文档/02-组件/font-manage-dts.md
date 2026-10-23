# font-manage-dts

> 来源：`app/56d7.js`　大小：0.6KB
> 特征：props / data / methods

## 子组件

`CepModal`

## props（1）

`operateType`

## computed（3）

`showModal`、`title`、`tip`

## methods（2）

`confirm`、`cancel`

## 文案（1）

继续

## 源码

```js
{
  name: "font-manage-dts",
  components: {
    CepModal: Yt
  },
  props: {
    operateType: {
      type: String,
      required: true
    }
  },
  data: function () {
    return {
      okText: "继续"
    };
  },
  computed: {
    showModal: function () {
      return this.operateType === bg.Import || this.operateType === bg.Export;
    },
    title: function () {
      return yg[this.operateType];
    },
    tip: function () {
      return wg[this.operateType];
    }
  },
  methods: {
    confirm: function () {
      this.$emit("confirm");
    },
    cancel: function () {
      this.$emit("cancel");
    }
  }
}
```