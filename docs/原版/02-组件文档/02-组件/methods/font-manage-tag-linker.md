# font-manage-tag-linker · 方法实现

> 来源：`font-manage-tag-linker.js`
> 方法数：8

## `pinTag`

参数：`t`

```js
function (t) {
      this.beRemoved = t;
    }
```

## `unpinTag`


```js
function () {
      this.beRemoved = null;
    }
```

## `addUserTag`

参数：`t`

```js
function (t) {
      this.$emit("add-user-tag", {
        text: t,
        autoClose: false
      });
    }
```

## `toggleFontTag`

参数：`t`

```js
function (t) {
      this.$emit("filter-by-user-tag", Object(P.a)(Object(P.a)({}, t), {}, {
        index: undefined
      }));
    }
```

## `removeUserTagFromFont`

参数：`t`

```js
function (t) {
      this.$emit("remove-user-tag-from-font", Object(P.a)(Object(P.a)({}, t), {}, {
        index: undefined
      }));
    }
```

## `toggleTag`

参数：`t`

```js
function (t) {
      if (this.font) {
        this.$emit("add-user-tag-to-font", Object(P.a)(Object(P.a)({}, t), {}, {
          index: undefined
        }));
      } else {
        this.$emit("filter-by-user-tag", t);
      }
    }
```

## `removeTag`


```js
function () {
      this.$emit("remove-user-tag", this.beRemoved);
    }
```

## `renameTag`


```js
function () {
      this.$emit("rename-user-tag", this.beRemoved);
    }
```
