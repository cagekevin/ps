# VirtualLayoutWF · 方法实现

> 来源：`VirtualLayoutWF.js`
> 方法数：10

## `getBackTopTarget`


```js
function () {
      return this.$refs.outer;
    }
```

## `getItemOnlyKey`

参数：`t`

```js
function (t) {
      var e = Object(ne.get)(t, this.itemIdPosition);
      return e || t.key;
    }
```

## `getComputedStyle`

参数：`t`

```js
function (t) {
      if (t) {
        var e = this.groupManagers[t.groupIndex];
        if (e) {
          var n = e.getCellMetadata(t.itemIndex);
          if (n) {
            var a = n.width;
            var i = n.height;
            var r = n.x;
            var s = n.y;
            return {
              transform: `translateX(${r}px) translateY(${s}px)`,
              width: `${a}px`,
              height: `${i}px`
            };
          }
        }
      }
    }
```

## `refreshCollection`


```js
function () {
      this.groupManagers.forEach(function (t) {
        return t.dispose();
      });
      this.groupManagers = [];
      this.totalHeight = 0;
      this.onCollectionChanged();
    }
```

## `onCollectionChanged`


```js
function () {
      var t = this;
      var e = this.collection;
      if (e.length > 0 && e[0].group === undefined) {
        e = [{
          group: e
        }];
      }
      e.forEach(function (e, n) {
        var a = n;
        var i = t.$watch(function () {
          return e;
        }, function () {
          return t.onGroupChanged(e.group, a);
        }, {
          deep: true
        });
        t.groupManagers.push(new io(e.group, a, t.sectionSize, t.cellSizeAndPositionGetter, i));
      });
      this.updateGridDimensions();
      this.flushDisplayItems();
    }
```

## `updateGridDimensions`


```js
function () {
      this.totalHeight = Math.max.apply(Math, Object(ct.a)(this.groupManagers.map(function (t) {
        return t.totalHeight;
      })));
      this.totalWidth = Math.max.apply(Math, Object(ct.a)(this.groupManagers.map(function (t) {
        return t.totalWidth;
      })));
    }
```

## `onGroupChanged`

参数：`t, e`

```js
function (t, e) {
      this.groupManagers[e].updateGroup(t);
      this.updateGridDimensions();
      this.flushDisplayItems();
    }
```

## `onScroll`

参数：`t`

```js
function (t) {
      this.flushDisplayItems();
    }
```

## `loadMore`


```js
function () {
      var t = this;
      var e = this.$refs.outer;
      if (!e) {
        return false;
      }
      var n = e.scrollTop || 0;
      this.$nextTick(function () {
        t.$emit("scroll", {
          scrollTop: n || 0
        });
        if (e.clientHeight && n + e.clientHeight >= e.scrollHeight - Number(t.preloadDistance)) {
          t.$emit("loadMore");
        }
      });
    }
```

## `flushDisplayItems`


```js
function () {
      var t = this;
      var e = 0;
      var n = 0;
      if (this.$refs.outer) {
        e = this.$refs.outer.scrollTop - this.slotHeight;
      }
      var a = [];
      var i = this.columns > 2 ? 2 : 1;
      this.groupManagers.forEach(function (r, s) {
        var o = r.getCellIndices({
          height: t.height * i,
          width: t.width,
          x: n,
          y: e
        });
        o.forEach(function (t) {
          a.push(Object.freeze(Object(P.a)({
            groupIndex: s,
            itemIndex: t,
            key: a.length
          }, r.getItem(t))));
        });
      });
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(function () {
          t.displayItems = a;
        });
      } else {
        this.displayItems = a;
      }
      this.loadMore();
    }
```
