# font-manage-search

> 来源：`app/56d7.js`　大小：0.5KB
> 特征：props / data / methods

## 子组件

`Input`、`Icon`

## props（1）

`defaultText`

## methods（2）

`search`、`clearText`

## 源码

```js
{
  name: "font-manage-search",
  components: {
    Input: Qg.a,
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
  methods: {
    search: function () {
      this.$emit("search", this.text);
    },
    clearText: function () {
      this.text = "";
      this.$emit("search", this.text);
    }
  }
}
```