# font-manage-list

> 来源：`app/56d7.js`　大小：2.9KB
> 特征：props / data / methods

## 子组件

`ListItem`、`FontWeight`、`Preview`

## props（7）

`fonts`、`groups`、`ratings`、`previewText`、`previewMode`、`commercials`、`languages`

## computed（2）

`classes`、`noPreview`

## methods（7）

`getPreviewFontFamily`、`selectFont`、`makeTag`、`rating`、`selectFontWeight`、`getContainerWidth`、`observing`

## 源码

```js
{
  name: "font-manage-list",
  components: {
    ListItem: gx,
    FontWeight: Cx,
    Preview: Fx
  },
  props: {
    fonts: {
      type: Array,
      required: true
    },
    groups: {
      type: Object,
      default: function () {
        return {};
      }
    },
    ratings: {
      type: Object,
      default: function () {
        return {};
      }
    },
    previewText: {
      type: String,
      default: ""
    },
    previewMode: {
      type: String,
      required: true
    },
    commercials: {
      type: Object,
      required: true
    },
    languages: {
      type: Object,
      required: true
    }
  },
  data: function () {
    return {
      width: 1,
      selectedFont: "",
      postScriptNames: {},
      indexes: {},
      familyLang: jx
    };
  },
  computed: {
    classes: function () {
      if (this.width >= 420) {
        return "font-manage__list--double-cols";
      } else {
        return "font-manage__list--single-cols";
      }
    },
    noPreview: function () {
      return this.previewMode === xg[0].mode;
    }
  },
  created: function () {
    var t = this;
    zx = Eb(function () {
      return t.getContainerWidth();
    }, 100, false);
    window.addEventListener("resize", zx);
    Mx = new IntersectionObserver(this.observing, {
      root: null,
      threshold: 1
    });
  },
  mounted: function () {
    var t = this;
    this.$nextTick(function () {
      return t.getContainerWidth();
    });
    Mx.observe(this.$refs["page-loader"]);
  },
  beforeDestroy: function () {
    window.removeEventListener("resize", zx);
    if (Mx) {
      Mx.disconnect();
    }
  },
  methods: {
    getPreviewFontFamily: function (t, e) {
      return `"${e[t.family] || t.postScriptNames[0]}", "${t.family}"`;
    },
    selectFont: function (t) {
      this.selectedFont = t.family;
      var e = this.indexes[t.family] || 0;
      this.$emit("select-font", {
        family: t.family,
        postScriptName: t.postScriptNames[e],
        name: t.names[e],
        weight: t.weights[e]
      });
    },
    makeTag: function (t) {
      this.$emit("tag-to-font", t);
    },
    rating: function (t, e) {
      this.$emit("rating-to-font", t, e);
    },
    selectFontWeight: function (t, e) {
      this.$set(this.postScriptNames, e.family, e.postScriptNames[t]);
      this.$set(this.indexes, e.family, t);
      this.selectedFont = e.family;
      this.$emit("select-font", {
        family: e.family,
        postScriptName: e.postScriptNames[t],
        name: e.names[t],
        weight: e.weights[t]
      });
    },
    getContainerWidth: function () {
      var t = this.$refs["font-list"].getBoundingClientRect();
      var e = t.width;
      this.width = e;
    },
    observing: function (t) {
      var e = Object(h.a)(t, 1);
      var n = e[0];
      var a = document.body.clientHeight;
      if (n.isIntersecting || a > n.boundingClientRect.bottom) {
        this.$emit("load-more");
      }
    }
  }
}
```