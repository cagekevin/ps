# user-font-page-content · 方法实现

> 来源：`user-font-page-content.js`
> 方法数：5

## `tagToFont`

参数：`t`

```js
function (t) {
      this.$emit("set-current-font", t);
    }
```

## `ratingToFont`

参数：`t, e`

```js
function (t, e) {
      var n = this;
      return Object(d.a)(regeneratorRuntime.mark(function a() {
        return regeneratorRuntime.wrap(function (a) {
          while (1) {
            switch (a.prev = a.next) {
              case 0:
                a.prev = 0;
                Rw.ratings = {
                  family: t.family,
                  rate: e
                };
                a.next = 4;
                return Rw.saveActivities(n.userFont);
              case 4:
                f.a.info({
                  msg: "FONT_MANAGE_RARING_SUCCESS",
                  extra: {
                    family: t.family,
                    rate: e
                  }
                });
                n.pushFiles([dw(n.userFont)]);
                a.next = 13;
                break;
              case 8:
                a.prev = 8;
                a.t0 = a.catch(0);
                console.error("rating failed: ", a.t0);
                cg.a.error("评分操作失败");
                f.a.error(a.t0, {
                  msg: "FONT_MANAGE_RARING_ERR",
                  extra: a.t0.message
                });
              case 13:
              case "end":
                return a.stop();
            }
          }
        }, a, null, [[0, 8]]);
      }))();
    }
```

## `selectFont`

参数：`t`

```js
function (t) {
      this.$emit("select-font", t);
    }
```

## `loadMore`


```js
function () {
      if (!(Rw.page * Rw.pageSize >= Rw.total)) {
        Rw.nextPage();
      }
    }
```

## `a`


```js
a() {
        return regeneratorRuntime.wrap(function (a) {
          while (1) {
            switch (a.prev = a.next) {
              case 0:
                a.prev = 0;
                Rw.ratings = {
                  family: t.family,
                  rate: e
                };
                a.next = 4;
                return Rw.saveActivities(n.userFont);
              case 4:
                f.a.info({
                  msg: "FONT_MANAGE_RARING_SUCCESS",
                  extra: {
                    family: t.family,
                    rate: e
                  }
                });
                n.pushFiles([dw(n.userFont)]);
                a.next = 13;
                break;
              case 8:
                a.prev = 8;
                a.t0 = a.catch(0);
                console.error("rating failed: ", a.t0);
                cg.a.error("评分操作失败");
                f.a.error(a.t0, {
                  msg: "FONT_MANAGE_RARING_ERR",
                  extra: a.t0.message
                });
              case 13:
              case "end":
                return a.stop();
            }
          }
        }, a, null, [[0, 8]]);
      }
```
