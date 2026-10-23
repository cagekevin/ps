# font-manage-font-creator

> 来源：`app/56d7.js`　大小：0.5KB
> 特征：data / methods

## 子组件

`Icon`、`TagInput`、`Button`

## methods（4）

`setText`、`addUserTag`、`cancel`、`requestAnimationFrame`

## 源码

```js
{
  name: "font-manage-font-creator",
  components: {
    Icon: Jt.a,
    TagInput: _k,
    Button: Xx.a
  },
  data: function () {
    return {
      text: ""
    };
  },
  methods: {
    setText: function (t) {
      this.text = t;
    },
    addUserTag: function () {
      this.$emit("add-user-tag", {
        text: this.text,
        autoClose: true
      });
    },
    cancel: function () {
      var t = this;
      this.$emit("cancel-add-user-tag");
      requestAnimationFrame(function () {
        return t.text = "";
      });
    }
  }
}
```