# font-manage-layouts-hcf

> 来源：`app/56d7.js`　大小：1.8KB
> 特征：data / methods

## methods（6）

`openModal`、`closeModal`、`toggleDrawer`、`openDialog`、`closeDialog`、`closeOutside`

## 源码

```js
{
  name: "font-manage-layouts-hcf",
  data: function () {
    return {
      showModal: false,
      showDrawer: false,
      showDialog: false,
      context: null
    };
  },
  created: function () {
    var t = this;
    this.temp = function (e) {
      return t.closeOutside(e);
    };
    window.addEventListener("click", this.temp);
  },
  beforeDestroy: function () {
    window.removeEventListener("click", this.temp);
  },
  methods: {
    openModal: function (t) {
      this.showModal = true;
      this.showDrawer = false;
      this.showDialog = false;
      this.context = t;
    },
    closeModal: function () {
      this.showModal = false;
      this.showDrawer = false;
      this.showDialog = false;
    },
    toggleDrawer: function (t) {
      this.showDrawer = !this.showDrawer;
      this.showModal = false;
      this.showDialog = false;
      this.context = t;
    },
    openDialog: function (t) {
      this.showDialog = true;
      this.showModal = false;
      this.showDrawer = false;
      this.context = t;
    },
    closeDialog: function () {
      this.showDialog = false;
      this.showModal = false;
      this.showDrawer = false;
    },
    closeOutside: function (t) {
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
  }
}
```