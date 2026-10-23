# font-manage-list · 方法实现

> 来源：`font-manage-list.js`
> 方法数：7

## `getPreviewFontFamily`

参数：`t, e`

```js
function (t, e) {
      return `"${e[t.family] || t.postScriptNames[0]}", "${t.family}"`;
    }
```

## `selectFont`

参数：`t`

```js
function (t) {
      this.selectedFont = t.family;
      var e = this.indexes[t.family] || 0;
      this.$emit("select-font", {
        family: t.family,
        postScriptName: t.postScriptNames[e],
        name: t.names[e],
        weight: t.weights[e]
      });
    }
```

## `makeTag`

参数：`t`

```js
function (t) {
      this.$emit("tag-to-font", t);
    }
```

## `rating`

参数：`t, e`

```js
function (t, e) {
      this.$emit("rating-to-font", t, e);
    }
```

## `selectFontWeight`

参数：`t, e`

```js
function (t, e) {
      this.$set(this.postScriptNames, e.family, e.postScriptNames[t]);
      this.$set(this.indexes, e.family, t);
      this.selectedFont = e.family;
      this.$emit("select-font", {
        family: e.family,
        postScriptName: e.postScriptNames[t],
        name: e.names[t],
        weight: e.weights[t]
      });
    }
```

## `getContainerWidth`


```js
function () {
      var t = this.$refs["font-list"].getBoundingClientRect();
      var e = t.width;
      this.width = e;
    }
```

## `observing`

参数：`t`

```js
function (t) {
      var e = Object(h.a)(t, 1);
      var n = e[0];
      var a = document.body.clientHeight;
      if (n.isIntersecting || a > n.boundingClientRect.bottom) {
        this.$emit("load-more");
      }
    }
```
