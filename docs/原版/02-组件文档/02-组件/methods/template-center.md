# template-center · 方法实现

> 来源：`template-center.js`
> 方法数：20

## `handleComponentTracker`

参数：`t`

```js
function (t) {
      var e;
      var n = t.method;
      var a = t.params;
      if ((e = Ko[n]) !== null && e !== undefined) {
        e.call(Ko, a);
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
                t.listService = qo;
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
        var s;
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
                r = n.formatOptions;
                s = n.sortOptions;
                t.categoryOptions = a;
                t.colorOptions = i;
                t.formatOptions = r;
                t.sortOptions = s;
              case 11:
              case "end":
                return e.stop();
            }
          }
        }, e);
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
                Ko.setList(e.list);
                return n.abrupt("return", s);
              case 18:
                n.prev = 18;
                n.t0 = n.catch(1);
                e.initialLoading = false;
                e.loadingNextPage = false;
              case 22:
              case "end":
                return n.stop();
            }
          }
        }, n, null, [[1, 18]]);
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
                  ratios: "",
                  filter_id: e.listService.allFilterId
                });
              case 2:
                a = n.sent;
                Ko.search({
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
                i = Object(Vn.a)(t, Wo);
                n.next = 3;
                return e.getList(i);
              case 3:
                r = n.sent;
                Ko.filter({
                  color: a,
                  search_result_number: r.total
                });
              case 5:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    }
```

## `handleFormatFilter`

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
                i = Object(Vn.a)(t, Jo);
                n.next = 3;
                return e.getList(i);
              case 3:
                r = n.sent;
                Ko.filter({
                  format: a,
                  search_result_number: r.total
                });
              case 5:
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
                i = Object(Vn.a)(t, Xo);
                n.next = 3;
                return e.getList(i);
              case 3:
                r = n.sent;
                Ko.filter({
                  design_title: a,
                  search_result_number: r.total
                });
              case 5:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
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
        Ko.exposeTemplate(t);
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
                t.listService = qo;
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
                Ko.setList(e.list);
                return n.abrupt("return", s);
              case 18:
                n.prev = 18;
                n.t0 = n.catch(1);
                e.initialLoading = false;
                e.loadingNextPage = false;
              case 22:
              case "end":
                return n.stop();
            }
          }
        }, n, null, [[1, 18]]);
      }
```
