# font-manage-preview-text

> 来源：`app/56d7.js`　大小：0.7KB
> 特征：props / data / methods

## 子组件

`Input`、`Button`、`Icon`

## props（1）

`defaultText`

## methods（3）

`onkeydown`、`useText`、`previewText`

## 源码

```js
{
  name: "font-manage-preview-text",
  components: {
    Input: Qg.a,
    Button: Xx.a,
    Icon: Jt.a
  },
  props: {
    defaultText: {
      type: String,
      default: ""
    }
  },
  data: function () {
    return {
      text: ""
    };
  },
  created: function () {
    this.text = this.defaultText;
  },
  watch: {
    defaultText: function (t) {
      this.text = t;
    }
  },
  methods: {
    onkeydown: function (t) {
      if (t.key === "Enter" || t.code === "Enter") {
        this.useText();
      }
    },
    useText: function () {
      if (this.text) {
        this.$emit("use-text", this.text);
      }
    },
    previewText: function () {
      this.$emit("set-preview-text", this.text);
    }
  }
}
```