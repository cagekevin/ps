# Vuex Store

> 来源：webcrack 还原源码
> 定位：`new X.Store({ ... })`

## 位置

`4360.js` 第 536 行

## state（20）

| 字段 | 初值 |
|---|---|
| `freeLayoutIndex` | `-1` |
| `fileSvgIstrue` | `false` |
| `inputcomIstrue` | `-1` |
| `keyCode` | `null` |
| `fileDropDown` | `false` |
| `filedata` | `l.a.folder` |
| `fileDownNode` | `null` |
| `mouseDownIstrue` | `false` |
| `notAllowed` | `false` |
| `fileIndex` | `0` |
| `copyFileIndex` | `0` |
| `winWidth` | `20` |
| `file` | `{ mouseDownData: null, mouseIndex: 0, mouseUpData: null, sta` |
| `showMenu` | `-1` |
| `test` | `0` |
| `isMac` | `/mac os/i.test(navigator.userAgent)` |
| `token` | `null` |
| `userDownloadCountInfo` | `null` |
| `user_info` | `null` |

## mutations（3）

方法：`setToken`、`setUserDownloadCountInfo`、`setUserInfo`

### `setUserDownloadCountInfo`

```js
function (t, e) {
      t.userDownloadCountInfo = e;
    }
```

### `setUserInfo`

```js
function (t, e) {
      t.user_info = Object(i.a)(Object(i.a)({}, e), {}, {
        showVersionSwitcher: e.isOpenMain && e.isWhite,
        willingToTryNew: e.isOpenUser,
        isOpenMain: undefined,
        isWhite: undefined,
        isOpenUser: undefined
      });
    }
```

## actions（4）

方法：`getUserInfo`、`switchVersion`、`getDownloadCount`、`checkGlobalIdeaPopup`

### `switchVersion`

```js
function (t, e) {
      var a = t.commit;
      var r = t.state;
      var s = require("./1bab.js");
      var o = s.postRequest;
      var c = {
        isOpenUser: e
      };
      return o("/user/preview/switch", c).then(function () {
        a("setUserInfo", Object(i.a)(Object(i.a)({}, r.user_info), {}, {
          willingToTryNew: c.isOpenUser
        }));
      });
    }
```

### `getDownloadCount`

```js
function (t) {
      return Object(a.a)(regeneratorRuntime.mark(function e() {
        var a;
        var i;
        var r;
        var s;
        var o;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                a = t.commit;
                e.prev = 1;
                i = require("./1bab.js");
                r = i.getRequest;
                e.next = 5;
                return r("v1/material/count");
              case 5:
                s = e.sent;
                if (s.status !== 200 || !s.data) {
                  e.next = 10;
                  break;
                }
                o = s.data;
                a("setUserDownloadCountInfo", o);
                return e.abrupt("return", o);
              case 10:
                return e.abrupt("return", false);
              case 13:
                e.prev = 13;
                e.t0 = e.catch(1);
                c.a.error(e.t0, {
                  msg: e.t0.hint
                });
                return e.abrupt("return", false);
              case 17:
              case "end":
                return e.stop();
            }
          }
        }, e, null, [[1, 13]]);
      }))();
    }
```

### `checkGlobalIdeaPopup`

```js
function (t) {
      return Object(a.a)(regeneratorRuntime.mark(function t() {
        var e;
        var a;
        var i;
        var r;
        var o;
        var c;
        var l;
        var u;
        var h;
        return regeneratorRuntime.wrap(function (t) {
          while (1) {
            switch (t.prev = t.next) {
              case 0:
                e = require("./1bab.js");
                a = e.getRequest;
                t.next = 3;
                return a("v1/operation/position", {
                  position: "pszhuli-global-popup"
                });
              case 3:
                i = t.sent;
                if (!i.data || !i.data.pit_modules || !(i.data.pit_modules.length > 0)) {
                  t.next = 18;
                  break;
                }
                r = i.data.pit_modules[0];
                o = i.data.pit_modules[0].material.action_link;
                c = Date.now();
                if (!(c < r.end_time) || !(c > r.start_time)) {
                  t.next = 18;
                  break;
                }
                t.next = 11;
                return new Promise(function (t) {
                  return setTimeout(t, 1000);
                });
              case 11:
                l = I(i.data.pit_modules[0], document.body.querySelector("#app-main"), s.a).result;
                t.next = 14;
                return l;
              case 14:
                u = t.sent;
                h = u.event;
                if (h !== "confirm") {
                  t.next = 18;
                  break;
                }
                return t.abrupt("return", o);
              case 18:
              case "end":
                return t.stop();
            }
          }
        }, t);
      }))();
    }
```

## modules（2）

方法：`templateCenter`、`topic`

### `topic`

```js
b
```
