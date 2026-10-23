# font-manage-layouts-hcf · 方法实现

> 来源：`font-manage-layouts-hcf.js`
> 方法数：6

## `openModal`

参数：`t`

```js
function (t) {
      this.showModal = true;
      this.showDrawer = false;
      this.showDialog = false;
      this.context = t;
    }
```

## `closeModal`


```js
function () {
      this.showModal = false;
      this.showDrawer = false;
      this.showDialog = false;
    }
```

## `toggleDrawer`

参数：`t`

```js
function (t) {
      this.showDrawer = !this.showDrawer;
      this.showModal = false;
      this.showDialog = false;
      this.context = t;
    }
```

## `openDialog`

参数：`t`

```js
function (t) {
      this.showDialog = true;
      this.showModal = false;
      this.showDrawer = false;
      this.context = t;
    }
```

## `closeDialog`


```js
function () {
      this.showDialog = false;
      this.showModal = false;
      this.showDrawer = false;
    }
```

## `closeOutside`

参数：`t`

```js
function (t) {
      var e = this.$refs.modal;
      var n = this.$refs.drawer;
      var a = this.$refs.dialog;
      if (e && e.contains(t.target)) {
        this.showModal = true;
        this.showDrawer = false;
        this.showDialog = false;
      } else if (n && n.contains(t.target)) {
        this.showModal = false;
        this.showDrawer = true;
        this.showDialog = false;
      } else if (a && a.contains(t.target)) {
        this.showModal = false;
        this.showDrawer = false;
        this.showDialog = true;
      } else {
        this.showModal = false;
        this.showDrawer = false;
        this.showDialog = false;
      }
    }
```
