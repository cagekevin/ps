# user-font-page-footer · 方法实现

> 来源：`user-font-page-footer.js`
> 方法数：4

## `useText`

参数：`t`

```js
function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                n.prev = 0;
                Rw.previewText = t;
                n.next = 4;
                return e.applyText(t);
              case 4:
                f.a.info({
                  msg: "FONT_MANAGE_APPLY_TEXT"
                });
                n.next = 12;
                break;
              case 7:
                n.prev = 7;
                n.t0 = n.catch(0);
                console.error("apply text failed: ", n.t0);
                cg.a.error("应用失败");
                f.a.error(n.t0, {
                  msg: "FONT_MANAGE_APPLY_TEXT_FAILED",
                  extra: n.t0.message
                });
              case 12:
              case "end":
                return n.stop();
            }
          }
        }, n, null, [[0, 7]]);
      }))();
    }
```

## `setPreviewText`

参数：`t`

```js
function (t) {
      Rw.previewText = t;
    }
```

## `setPreviewMode`

参数：`t`

```js
function (t) {
      Rw.previewMode = t;
    }
```

## `n`


```js
n() {
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                n.prev = 0;
                Rw.previewText = t;
                n.next = 4;
                return e.applyText(t);
              case 4:
                f.a.info({
                  msg: "FONT_MANAGE_APPLY_TEXT"
                });
                n.next = 12;
                break;
              case 7:
                n.prev = 7;
                n.t0 = n.catch(0);
                console.error("apply text failed: ", n.t0);
                cg.a.error("应用失败");
                f.a.error(n.t0, {
                  msg: "FONT_MANAGE_APPLY_TEXT_FAILED",
                  extra: n.t0.message
                });
              case 12:
              case "end":
                return n.stop();
            }
          }
        }, n, null, [[0, 7]]);
      }
```
