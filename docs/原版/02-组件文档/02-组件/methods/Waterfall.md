# Waterfall · 方法实现

> 来源：`Waterfall.js`
> 方法数：10

## `handleSetIsNeedScroll`

参数：`t`

```js
function (t) {
      this.isNeedScroll = t;
    }
```

## `handleScroll`

参数：`t`

```js
function (t) {
      this.$emit("scroll", t);
    }
```

## `loadMore`


```js
function () {
      this.$emit("loadMore");
    }
```

## `reset`


```js
function () {
      this.columnItems = [];
      this.collection = [];
    }
```

## `refreshColumns`


```js
function () {
      if (this.columns) {
        this.reset();
        for (var t = 0; t < this.columns; t++) {
          this.columnItems.push({
            height: 0,
            len: 0,
            items: []
          });
        }
        this.handleColumnData(this.data, this.columnItems);
        this.flatColumnData();
      }
    }
```

## `handleColumnData`

参数：`t, e, n`

```js
function (t, e, n) {
      var a = this;
      if (t) {
        t.forEach(function (t, i) {
          var r = a.getItemSize(t);
          var s = r + a.gaps[1];
          var o = e.reduce(function (t, e) {
            if (t.height > e.height) {
              return e;
            } else {
              return t;
            }
          }, e[0]);
          o.len++;
          o.height += s;
          var c = Object(P.a)(Object(P.a)({}, t), {}, {
            _index: (n || 0) + i,
            _width: a.actualWidth,
            _height: r,
            key: Object(ne.get)(t, a.keyProp || "")
          });
          o.items.push(c);
        });
      }
    }
```

## `flatColumnData`


```js
function () {
      var t = this;
      var e = this.columnItems.map(function (t) {
        return t.len;
      });
      for (var n = Math.max.apply(null, e), a = function (e) {
          t.columnItems.forEach(function (n, a) {
            if (n.items[e]) {
              var i = Object(P.a)(Object(P.a)({}, n.items[e]), {}, {
                x: a * t.actualWidth + a * t.gaps[0],
                y: t.getItemYOffset(n.items, e)
              });
              t.collection.push({
                data: i
              });
            }
          });
        }, i = 0; i < n; i++) {
        a(i);
      }
    }
```

## `getItemYOffset`

参数：`t, e`

```js
function (t, e) {
      if (e === 0) {
        return 0;
      }
      var n = 0;
      for (var a = 0; a < e; a++) {
        n += t[a]._height + this.gaps[1] + this.extraHeight;
      }
      return n;
    }
```

## `cellSizeAndPositionGetter`

参数：`t`

```js
function (t) {
      var e = t.data;
      return {
        width: e._width,
        height: e._height,
        x: e.x,
        y: e.y
      };
    }
```

## `getItemSize`

参数：`t`

```js
function (t) {
      var e = t.height / t.width * this.actualWidth;
      return Math.floor(Math.max(Math.min(this.actualWidth * this.maxRatio, e), this.actualWidth * this.minRatio));
    }
```
