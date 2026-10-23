# font-manage-user-tag-filter · 方法实现

> 来源：`font-manage-user-tag-filter.js`
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

## `toggleTag`

参数：`t`

```js
function (t) {
      this.$emit("filter-by-user-tag", t);
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

## `toggleTagManage`


```js
function () {
      this.$emit("toggle-tag-manage");
    }
```

## `toggleUserTagContainer`


```js
function () {
      this.open = !this.open;
    }
```

## `togglePreview`


```js
function () {
      var t = this.$refs["user-tags"].getBoundingClientRect().height;
      if (t >= 94) {
        this.open = this.open || false;
        this.show = true;
      } else {
        this.show = false;
        this.open = false;
      }
    }
```
