# activate-modal

> 来源：`app/56d7.js`　大小：1.1KB
> 特征：props / data / methods

## 子组件

`CepModal`、`GInput`

## props（4）

`show`、`title`、`err`、`confirmLoading`

## methods（3）

`ok`、`cancel`、`close`

## 文案（2）

请输入名字 · 激活码不能为空

## 源码

```js
{
  name: "activate-modal",
  components: {
    CepModal: Yt,
    GInput: $a.a
  },
  props: {
    show: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: "请输入名字"
    },
    err: {
      type: String,
      default: ""
    },
    confirmLoading: {
      type: Boolean,
      default: false
    }
  },
  data: function () {
    return {
      value: "",
      showErr: ""
    };
  },
  methods: {
    ok: function () {
      var t = this.value.replace(/\s*/g, "");
      if (t != "") {
        this.$emit("ok", this.value);
      } else {
        this.showErr = "激活码不能为空";
      }
    },
    cancel: function () {
      this.close();
      this.$emit("cancel");
    },
    close: function () {
      this.err = "";
      this.value = "";
      this.$emit("close");
    }
  },
  watch: {
    show: function () {
      var t = this;
      if (this.show === true) {
        this.value = "";
        this.showErr = "";
        setTimeout(function () {
          t.$refs.inputbox.focus();
        }, 100);
      }
    },
    err: function () {
      this.showErr = this.err;
    }
  }
}
```