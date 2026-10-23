# template-list · 方法实现

> 来源：`template-list.js`
> 方法数：8

## `handleMaterialPreviewClick`

参数：`t`

```js
function (t) {
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
    }
```

## `showRightkeyMenu`

参数：`t, e`

```js
function (t, e) {
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
    }
```

## `getItemSize`

参数：`t`

```js
function (t) {
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
    }
```

## `isWideImage`

参数：`t`

```js
function (t) {
      var e = t.compositePreview;
      return !!e && !!e.url && !!e.width && !!e.height && ~~(e.width / 750) > 1;
    }
```

## `update`


```js
function () {
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
    }
```

## `expose`

参数：`t`

```js
function (t) {
      this.$emit("expose", t);
    }
```

## `n`


```js
n() {
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
      }
```

## `setTimeout`

参数：`function (`

```js
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
        }
```
