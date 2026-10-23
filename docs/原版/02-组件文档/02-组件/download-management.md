# download-management

> 来源：`app/56d7.js`　大小：0.7KB
> 特征：data

## 子组件

`DownloadProgressBtn`、`DownloadListPanel`

## computed（2）

`list`、`totalDownloadProgress`

## 源码

```js
{
  name: "download-management",
  components: {
    DownloadProgressBtn: Yi,
    DownloadListPanel: _s
  },
  data: function () {
    return {
      visible: false
    };
  },
  created: function () {
    var t = this;
    as = function (e) {
      var n = t.$refs["download-management"];
      if (!n || !n.contains(e.target)) {
        t.visible = false;
      }
    };
    window.addEventListener("click", as);
  },
  beforeDestroy: function () {
    window.removeEventListener("click", as);
  },
  computed: {
    list: function () {
      return Ca.list.filter(function (t) {
        return t.type === "template" && !!t.preview;
      });
    },
    totalDownloadProgress: function () {
      return Ca.totalDownloadProgress;
    }
  }
}
```