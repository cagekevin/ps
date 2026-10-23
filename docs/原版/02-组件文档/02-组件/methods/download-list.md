# download-list · 方法实现

> 来源：`download-list.js`
> 方法数：8

## `openContent`

参数：`t, e`

```js
function (t, e) {
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
      var r = Math.round((this.clientWidth - (this.columns - 1) * Zr) / this.columns);
      var s = i.width / r;
      var o = 0.3;
      var c = Math.floor(Math.max(Math.min(i.height / s, r * ns(t)), r * o));
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
      this.clientWidth = this.$refs["template-list"].clientWidth;
    }
```

## `expose`

参数：`t`

```js
function (t) {
      this.$emit("expose", t);
    }
```

## `t`


```js
t() {
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
