# download-list

> 来源：`app/56d7.js`　大小：4.3KB
> 特征：props / data / methods

## 子组件

`Waterfall`、`MaterialPreview`、`Icon`、`TemplateRightKeyMenu`

## props（5）

`rows`、`materials`、`columns`、`columnsOffset`、`responsiveWidth`

## computed（2）

`innerColumns`、`setRatio`

## methods（7）

`openContent`、`showRightkeyMenu`、`getItemSize`、`isWideImage`、`update`、`expose`、`setTimeout`

## 文案（1）

应用

## 源码

```js
{
  name: "download-list",
  components: {
    Waterfall: nr.a,
    MaterialPreview: Ur,
    Icon: ie.a,
    TemplateRightKeyMenu: Kr
  },
  props: {
    rows: {
      type: Number
    },
    materials: {
      type: Array,
      required: true
    },
    columns: {
      type: Number,
      default: 2
    },
    columnsOffset: {
      type: Number,
      default: 1
    },
    responsiveWidth: {
      type: Number,
      default: 1200
    }
  },
  data: function () {
    return {
      MATERIAL_MARGIN: Zr,
      MATERIAL_MARGIN_VERTICAL: ts,
      clientWidth: 0,
      observedEl: null,
      materialDetailVisible: false,
      activeIndex: -1,
      currentMaterialElem: null,
      innerLoading: false,
      showFileMenu: false,
      selectTemItem: {},
      fileMenuX: 0,
      fileMenuY: 0,
      opacity: 0
    };
  },
  mounted: function () {
    this.update();
  },
  computed: {
    innerColumns: function () {
      if (this.clientWidth >= this.responsiveWidth) {
        return this.columns + this.columnsOffset;
      } else {
        return this.columns;
      }
    },
    setRatio: function () {
      var t = this.materials.filter(function (t) {
        return t.type === "h5_bargraph";
      });
      var e = this.materials.filter(function (t) {
        return t.type === "web_page";
      });
      var n = Object(ct.a)(new Set(this.materials.map(function (t) {
        return t.type;
      }))).length === 2 && t.length && e.length;
      var a = 0;
      if (n) {
        var i = e[0];
        var r = i.preview;
        var s = 1;
        if (i.type !== "movie" && i.compositePreview && i.compositePreview.url && i.compositePreview.width && i.compositePreview.height) {
          r = i.compositePreview;
          s = ~~(i.compositePreview.width / Qr);
        }
        if (s > 1) {
          a = r.height / Qr;
        } else {
          var o = Math.max(Math.min(r.height / r.width, ns(i)), 0.35);
          a = Math.max(Math.min(r.height / r.width, 1.91), o);
        }
      }
      return a;
    }
  },
  methods: {
    openContent: function (t, e) {
      return Object(d.a)(regeneratorRuntime.mark(function t() {
        return regeneratorRuntime.wrap(function (t) {
          while (1) {
            switch (t.prev = t.next) {
              case 0:
                t.next = 2;
                return Ca.openContent(Object(P.a)(Object(P.a)({}, e), {}, {
                  type: "template"
                }));
              case 2:
                Yr.useTemplate(e, "应用");
              case 3:
              case "end":
                return t.stop();
            }
          }
        }, t);
      }))();
    },
    showRightkeyMenu: function (t, e) {
      var n = this;
      var a = Ca.states[e.id];
      if (a && a.status === he.A.Done) {
        this.opacity = 0;
        this.showFileMenu = true;
        this.selectTemItem = e;
        this.$refs.fileMenu.open();
        var i = document.documentElement.scrollLeft || document.body.scrollLeft;
        var r = document.documentElement.scrollTop || document.body.scrollTop;
        var s = t.pageX || t.clientX + i;
        var o = t.pageY || t.clientY + r;
        this.fileMenuX = "-300px";
        setTimeout(function () {
          var e = n.$refs.fileMenu.$el.clientWidth + 5;
          var a = n.$refs.fileMenu.$el.clientHeight + 10;
          var i = document.body.clientWidth;
          s = s + e > i ? (t.rightLimit || i) - e : s;
          var r = document.body.clientHeight;
          o = o + a > r ? r - a : o;
          n.fileMenuX = s + "px";
          n.fileMenuY = o + "px";
          n.opacity = 1;
        }, 20);
      }
    },
    getItemSize: function (t) {
      var e = t.composite_preview;
      var n = e && e.height;
      var a = t.type === "web_page" && this.isWideImage(t);
      var i = n && !a ? e : t.preview;
      var r = Math.round((this.clientWidth - (this.columns - 1) * Zr) / this.columns);
      var s = i.width / r;
      var o = 0.3;
      var c = Math.floor(Math.max(Math.min(i.height / s, r * ns(t)), r * o));
      return {
        height: c,
        width: r
      };
    },
    isWideImage: function (t) {
      var e = t.compositePreview;
      return !!e && !!e.url && !!e.width && !!e.height && ~~(e.width / 750) > 1;
    },
    update: function () {
      this.clientWidth = this.$refs["template-list"].clientWidth;
    },
    expose: function (t) {
      this.$emit("expose", t);
    }
  }
}
```