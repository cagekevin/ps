# material-list · 方法实现

> 来源：`material-list.js`
> 方法数：8

## `cancelDownload`

参数：`t`

```js
function (t) {
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return Ca.cancelTask(t);
              case 2:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    }
```

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
                a = t.target;
                i = t.downloadType;
                e.$emit("download", a);
                if (a.pictureInfos && i === undefined) {
                  i = "standard";
                }
                n.next = 5;
                return Ca.downloadAndUse(Object(P.a)(Object(P.a)({}, a), {}, {
                  downloadType: i,
                  type: "material"
                }));
              case 5:
                e.$tracker.functionApply({
                  function_source: `素材库页_${Ef(e.type)}`,
                  function_name: "应用到当前设计稿"
                });
                r = Ca.states[a.id];
                if (r) {
                  n.next = 10;
                  break;
                }
                e.listTracker.useTemplate(a, "点击");
                return n.abrupt("return");
              case 10:
                if (r.status === he.A.Done) {
                  e.listTracker.useTemplate(a, "应用");
                }
              case 11:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
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
      var r = Math.round((this.clientWidth - (this.columns - 1) * Df) / this.columns);
      var s = i.width / r;
      var o = 0.3;
      var c = Math.floor(Math.max(Math.min(i.height / s, r * Bf(t)), r * o));
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
      var t = this.$refs["material-list"];
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

## `e`


```js
e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return Ca.cancelTask(t);
              case 2:
              case "end":
                return e.stop();
            }
          }
        }, e);
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
                a = t.target;
                i = t.downloadType;
                e.$emit("download", a);
                if (a.pictureInfos && i === undefined) {
                  i = "standard";
                }
                n.next = 5;
                return Ca.downloadAndUse(Object(P.a)(Object(P.a)({}, a), {}, {
                  downloadType: i,
                  type: "material"
                }));
              case 5:
                e.$tracker.functionApply({
                  function_source: `素材库页_${Ef(e.type)}`,
                  function_name: "应用到当前设计稿"
                });
                r = Ca.states[a.id];
                if (r) {
                  n.next = 10;
                  break;
                }
                e.listTracker.useTemplate(a, "点击");
                return n.abrupt("return");
              case 10:
                if (r.status === he.A.Done) {
                  e.listTracker.useTemplate(a, "应用");
                }
              case 11:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }
```
