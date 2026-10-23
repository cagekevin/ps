# long-preview · 方法实现

> 来源：`long-preview.js`
> 方法数：6

## `setPreviewUrl`


```js
function () {
      if (this.noOss) {
        this.previewUrl = this.preview.url;
        this.doublePreviewUrl = `${this.preview.url} 2x`;
      } else {
        var t = {
          width: this.previewWidth * 2,
          useDpr: false
        };
        var e = {
          width: this.previewWidth,
          useDpr: false
        };
        var n = this.setOssUrl(t, e);
        var a = n.previewUrl;
        var i = n.doublePreviewUrl;
        this.previewUrl = a;
        this.doublePreviewUrl = i;
      }
      this.$unwatch();
    }
```

## `setOssUrl`

参数：`t, e`

```js
function (t, e) {
      var n = this.preview.url;
      var a = {
        allowJPGOnUnsupportedWebp: true
      };
      var i = Object(v.e)(n, Object(P.a)(Object(P.a)({}, t), a));
      var r = Object(v.e)(n, Object(P.a)(Object(P.a)({}, e), a)) + " 2x";
      return {
        previewUrl: i,
        doublePreviewUrl: r
      };
    }
```

## `mouseenter`


```js
function () {
      var t = this;
      clearTimeout(this.timmer);
      this.timmer = setTimeout(function () {
        t.hover = true;
      }, 100);
    }
```

## `mouseleave`


```js
function () {
      clearTimeout(this.timmer);
      this.hover = false;
    }
```

## `mousemove`

参数：`t`

```js
function (t) {
      if (!(t.offsetX < vr) && !(t.offsetX > this.$el.offsetWidth - vr)) {
        this.progress = (t.offsetX - vr) / (this.$el.offsetWidth - vr * 2) * 100;
      }
    }
```

## `setTimeout`

参数：`function (`

```js
setTimeout(function () {
        t.hover = true;
      }
```
