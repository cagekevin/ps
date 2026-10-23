# template-list

> 来源：`app/56d7.js`　大小：7.2KB
> 特征：props / data / methods

## 子组件

`MaterialPreview`、`Icon`、`TemplateRightKeyMenu`、`Expose`、`WaterfallVirtualList`

## props（10）

`rows`、`materials`、`columns`、`columnsOffset`、`responsiveWidth`、`visible`、`loading`、`loadedAll`、`nextPage`、`updater`

## computed（3）

`list`、`innerColumns`、`setRatio`

## methods（7）

`handleMaterialPreviewClick`、`showRightkeyMenu`、`getItemSize`、`isWideImage`、`update`、`expose`、`setTimeout`

## 文案（5）

模板库页 · 模板中心 · 创建设计稿 · 点击 · 应用

## 源码

```js
{
  name: "template-list",
  inject: ["listTracker"],
  components: {
    MaterialPreview: Ur,
    Icon: ie.a,
    TemplateRightKeyMenu: Kr,
    Expose: Xs,
    WaterfallVirtualList: yo
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
    },
    visible: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    loadedAll: {
      type: Boolean,
      default: false
    },
    nextPage: Function,
    updater: {
      type: Boolean,
      default: false
    }
  },
  data: function () {
    return {
      MATERIAL_MARGIN: xo,
      MATERIAL_MARGIN_VERTICAL: ko,
      clientWidth: 0,
      clientHeight: 0,
      topDistance: 0,
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
  watch: {
    visible: {
      handler: function (t, e) {
        var n = this;
        if (!e && t) {
          this.$nextTick(function () {
            n.update();
          });
          window.addEventListener("resize", this.update);
        } else {
          window.removeEventListener("resize", this.update);
        }
      },
      immediate: true
    },
    updater: function (t) {
      var e = this;
      var n = function t() {
        var n = e.update();
        var a = n.val;
        var i = n.oldVal;
        if (a !== i) {
          setTimeout(t);
        } else {
          setTimeout(e.update, 100);
        }
      };
      setTimeout(n);
    },
    loading: {
      handler: function (t) {
        this.innerLoading = t;
      }
    }
  },
  computed: {
    list: function () {
      var t = this;
      var e = this.materials;
      if (this.rows) {
        e = this.materials.slice(0, this.innerColumns * this.rows);
      }
      return e.filter(function (e) {
        if (e.compositePreview && e.compositePreview.height || e.preview && e.preview.height) {
          var n = t.getItemSize(e);
          e.height = n.height > 0 ? n.height : e.height;
          e.width = n.width > 0 ? n.width : e.width;
          return true;
        }
      });
    },
    innerColumns: function () {
      if (this.clientWidth >= this.responsiveWidth) {
        return this.columns + this.columnsOffset;
      } else {
        return this.columns;
      }
    },
    setRatio: function () {
      var t = this.list.filter(function (t) {
        return t.type === "h5_bargraph";
      });
      var e = this.list.filter(function (t) {
        return t.type === "web_page";
      });
      var n = Object(ct.a)(new Set(this.list.map(function (t) {
        return t.type;
      }))).length === 2 && t.length && e.length;
      var a = 0;
      if (n) {
        var i = e[0];
        var r = i.preview;
        var s = 1;
        if (i.type !== "movie" && i.compositePreview && i.compositePreview.url && i.compositePreview.width && i.compositePreview.height) {
          r = i.compositePreview;
          s = ~~(i.compositePreview.width / wo);
        }
        if (s > 1) {
          a = r.height / wo;
        } else {
          var o = Math.max(Math.min(r.height / r.width, _o(i)), 0.35);
          a = Math.max(Math.min(r.height / r.width, 1.91), o);
        }
      }
      return a;
    }
  },
  methods: {
    handleMaterialPreviewClick: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        var i;
        var r;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                a = t.event;
                i = t.target;
                e.$emit("download", i);
                if (!a || !a.ctrlKey && !a.metaKey) {
                  n.next = 6;
                  break;
                }
                n.next = 5;
                return Ca.downloadAndUse(Object(P.a)(Object(P.a)({}, i), {}, {
                  type: "template"
                }));
              case 5:
                return n.abrupt("return");
              case 6:
                n.next = 8;
                return Ca.downloadOrOpen(Object(P.a)(Object(P.a)({}, i), {}, {
                  type: "template"
                }));
              case 8:
                e.$tracker.functionApply({
                  function_source: "模板库页_模板中心",
                  function_name: "创建设计稿"
                });
                r = Ca.states[i.id];
                if (r) {
                  n.next = 13;
                  break;
                }
                e.listTracker.useTemplate(i, "点击");
                return n.abrupt("return");
              case 13:
                if (r.status === he.A.Done) {
                  e.listTracker.useTemplate(i, "应用");
                }
              case 14:
              case "end":
                return n.stop();
            }
          }
        }, n);
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
      var r = Math.round((this.clientWidth - (this.columns - 1) * xo) / this.columns);
      var s = i.width / r;
      var o = 0.3;
      var c = Math.floor(Math.max(Math.min(i.height / s, r * _o(t)), r * o));
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
      var t = this.$refs["template-list"];
      var e = this.clientHeight;
      if (t) {
        var n = t.clientWidth;
        var a = t.clientHeight;
        if (n && a) {
          this.clientWidth = t.clientWidth;
          this.clientHeight = t.clientHeight;
          this.topDistance = t.getBoundingClientRect().top;
        }
      }
      return {
        val: this.clientHeight,
        oldVal: e
      };
    },
    expose: function (t) {
      this.$emit("expose", t);
    }
  }
}
```