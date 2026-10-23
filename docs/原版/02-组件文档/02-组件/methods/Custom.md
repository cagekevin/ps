# Custom · 方法实现

> 来源：`Custom.js`
> 方法数：16

## `openFreeMerge`


```js
function () {
      if (Object(ft.f)()) {
        this.$freePanelBox.show("合并矩形", "zdy_mergeRectangles");
      }
    }
```

## `openFree`


```js
function () {
      if (Object(ft.f)()) {
        var t = this.getOption();
        if (t == null) {
          return false;
        }
        this.$freePanelBox.show("生成框架", "zdy_generate", t);
      }
    }
```

## `mergeRectangles`


```js
function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.$cep.jsxNoCheck("zdy_checkMergeRectangles");
              case 2:
                n = e.sent;
                if (n.err != 1) {
                  e.next = 5;
                  break;
                }
                return e.abrupt("return", t.$msg.show(n.msg));
              case 5:
                e.next = 7;
                return t.$cep.jsxHistoryNoCheck("zdy_mergeRectangles", [], "合并形状");
              case 7:
                n = e.sent;
              case 8:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    }
```

## `getOption`


```js
function () {
      var t = Object(ft.c)(this.set);
      if (t.textSize1 == "") {
        t.textSize1 = 0;
      }
      if (t.textSize2 == "") {
        t.textSize2 = 0;
      }
      if (t.rowSpacing == "") {
        t.rowSpacing = "8px";
      }
      if (t.columnSpacing == "") {
        t.columnSpacing = "8px";
      }
      t.textLocation = parseInt(t.textLocation) + 1;
      var e;
      var n = true;
      var a = Object(T.a)(t.line);
      try {
        for (a.s(); !(e = a.n()).done;) {
          var i = e.value;
          if (i.text != "") {
            n = false;
            break;
          }
        }
      } catch (r) {
        a.e(r);
      } finally {
        a.f();
      }
      if (n) {
        this.$tips.show("至少输入一行");
        return null;
      } else {
        return t;
      }
    }
```

## `generate`


```js
function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        var a;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                t.$tracker.buttonClick({
                  button_source: "自定义框架页",
                  button_name: "生成框架"
                });
                n = t.getOption();
                if (n != null) {
                  e.next = 4;
                  break;
                }
                return e.abrupt("return", false);
              case 4:
                console.log(t.set);
                e.next = 7;
                return t.$cep.jsx("zdy_checkStatus");
              case 7:
                a = e.sent;
                if (a != 0) {
                  e.next = 10;
                  break;
                }
                return e.abrupt("return", t.$msg.showErr("请画出选区或矩形图层再生成框架"));
              case 10:
                t.$load.show("正在生成...");
                e.next = 13;
                return t.$cep.jsxHistory("zdy_generate", [n], "生成自定义框架");
              case 13:
                t.$tracker.functionApply({
                  function_source: "自定义框架页",
                  function_name: "生成框架"
                });
                t.$load.hide("正在生成...");
                t.$bp.add("zdy_001");
              case 16:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    }
```

## `checkLineHeight`

参数：`t`

```js
function (t) {
      this.set.line[t].height = Object(ft.b)(this.set.line[t].height);
    }
```

## `checkColumn`


```js
function () {
      this.set.columnSpacing = Object(ft.b)(this.set.columnSpacing);
    }
```

## `checkRow`


```js
function () {
      this.set.rowSpacing = Object(ft.b)(this.set.rowSpacing);
    }
```

## `preview`

参数：`t, e`

```js
function (t, e) {
      try {
        t.text = t.text.replace(/：/g, ":");
        var n = this.vGetRowToArr(t.text);
        if (n[0].length > 100) {
          this.$tips.show("不要超过100哦");
          return;
        }
        if (n == -1 || n.includes("")) {
          return;
        }
        function a(t, e) {
          return parseInt(t) + parseInt(e);
        }
        this.set.line[e].arr = n[0];
        this.set.line[e].pattern = n[1];
        this.set.line[e].allcount = this.set.line[e].arr.reduce(a);
      } catch (i) {}
    }
```

## `reset`


```js
function () {
      this.set = {
        rowSpacing: "",
        columnSpacing: "",
        textSize1: "",
        textSize2: "",
        line: [{
          text: "",
          height: "",
          arr: [],
          allcount: "",
          pattern: 0
        }],
        shapeIndex: 0,
        textLocation: 0
      };
      this.heightIstrue = false;
    }
```

## `inputcomHeightFun`


```js
function () {
      this.heightIstrue = false;
      this.set.line = this.set.line.filter(function (t, e) {
        t.height = "";
        return t;
      });
    }
```

## `add`

参数：`t, e`

```js
function (t, e) {
      var n = Object(ft.c)(this.set.line[e]);
      this.set.line.splice(e, 0, n);
      console.log(this.set.line);
    }
```

## `remove`

参数：`t, e`

```js
function (t, e) {
      if (this.set.line.length != 1) {
        this.set.line.splice(e, 1);
      } else {
        this.$tips.show("最少保留一行哦");
      }
    }
```

## `vGetRowToArr`

参数：`t`

```js
function (t) {
      if (t == 0) {
        return [];
      }
      var e = new Array();
      var n = -1;
      if (t.indexOf(":") != -1) {
        e = t.split(":");
      } else if (t.indexOf("=") != -1) {
        var a;
        var i = t.split("=");
        var r = 1;
        if (i[1].indexOf(">") != -1) {
          a = i[1].split(">");
        } else {
          if (i[1].indexOf("%") == -1) {
            return -1;
          }
          a = i[1].split("%");
          r = (100 - a[1]) / (i[0] - 1);
        }
        if (parseInt(a[0]) > parseInt(i[0])) {
          return -1;
        }
        for (var s = 0; s < i[0]; s++) {
          if (s == a[0] - 1) {
            e.push(a[1]);
          } else {
            e.push(r);
          }
        }
      } else {
        var o = 100 / t;
        n = 0;
        for (s = 0; s < t; s++) {
          e.push(o);
        }
      }
      return [e, n];
    }
```

## `e`


```js
e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.$cep.jsxNoCheck("zdy_checkMergeRectangles");
              case 2:
                n = e.sent;
                if (n.err != 1) {
                  e.next = 5;
                  break;
                }
                return e.abrupt("return", t.$msg.show(n.msg));
              case 5:
                e.next = 7;
                return t.$cep.jsxHistoryNoCheck("zdy_mergeRectangles", [], "合并形状");
              case 7:
                n = e.sent;
              case 8:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }
```

## `a`

参数：`t, e`

```js
a(t, e) {
          return parseInt(t) + parseInt(e);
        }
```
