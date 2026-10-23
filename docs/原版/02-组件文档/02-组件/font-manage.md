# font-manage

> 来源：`app/56d7.js`　大小：4.6KB
> 特征：data / methods

## 子组件

`TabLayout`、`UserFont`、`FontManageMenu`、`DTS`

## methods（4）

`init`、`setOptionType`、`confirm`、`cancel`

## 文案（3）

我的字体 · 字体初始化失败 · 操作失败

## 源码

```js
{
  name: "font-manage",
  components: {
    TabLayout: mg,
    UserFont: fC,
    FontManageMenu: Dg,
    DTS: jg
  },
  inject: ["userFont", "openFolder", "textLayerListener"],
  data: function () {
    return {
      operateType: bg.Unset,
      fonts: [],
      tabs: [{
        id: "user-font",
        tab: "我的字体",
        content: fC
      }]
    };
  },
  created: function () {
    this.textLayerListener.addEventListener(function (t) {
      if (t) {
        Rw.previewText = t;
      }
    });
  },
  mounted: function () {
    var t = this;
    this.$nextTick(function () {
      t.init();
    });
  },
  beforeDestroy: function () {
    this.textLayerListener.removeEventListener();
  },
  methods: {
    init: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.prev = 0;
                e.next = 3;
                return Rw.init(t.userFont);
              case 3:
                f.a.info({
                  msg: "FONT_MANAGE_INIT_SUCCESS"
                });
                e.next = 11;
                break;
              case 6:
                e.prev = 6;
                e.t0 = e.catch(0);
                console.error("init fonts failed: ", e.t0);
                cg.a.error("字体初始化失败");
                f.a.error(e.t0, {
                  msg: "FONT_INIT_ERR",
                  extra: e.t0.message
                });
              case 11:
              case "end":
                return e.stop();
            }
          }
        }, e, null, [[0, 6]]);
      }))();
    },
    setOptionType: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                e.operateType = t;
                if (t === bg.Disclaimer) {
                  gC();
                }
                f.a.info({
                  msg: "FONT_MANAGE_OPERATE",
                  extra: t
                });
              case 3:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    },
    confirm: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.prev = 0;
                if (t.operateType !== bg.Import) {
                  e.next = 6;
                  break;
                }
                e.next = 4;
                return CC({
                  basePath: t.userFont.basePath,
                  user: t.userFont.user,
                  cancel: t.cancel
                });
              case 4:
                e.next = 6;
                return Rw.init(t.userFont);
              case 6:
                if (t.operateType !== bg.Export) {
                  e.next = 11;
                  break;
                }
                e.next = 9;
                return OC({
                  basePath: t.userFont.basePath,
                  user: t.userFont.user,
                  cancel: t.cancel,
                  userTags: Rw.userTags,
                  mostRecentlyUsed: Rw.mostRecentlyUsed,
                  frequency: Rw.frequency,
                  groups: Rw.groups,
                  ratings: Rw.ratings
                });
              case 9:
                n = e.sent;
                t.openFolder(n);
              case 11:
                f.a.info({
                  msg: "FONT_MANAGE_OPERATE_SUCCESS",
                  extra: t.operateType
                });
                t.operateType = bg.Unset;
                e.next = 21;
                break;
              case 15:
                e.prev = 15;
                e.t0 = e.catch(0);
                console.error(`${t.operateType} failed: `, e.t0);
                cg.a.error("操作失败");
                t.operateType = bg.Unset;
                f.a.error(e.t0, {
                  msg: "FONT_MANAGE_OPERATE_FAILED",
                  extra: e.t0.message
                });
              case 21:
              case "end":
                return e.stop();
            }
          }
        }, e, null, [[0, 15]]);
      }))();
    },
    cancel: function () {
      f.a.info({
        msg: "FONT_MANAGE_OPERATE_CANCEL",
        extra: this.operateType
      });
      this.operateType = bg.Unset;
    }
  }
}
```