# font-manage-footer

> 来源：`app/56d7.js`　大小：1.0KB
> 特征：props / data / methods

## 子组件

`PreviewText`、`PreviewSetting`

## props（2）

`previewText`、`previewMode`

## methods（5）

`useText`、`setPreviewText`、`setPreviewMode`、`togglePreviewTextPanel`、`closePreviewTextPanel`

## 源码

```js
{
  name: "font-manage-footer",
  components: {
    PreviewText: Qx,
    PreviewSetting: ik
  },
  props: {
    previewText: {
      type: String,
      required: true
    },
    previewMode: {
      type: String,
      required: true
    }
  },
  data: function () {
    return {
      show: false
    };
  },
  created: function () {
    var t = this;
    $y = function (e) {
      return t.closePreviewTextPanel(e);
    };
    window.addEventListener("click", $y);
  },
  beforeDestroy: function () {
    window.removeEventListener("click", $y);
  },
  methods: {
    useText: function (t) {
      this.$emit("use-text", t);
    },
    setPreviewText: function (t) {
      this.$emit("set-preview-text", t);
    },
    setPreviewMode: function (t) {
      this.$emit("set-preview-mode", t);
    },
    togglePreviewTextPanel: function () {
      this.show = !this.show;
    },
    closePreviewTextPanel: function (t) {
      var e = this.$refs["preview-text"];
      if (e && !e.$el.contains(t.target)) {
        this.show = false;
      }
    }
  }
}
```