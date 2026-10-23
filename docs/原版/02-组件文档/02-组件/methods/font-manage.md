# font-manage · 方法实现

> 来源：`font-manage_2.js`
> 方法数：13

## `ensureCep`


```js
function () {
      this.__cep ||= new kt.a();
      return this.__cep;
    }
```

## `initFonts`


```js
function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.ensureCep().jsxNoCheck("ztgl_initSystemList", []);
              case 2:
                return e.abrupt("return", e.sent);
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    }
```

## `getClassificationURL`


```js
function () {
      return Object(d.a)(regeneratorRuntime.mark(function t() {
        return regeneratorRuntime.wrap(function (t) {
          while (1) {
            switch (t.prev = t.next) {
              case 0:
                return t.abrupt("return", Object(C.getRequest)("v1/font/link").then(function (t) {
                  if (!t || !t.data) {
                    throw new Error("路径获取失败");
                  }
                  if (!t.data.link) {
                    throw new Error("路径为空");
                  }
                  return t.data.link;
                }));
              case 1:
              case "end":
                return t.stop();
            }
          }
        }, t);
      }))();
    }
```

## `openFolder`

参数：`t`

```js
function (t) {
      this.ensureCep().jsxNoCheck("Fs_openFolder", [t]);
    }
```

## `setFont`

参数：`t`

```js
function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        var i;
        var r;
        var s;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                a = t.postScriptName;
                i = t.name;
                r = t.weight;
                n.next = 3;
                return e.ensureCep().jsxNoCheck("ztgl_setFont", [a, i, r], "设置字体");
              case 3:
                s = n.sent;
                if (!s || s.code === "OK") {
                  n.next = 6;
                  break;
                }
                throw new Error(s.message);
              case 6:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    }
```

## `addEventListener`

参数：`t`

```js
function (t) {
      this.$psEvent.add("1936483188", "FontManage__PreviewText", this.readFont.bind(this, t));
    }
```

## `removeEventListener`


```js
function () {
      this.$psEvent.remove("1936483188", "FontManage__PreviewText");
    }
```

## `readFont`

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
                return e.ensureCep().jsxNoCheck("ztgl_read_text", []);
              case 2:
                a = n.sent;
                try {
                  t(a.text);
                } catch (i) {
                  t("");
                }
              case 4:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    }
```

## `applyText`

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
                return e.ensureCep().jsxNoCheck("ztgl_create_or_replace", [t]);
              case 2:
                a = n.sent;
                if (a.code === "OK") {
                  n.next = 5;
                  break;
                }
                throw new Error(a.message);
              case 5:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    }
```

## `pushFiles`

参数：`t`

```js
function (t) {
      this.$appBus.emit("syncChangeFileToServe", "SYNC_FONT_MANAGE", t, "字体标签");
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
                return t.ensureCep().jsxNoCheck("ztgl_initSystemList", []);
              case 2:
                return e.abrupt("return", e.sent);
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }
```

## `t`


```js
t() {
        return regeneratorRuntime.wrap(function (t) {
          while (1) {
            switch (t.prev = t.next) {
              case 0:
                return t.abrupt("return", Object(C.getRequest)("v1/font/link").then(function (t) {
                  if (!t || !t.data) {
                    throw new Error("路径获取失败");
                  }
                  if (!t.data.link) {
                    throw new Error("路径为空");
                  }
                  return t.data.link;
                }));
              case 1:
              case "end":
                return t.stop();
            }
          }
        }, t);
      }
```

## `n`


```js
n() {
        var a;
        var i;
        var r;
        var s;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                a = t.postScriptName;
                i = t.name;
                r = t.weight;
                n.next = 3;
                return e.ensureCep().jsxNoCheck("ztgl_setFont", [a, i, r], "设置字体");
              case 3:
                s = n.sent;
                if (!s || s.code === "OK") {
                  n.next = 6;
                  break;
                }
                throw new Error(s.message);
              case 6:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }
```
