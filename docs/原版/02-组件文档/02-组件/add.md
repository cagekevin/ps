# add

> 来源：`app/56d7.js`　大小：2.2KB
> 特征：data / methods

## computed（2）

`groups`、`actions`

## methods（7）

`fetchData`、`choose`、`onCheckAllChange`、`toggleAll`、`onCheckChange`、`cancel`、`confirm`

## jsx 调用（PS 能力）

- `dz_getActionList`

## 源码

```js
{
  name: "add",
  components: {
    "cep-modal": Yt,
    "select-box": kS,
    "check-box": cu.a
  },
  data: function () {
    return {
      indeterminate: false,
      checkAll: false,
      data: [],
      current: 0
    };
  },
  computed: {
    groups: function () {
      return this.data.map(function (t, e) {
        return {
          id: e,
          label: t.name
        };
      });
    },
    actions: function () {
      return (this.data[this.current] || {
        children: []
      }).children;
    }
  },
  mounted: function () {
    this.fetchData();
  },
  methods: {
    fetchData: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.$cep.jsxNoCheck("dz_getActionList");
              case 2:
                t.data = e.sent;
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    choose: function (t) {
      this.current = t;
    },
    onCheckAllChange: function (t) {
      this.toggleAll(t.target.checked);
      this.indeterminate = false;
    },
    toggleAll: function (t) {
      var e = this.data[this.current].children;
      e.forEach(function (e) {
        e.isAdd = t;
      });
    },
    onCheckChange: function (t, e) {
      var n = this.data[this.current].children;
      n[e].isAdd = t.target.checked;
      var a = n.reduce(function (t, e) {
        if (e.isAdd) {
          return t + 1;
        } else {
          return t;
        }
      }, 0);
      this.indeterminate = a > 0 && a < n.length;
      this.checkAll = a > 0 && a === n.length;
    },
    cancel: function () {
      this.$emit("cancel");
    },
    confirm: function () {
      var t = [];
      this.data.forEach(function (e) {
        var n = e.name;
        e.children.forEach(function (e) {
          if (e.isAdd) {
            t.push({
              group: n,
              name: e.name
            });
          }
        });
      });
      this.$emit("confirm", t);
    }
  }
}
```