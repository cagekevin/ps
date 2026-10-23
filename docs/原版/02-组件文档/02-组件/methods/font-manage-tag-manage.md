# font-manage-tag-manage · 方法实现

> 来源：`font-manage-tag-manage.js`
> 方法数：8

## `addUserTag`

参数：`t`

```js
function (t) {
      this.$emit("add-user-tag", t);
    }
```

## `toggleFontTag`

参数：`t`

```js
function (t) {
      this.$emit("filter-by-user-tag", t);
    }
```

## `removeUserTagFromFont`

参数：`t`

```js
function (t) {
      this.$emit("remove-user-tag-from-font", t);
    }
```

## `addUserTagToFont`

参数：`t`

```js
function (t) {
      this.$emit("add-user-tag-to-font", t);
    }
```

## `filterByUserTag`

参数：`t`

```js
function (t) {
      this.$emit("filter-by-user-tag", t);
    }
```

## `removeUserTag`

参数：`t`

```js
function (t) {
      this.$emit("remove-user-tag", t);
    }
```

## `renameUserTag`

参数：`t`

```js
function (t) {
      this.$emit("rename-user-tag", t);
    }
```

## `cancelAddUserTag`


```js
function () {
      this.$emit("cancel-add-user-tag");
    }
```
