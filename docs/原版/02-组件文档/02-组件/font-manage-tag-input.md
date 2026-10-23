# font-manage-tag-input

> 来源：`app/56d7.js`　大小：0.8KB
> 特征：props / data / methods

## 子组件

`Icon`、`Input`、`Button`

## props（1）

`showTag`

## methods（5）

`onkeydown`、`oninput`、`clearText`、`addTag`、`requestAnimationFrame`

## 源码

```js
{
  name: "font-manage-tag-input",
  components: {
    Icon: Jt.a,
    Input: Qg.a,
    Button: Xx.a
  },
  props: {
    showTag: {
      type: Boolean,
      default: true
    }
  },
  data: function () {
    return {
      added: false,
      text: ""
    };
  },
  methods: {
    onkeydown: function (t) {
      if (t.key === "Enter" || t.code === "Enter") {
        this.$emit("add-user-tag", this.text);
      }
    },
    oninput: function () {
      this.text = this.text.slice(0, 8);
      this.added = false;
      this.$emit("set-text", this.text);
    },
    clearText: function () {
      this.text = "";
    },
    addTag: function () {
      var t = this;
      this.$emit("add-user-tag", this.text);
      requestAnimationFrame(function () {
        return t.added = true;
      });
    }
  }
}
```