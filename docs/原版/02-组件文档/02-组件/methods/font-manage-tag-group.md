# font-manage-tag-group · 方法实现

> 来源：`font-manage-tag-group.js`
> 方法数：5

## `openContextMenu`

参数：`t, e`

```js
function (t, e) {
      var n = this;
      var a = t.event;
      var i = Object(Vn.a)(t, pb);
      var r = window.document.body.clientWidth - 8;
      var s = window.document.body.clientHeight - 8;
      var o = this.$refs["tag-group"].getBoundingClientRect();
      var c = o.left;
      var l = o.top;
      this.showContextMenu = true;
      this.opacity = 0;
      requestAnimationFrame(function () {
        var t = n.$refs["context-menu"].getBoundingClientRect();
        var o = t.width;
        var u = t.height;
        var h = a.left + o > r ? r - o : a.left;
        var d = a.top + u > s ? s - u : a.top;
        n.left = `${h - c}px`;
        n.top = `${d - l}px`;
        n.opacity = 1;
        n.$emit("open-context-menu", Object(P.a)(Object(P.a)({}, i), {}, {
          index: e
        }));
      });
    }
```

## `closeContextMenuOutside`

参数：`t`

```js
function (t) {
      if (this.showContextMenu) {
        var e = this.$refs["context-menu"];
        if (e && !e.contains(t.target)) {
          this.showContextMenu = false;
          this.$emit("close-context-menu", null);
        }
      }
    }
```

## `toggleTag`

参数：`t, e`

```js
function (t, e) {
      this.$emit("toggle-tag", Object(P.a)(Object(P.a)({}, t), {}, {
        index: e
      }));
    }
```

## `closeTag`

参数：`t, e`

```js
function (t, e) {
      this.$emit("close-tag", Object(P.a)(Object(P.a)({}, t), {}, {
        index: e
      }));
    }
```

## `requestAnimationFrame`

参数：`function (`

```js
requestAnimationFrame(function () {
        var t = n.$refs["context-menu"].getBoundingClientRect();
        var o = t.width;
        var u = t.height;
        var h = a.left + o > r ? r - o : a.left;
        var d = a.top + u > s ? s - u : a.top;
        n.left = `${h - c}px`;
        n.top = `${d - l}px`;
        n.opacity = 1;
        n.$emit("open-context-menu", Object(P.a)(Object(P.a)({}, i), {}, {
          index: e
        }));
      }
```
