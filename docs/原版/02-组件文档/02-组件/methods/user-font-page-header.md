# user-font-page-header · 方法实现

> 来源：`user-font-page-header.js`
> 方法数：7

## `filterByText`

参数：`t`

```js
function (t) {
      Rw.searchText = t;
      Rw.resetPage();
    }
```

## `filterByUserTag`

参数：`t`

```js
function (t) {
      Rw.toggleUserTag(t);
      Rw.resetPage();
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

## `removeTagFilter`

参数：`t`

```js
function (t) {
      Rw.removeTagFilter(t);
      Rw.toggleTagCategory(Object(P.a)(Object(P.a)({}, t), {}, {
        selected: false
      }));
    }
```

## `toggleFilterPanel`


```js
function () {
      this.$emit("toggle-filter-panel");
    }
```

## `toggleTagManage`


```js
function () {
      this.$emit("unset-current-font");
    }
```
