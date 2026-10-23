# buy-reminder-dialog

> 来源：`app/56d7.js`　大小：1.6KB
> 特征：props / data / methods

## 子组件

`CepModal`

## props（8）

`remainDay`、`features`、`isTrialMember`、`getAccessToken`、`buyQuery`、`umsHost`、`pszhuliHost`、`userService`

## methods（2）

`handleClose`、`jumpToBuy`

## 源码

```js
{
  name: "buy-reminder-dialog",
  components: {
    CepModal: Yt
  },
  props: {
    remainDay: {
      type: Number,
      default: 0
    },
    features: {
      type: Array,
      default: []
    },
    isTrialMember: {
      type: Boolean,
      default: false
    },
    getAccessToken: {
      type: Function,
      default: function () {}
    },
    buyQuery: {
      type: Object,
      default: function () {
        return {};
      }
    },
    umsHost: {
      type: String,
      default: ""
    },
    pszhuliHost: {
      type: String,
      default: ""
    },
    userService: {
      type: Object,
      default: function () {
        return {};
      }
    }
  },
  data: function () {
    return {};
  },
  methods: {
    handleClose: function () {
      this.$emit("close");
    },
    jumpToBuy: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        var a;
        var i;
        var r;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.getAccessToken();
              case 2:
                n = e.sent;
                a = t.buyQuery;
                i = t.umsHost;
                r = t.pszhuliHost;
                t.userService.toBuy({
                  accessToken: n,
                  umsHost: i,
                  pszhuliHost: r,
                  buyQuery: a
                });
              case 5:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    }
  }
}
```