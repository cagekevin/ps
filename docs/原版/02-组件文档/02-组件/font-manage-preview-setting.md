# font-manage-preview-setting

> 来源：`app/56d7.js`　大小：1.0KB
> 特征：props / data / methods

## 子组件

`Icon`

## props（1）

`previewMode`

## methods（4）

`closeOutSide`、`togglePreviewSetting`、`selectPreviewMode`、`togglePreviewText`

## 源码

```js
{
  name: "font-manage-preview-setting",
  components: {
    Icon: Jt.a
  },
  props: {
    previewMode: {
      type: String,
      required: true
    }
  },
  data: function () {
    return {
      showPreviewSetting: false,
      previewModes: xg
    };
  },
  created: function () {
    var t = this;
    Vy = function (e) {
      return t.closeOutSide(e);
    };
    window.addEventListener("click", Vy);
  },
  beforeDestroy: function () {
    window.removeEventListener("click", Vy);
  },
  methods: {
    closeOutSide: function (t) {
      if (this.showPreviewSetting) {
        var e = this.$refs["preview-setting"];
        if (e && !e.contains(t.target)) {
          this.togglePreviewSetting();
        }
      }
    },
    togglePreviewSetting: function () {
      this.showPreviewSetting = !this.showPreviewSetting;
    },
    selectPreviewMode: function (t) {
      this.$emit("set-preview-mode", t.mode);
    },
    togglePreviewText: function () {
      this.$emit("toggle-preview-text-panel");
    }
  }
}
```