# long-preview

> 来源：`app/56d7.js`　大小：3.9KB
> 特征：props / data / methods

## 子组件

`LazyImage`

## props（5）

`maxRatio`、`minRatio`、`setRatio`、`template`、`lazy`

## computed（9）

`progressStyle`、`url`、`doubleUrl`、`previewWidth`、`aspectRatio`、`imgAspectRatio`、`preview`、`style`、`noOss`

## methods（5）

`setPreviewUrl`、`setOssUrl`、`mouseenter`、`mouseleave`、`mousemove`

## 源码

```js
{
  name: "long-preview",
  components: {
    LazyImage: or.a
  },
  props: {
    maxRatio: {
      type: Number,
      default: 1.91
    },
    minRatio: {
      type: Number,
      default: 0
    },
    setRatio: {
      type: Number,
      default: 0
    },
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
      progress: 0,
      hover: false,
      previewLoad: false,
      previewUrl: null,
      doublePreviewUrl: null
    };
  },
  computed: {
    progressStyle: function () {
      return {
        width: this.progress + "%"
      };
    },
    url: function () {
      if (this.noOss) {
        return this.preview.url;
      }
      var t = this.previewWidth * 1.5;
      var e = {
        width: t,
        useDpr: false
      };
      e.crop = {
        width: t,
        height: t * (this.setRatio || this.aspectRatio)
      };
      e.allowJPGOnUnsupportedWebp = true;
      return Object(v.e)(this.preview.url, e);
    },
    doubleUrl: function () {
      if (this.noOss || this.preview.width < 325) {
        return null;
      }
      var t = this.previewWidth * 2;
      var e = {
        width: t,
        useDpr: false
      };
      e.crop = {
        width: t,
        height: t * (this.setRatio || this.aspectRatio)
      };
      e.allowJPGOnUnsupportedWebp = true;
      return Object(v.e)(this.preview.url, e) + " 2x";
    },
    previewWidth: function () {
      if (this.preview.width < 325) {
        return this.preview.width;
      } else {
        return Math.min(Math.max(this.preview.width / 2, 325), mr);
      }
    },
    aspectRatio: function () {
      return Math.max(Math.min(this.preview.height / this.preview.width, this.maxRatio), this.minRatio);
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
      return {
        objectPosition: `0 ${this.progress}%`
      };
    },
    noOss: function () {
      if (!this.preview) {
        return true;
      }
      var t = this.preview.url;
      return !t || !!t.includes(".svg") || !!t.includes(".mp4");
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
    },
    setOssUrl: function (t, e) {
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
      if (!(t.offsetX < vr) && !(t.offsetX > this.$el.offsetWidth - vr)) {
        this.progress = (t.offsetX - vr) / (this.$el.offsetWidth - vr * 2) * 100;
      }
    }
  }
}
```