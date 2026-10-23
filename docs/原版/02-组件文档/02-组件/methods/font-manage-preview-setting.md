# font-manage-preview-setting · 方法实现

> 来源：`font-manage-preview-setting.js`
> 方法数：4

## `closeOutSide`

参数：`t`

```js
function (t) {
      if (this.showPreviewSetting) {
        var e = this.$refs["preview-setting"];
        if (e && !e.contains(t.target)) {
          this.togglePreviewSetting();
        }
      }
    }
```

## `togglePreviewSetting`


```js
function () {
      this.showPreviewSetting = !this.showPreviewSetting;
    }
```

## `selectPreviewMode`

参数：`t`

```js
function (t) {
      this.$emit("set-preview-mode", t.mode);
    }
```

## `togglePreviewText`


```js
function () {
      this.$emit("toggle-preview-text-panel");
    }
```
