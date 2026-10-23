# Template · 方法实现

> 来源：`Template_2.js`
> 方法数：6

## `closePreview`


```js
function () {
      this.$store.commit("setPreviewInfo", null);
    }
```

## `setSwitchIndex`

参数：`t`

```js
function (t) {
      this.switchIndex = t;
      Yf[t].hasInited ||= true;
      this.setPageViewTracker(t);
      this.$bp.add("sc_00" + t);
    }
```

## `setPageViewTracker`

参数：`t`

```js
function (t) {
      var e = ["element", "picture", "icon"][t] || "element";
      Rt.a.pageView({
        page: `pszhuli-cep-main/material/${e}`
      });
    }
```

## `dropOpen`


```js
function () {
      if (!this.disableOtherActionsWhenDownloading) {
        this.$refs.templateCenterMenu.open();
      }
    }
```

## `reloadTemplateCenter`


```js
function () {
      if (this.$refs.materialCenter && this.$refs.materialCenter.length) {
        var t = this.$refs.materialCenter.find(function (t) {
          return t.visible;
        });
        if (t !== null && t !== undefined) {
          t.$emit("reloadList");
        }
      }
    }
```

## `hf`

参数：`function (t`

```js
hf(function (t) {
      if (this.scrollTop >= t.scrollTop && t.scrollTop < 5) {
        this.collapse = false;
      } else {
        this.collapse = true;
      }
      this.scrollTop = t.scrollTop;
    }
```
