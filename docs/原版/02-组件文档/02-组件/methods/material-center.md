# material-center · 方法实现

> 来源：`material-center.js`
> 方法数：21

## `handleComponentTracker`

参数：`t`

```js
function (t) {
      var e;
      var n;
      var a = t.method;
      var i = t.params;
      if ((e = (n = this.listTracker)[a]) !== null && e !== undefined) {
        e.call(n, i);
      }
    }
```

## `init`


```js
function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                t.listService = Go(t.type);
                e.next = 3;
                return t.getOptions();
              case 3:
                t.getList();
                t.getTrialInfo();
                t.$appBus.on("isShowNoMemoryDialog", t.handleIsShowNoMemeryDialog);
                t.$on("reloadList", function () {
                  t.refreshListByInitialQuery();
                });
              case 7:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    }
```

## `getOptions`


```js
function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        var a;
        var i;
        var r;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.listService.init();
              case 2:
                n = e.sent;
                a = n.categoryOptions;
                i = n.colorOptions;
                r = n.sortOptions;
                t.categoryOptions = a;
                t.colorOptions = i;
                t.sortOptions = r;
              case 9:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    }
```

## `getExtraInfoForPictures`

参数：`t`

```js
function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        var i;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                if (t && t.length !== 0) {
                  n.next = 2;
                  break;
                }
                return n.abrupt("return");
              case 2:
                a = t.map(function (t) {
                  return t.id;
                });
                n.next = 5;
                return e.listService.getExtraInfoForPictures(a);
              case 5:
                i = n.sent;
                t.forEach(function (n, a) {
                  if (i[n.id]) {
                    var r = i[n.id];
                    var s = [];
                    for (var o in r) {
                      var c = r[o];
                      var l = c.size;
                      var u = c.type;
                      if (!l || !u) {
                        break;
                      }
                      s.push(Object(P.a)(Object(P.a)({}, r[o]), {}, {
                        key: o,
                        keyDesc: zr(o),
                        sizeDesc: jr(l),
                        typeDesc: u === null || u === undefined ? undefined : u.toUpperCase()
                      }));
                    }
                    if (s.length === 2) {
                      e.$set(t[a], "pictureInfos", s.sort(function (t, e) {
                        if (t.key === "standard") {
                          return -1;
                        } else if (e.key === "standard") {
                          return 1;
                        } else {
                          return 0;
                        }
                      }));
                    }
                  }
                });
              case 7:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    }
```

## `getList`


```js
function () {
      var t = arguments;
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        var i;
        var r;
        var s;
        var o;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                a = t.length > 0 && t[0] !== undefined ? t[0] : {};
                n.prev = 1;
                a.page_num = a.page_num || 1;
                if (a.page_num && a.page_num === 1) {
                  e.initialLoading = true;
                }
                n.next = 6;
                return e.listService.getList(a);
              case 6:
                i = n.sent;
                r = i.nodes;
                s = i.pageInfo;
                if (e.type === "picture") {
                  e.getExtraInfoForPictures(r);
                }
                r.forEach(function (t) {
                  t.width = t.preview.width;
                  t.height = t.preview.height;
                });
                if (a.page_num && a.page_num > 1) {
                  (o = e.list).push.apply(o, Object(ct.a)(r));
                } else {
                  e.list = r;
                  e.recordExportTemplateId = {};
                }
                e.pageInfo = s;
                e.initialLoading = false;
                e.loadingNextPage = false;
                e.listTracker.setList(e.list);
                return n.abrupt("return", s);
              case 19:
                n.prev = 19;
                n.t0 = n.catch(1);
                console.error(n.t0);
                e.initialLoading = false;
                e.loadingNextPage = false;
              case 24:
              case "end":
                return n.stop();
            }
          }
        }, n, null, [[1, 19]]);
      }))();
    }
```

## `onSearch`

参数：`t`

```js
function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                n.next = 2;
                return e.getList({
                  q: t,
                  colors: "",
                  filter_id: e.listService.allFilterId
                });
              case 2:
                a = n.sent;
                e.listTracker.search({
                  search_word: t,
                  search_result_number: a.total
                });
              case 4:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    }
```

## `handleColorFilter`

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
                a = t.name;
                i = Object(Vn.a)(t, Gf);
                if (!e.disableOtherActionsWhenDownloading) {
                  n.next = 3;
                  break;
                }
                return n.abrupt("return");
              case 3:
                n.next = 5;
                return e.getList(i);
              case 5:
                r = n.sent;
                e.listTracker.filter({
                  color: a,
                  search_result_number: r.total
                });
              case 7:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    }
```

## `handleCategoryFilter`

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
                a = t.name;
                i = Object(Vn.a)(t, Wf);
                if (!e.disableOtherActionsWhenDownloading) {
                  n.next = 3;
                  break;
                }
                return n.abrupt("return");
              case 3:
                n.next = 5;
                return e.getList(i);
              case 5:
                r = n.sent;
                e.listTracker.filter({
                  design_title: a,
                  search_result_number: r.total
                });
              case 7:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    }
```

## `categoreFilterMoreChange`


```js
function () {
      var t = this;
      this.$nextTick(function () {
        t.$refs.list.update();
      });
    }
```

## `handleSort`

参数：`t`

```js
function (t) {
      this.getList(t);
    }
```

## `nextPage`


```js
function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (!t.loadedAll) {
                  e.next = 2;
                  break;
                }
                return e.abrupt("return");
              case 2:
                if (!t.loadingNextPage) {
                  e.next = 4;
                  break;
                }
                return e.abrupt("return");
              case 4:
                t.loadingNextPage = true;
                n = t.pageInfo.num;
                e.next = 8;
                return t.getList({
                  page_num: n + 1
                });
              case 8:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    }
```

## `getBackTopTarget`


```js
function () {
      return this.$refs.list && this.$refs.list.$el;
    }
```

## `handleColumnChange`

参数：`t`

```js
function (t) {
      this.columns = t;
    }
```

## `showTryLimitDialog`


```js
function () {
      Ca.isTryLimitShown = true;
    }
```

## `closeTryLimitDialog`


```js
function () {
      Ca.isTryLimitShown = false;
    }
```

## `handleIsShowNoMemeryDialog`

参数：`t`

```js
function (t) {
      this.isShowNoMemoryDialog = t;
    }
```

## `getTrialInfo`


```js
function () {
      this.$store.dispatch("getDownloadCount");
    }
```

## `refreshListByInitialQuery`


```js
function () {
      var t = this.listService.getInitialQuery();
      this.getList(t);
    }
```

## `expose`

参数：`t`

```js
function (t) {
      if (!this.recordExportTemplateId[t.id]) {
        this.recordExportTemplateId[t.id] = true;
        this.listTracker.exposeTemplate(t);
      }
    }
```

## `e`


```js
e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                t.listService = Go(t.type);
                e.next = 3;
                return t.getOptions();
              case 3:
                t.getList();
                t.getTrialInfo();
                t.$appBus.on("isShowNoMemoryDialog", t.handleIsShowNoMemeryDialog);
                t.$on("reloadList", function () {
                  t.refreshListByInitialQuery();
                });
              case 7:
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
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                if (t && t.length !== 0) {
                  n.next = 2;
                  break;
                }
                return n.abrupt("return");
              case 2:
                a = t.map(function (t) {
                  return t.id;
                });
                n.next = 5;
                return e.listService.getExtraInfoForPictures(a);
              case 5:
                i = n.sent;
                t.forEach(function (n, a) {
                  if (i[n.id]) {
                    var r = i[n.id];
                    var s = [];
                    for (var o in r) {
                      var c = r[o];
                      var l = c.size;
                      var u = c.type;
                      if (!l || !u) {
                        break;
                      }
                      s.push(Object(P.a)(Object(P.a)({}, r[o]), {}, {
                        key: o,
                        keyDesc: zr(o),
                        sizeDesc: jr(l),
                        typeDesc: u === null || u === undefined ? undefined : u.toUpperCase()
                      }));
                    }
                    if (s.length === 2) {
                      e.$set(t[a], "pictureInfos", s.sort(function (t, e) {
                        if (t.key === "standard") {
                          return -1;
                        } else if (e.key === "standard") {
                          return 1;
                        } else {
                          return 0;
                        }
                      }));
                    }
                  }
                });
              case 7:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }
```
