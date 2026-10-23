# wide-preview

> 来源：`app/56d7.js`　大小：4.0KB
> 特征：props / data / methods

## 子组件

`LazyImage`

## props（2）

`template`、`lazy`

## computed（12）

`currentPage`、`progressStyle`、`url`、`doubleUrl`、`previewWidth`、`previewHeight`、`aspectRatio`、`imgAspectRatio`、`preview`、`style`、`templateCount`、`noOss`

## methods（5）

`setPreviewUrl`、`setOssUrl`、`mouseenter`、`mouseleave`、`mousemove`

## 源码

```js
{
  name: "wide-preview",
  components: {
    LazyImage: or.a
  },
  props: {
    template: {
      type: Object,
      required: true,
      validator: function (t) {
        return t && t.preview;
      }
    },
    lazy: {
      type: Boolean,
      default: true
    }
  },
  data: function () {
    return {
      hover: false,
      previewLoad: false,
      previewUrl: null,
      doublePreviewUrl: null,
      progress: 0
    };
  },
  computed: {
    currentPage: function () {
      return Math.ceil(this.progress / 100 * this.templateCount) || 1;
    },
    progressStyle: function () {
      return {
        width: this.progress + "%"
      };
    },
    url: function () {
      if (this.noOss) {
        return this.preview.url;
      }
      var t = this.previewHeight * 1.5;
      var e = {
        height: t,
        useDpr: false,
        crop: {
          width: _r / 2 * 1.5,
          height: t
        },
        allowJPGOnUnsupportedWebp: true
      };
      return Object(Cr.a)(this.preview.url, e);
    },
    doubleUrl: function () {
      if (this.noOss || this.preview.width < 325) {
        return null;
      }
      var t = this.previewHeight * 2;
      var e = {
        height: t,
        useDpr: false,
        crop: {
          width: _r,
          height: t
        },
        allowJPGOnUnsupportedWebp: true
      };
      return Object(Cr.a)(this.preview.url, e) + " 2x";
    },
    previewWidth: function () {
      return this.preview.width / 2;
    },
    previewHeight: function () {
      return this.previewWidth * this.preview.height / this.preview.width;
    },
    aspectRatio: function () {
      return this.preview.height / _r;
    },
    imgAspectRatio: function () {
      return Math.max(this.aspectRatio, this.preview.height / this.preview.width);
    },
    preview: function () {
      var t = this.template.composite_preview;
      if (this.template.type !== "movie" && t && t.url && t.width && t.height) {
        return t;
      } else {
        return this.template.preview;
      }
    },
    style: function () {
      var t = -(this.currentPage - 1) / this.templateCount * 100;
      return {
        wdith: this.templateCount + "%",
        transform: `translate3D(${t}%, 0, 0)`
      };
    },
    templateCount: function () {
      var t = this.template.composite_preview;
      if (t && t.url && t.width && t.height) {
        return ~~(t.width / _r);
      } else {
        return 1;
      }
    },
    noOss: function () {
      if (!this.preview) {
        return true;
      }
      var t = this.preview.url;
      return !t || !!t.includes(".svg");
    }
  },
  mounted: function () {
    this.$unwatch = this.$watch("hover", this.setPreviewUrl);
  },
  methods: {
    setPreviewUrl: function () {
      if (this.noOss) {
        this.previewUrl = this.preview.url;
        this.doublePreviewUrl = `${this.preview.url} 2x`;
      } else {
        var t = {
          height: this.previewHeight * 2,
          useDpr: false
        };
        var e = {
          height: this.previewHeight,
          useDpr: false
        };
        var n = this.setOssUrl(t, e);
        var a = n.previewUrl;
        var i = n.doublePreviewUrl;
        this.previewUrl = a;
        this.doublePreviewUrl = i;
      }
      this.$unwatch();
    },
    setOssUrl: function (t, e) {
      var n = this.preview.url;
      var a = {
        allowJPGOnUnsupportedWebp: true
      };
      var i = Object(Cr.a)(n, Object(P.a)(Object(P.a)({}, t), a));
      var r = Object(Cr.a)(n, Object(P.a)(Object(P.a)({}, e), a)) + " 2x";
      return {
        previewUrl: i,
        doublePreviewUrl: r
      };
    },
    mouseenter: function () {
      var t = this;
      clearTimeout(this.timmer);
      this.timmer = setTimeout(function () {
        t.hover = true;
      }, 100);
    },
    mouseleave: function () {
      clearTimeout(this.timmer);
      this.hover = false;
    },
    mousemove: function (t) {
      if (!(t.offsetX < Sr) && !(t.offsetX > this.$el.offsetWidth - Sr)) {
        this.progress = (t.offsetX - Sr) / (this.$el.offsetWidth - Sr * 2) * 100;
      }
    }
  }
}
```