# font-manage-tag-group

> 来源：`app/56d7.js`　大小：2.2KB
> 特征：props / data / methods

## 子组件

`Tag`

## props（4）

`tags`、`closable`、`selectable`、`hasContextMenu`

## methods（5）

`openContextMenu`、`closeContextMenuOutside`、`toggleTag`、`closeTag`、`requestAnimationFrame`

## 源码

```js
{
  name: "font-manage-tag-group",
  components: {
    Tag: fb
  },
  props: {
    tags: {
      type: Array,
      required: true
    },
    closable: {
      type: Boolean,
      default: false
    },
    selectable: {
      type: Boolean,
      default: true
    },
    hasContextMenu: {
      type: Boolean,
      default: false
    }
  },
  data: function () {
    var t = this;
    return {
      left: "-9999px",
      top: "-9999px",
      opacity: 0,
      showContextMenu: false,
      closeContextMenu: function () {
        t.showContextMenu = false;
      }
    };
  },
  created: function () {
    var t = this;
    Zv = function (e) {
      return t.closeContextMenuOutside(e);
    };
    window.addEventListener("click", Zv);
  },
  beforeDestroy: function () {
    window.removeEventListener("click", Zv);
  },
  methods: {
    openContextMenu: function (t, e) {
      var n = this;
      var a = t.event;
      var i = Object(Vn.a)(t, pb);
      var r = window.document.body.clientWidth - 8;
      var s = window.document.body.clientHeight - 8;
      var o = this.$refs["tag-group"].getBoundingClientRect();
      var c = o.left;
      var l = o.top;
      this.showContextMenu = true;
      this.opacity = 0;
      requestAnimationFrame(function () {
        var t = n.$refs["context-menu"].getBoundingClientRect();
        var o = t.width;
        var u = t.height;
        var h = a.left + o > r ? r - o : a.left;
        var d = a.top + u > s ? s - u : a.top;
        n.left = `${h - c}px`;
        n.top = `${d - l}px`;
        n.opacity = 1;
        n.$emit("open-context-menu", Object(P.a)(Object(P.a)({}, i), {}, {
          index: e
        }));
      });
    },
    closeContextMenuOutside: function (t) {
      if (this.showContextMenu) {
        var e = this.$refs["context-menu"];
        if (e && !e.contains(t.target)) {
          this.showContextMenu = false;
          this.$emit("close-context-menu", null);
        }
      }
    },
    toggleTag: function (t, e) {
      this.$emit("toggle-tag", Object(P.a)(Object(P.a)({}, t), {}, {
        index: e
      }));
    },
    closeTag: function (t, e) {
      this.$emit("close-tag", Object(P.a)(Object(P.a)({}, t), {}, {
        index: e
      }));
    }
  }
}
```