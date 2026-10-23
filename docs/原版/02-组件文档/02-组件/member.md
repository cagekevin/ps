# member

> 来源：`app/56d7.js`　大小：6.8KB
> 特征：props / data / methods

## 子组件

`GButton`、`ActivateModal`、`ConfirmPayModal`、`Icon`、`GTooltip`

## props（7）

`getAccessToken`、`postRequest`、`getRequest`、`userService`、`umsHost`、`pszhuliHost`、`cepId`

## computed（10）

`userName`、`userId`、`userVipIsMulti`、`userIsForever`、`userEdition`、`userVipExpiredTime`、`expirationTips`、`operationKey`、`operationDesc`、`isForeverMember`

## methods（5）

`toBuy`、`updateVip`、`showUpVip`、`showConfirmPayModal`、`finishPay`

## 接口调用

- `v1/user-vip/active`
- `v1/user-vip`

## 文案（5）

永久 · 激活失败 · 版会员兑换成功 · 会员已生效 · 未完成支付

## 源码

```js
{
  name: "member",
  components: {
    GButton: Wt.a,
    ActivateModal: GO,
    ConfirmPayModal: YO,
    Icon: Jt.a,
    GTooltip: jo.a
  },
  props: {
    getAccessToken: {
      type: Function,
      default: function () {}
    },
    postRequest: {
      type: Function,
      default: function () {}
    },
    getRequest: {
      type: Function,
      default: function () {}
    },
    userService: {
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
    cepId: {
      type: String,
      default: "CEP001"
    }
  },
  data: function () {
    return {
      showInput: false,
      confirmLoading: false,
      confirmPayModalVisible: false,
      confirmPayModalLoading: false
    };
  },
  computed: {
    userName: function () {
      return Object(ne.get)(this.userService, "user.gdUserInfo.nick") || Object(ne.get)(this.userService, "user.gdUserInfo.userName") || "";
    },
    userId: function () {
      return Object(ne.get)(this.userService, "user.gdUserInfo.user_id") || "";
    },
    userVipIsMulti: function () {
      return Object(ne.get)(this.userService, "user.vipInfo.isMulti");
    },
    userIsForever: function () {
      return Object(ne.get)(this.userService, "user.vipInfo.isForever");
    },
    userEdition: function () {
      return Object(ne.get)(this.userService, "user.vipInfo.edition");
    },
    userVipExpiredTime: function () {
      if (this.userIsForever) {
        return "永久";
      } else {
        return Object(ne.get)(this.userService, "expiredTime");
      }
    },
    expirationTips: function () {
      return Object(ne.get)(this.userService, "expirationTips") || {};
    },
    operationKey: function () {
      var t = Object(ne.get)(this.userService, "user.attachedMemberType");
      if (this.cepId === "CEP001") {
        switch (t) {
          case ZO["not-member"]:
            return "join";
          case ZO["trial-member"]:
            return "renew";
          case ZO["life-member"]:
            return "upgrade";
          case ZO["ordinary-member"]:
            return "renewAndUpgrade";
          default:
            return "";
        }
      }
      if (t === ZO["trial-member"] || t === ZO["not-member"]) {
        return "join";
      } else if (t === ZO["ordinary-member"]) {
        return "renew";
      } else {
        return "";
      }
    },
    operationDesc: function () {
      return QO[this.operationKey];
    },
    isForeverMember: function () {
      return Object(ne.get)(this.userService, "isForeverMember") || false;
    }
  },
  methods: {
    toBuy: function () {
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
                a = t.umsHost;
                i = t.pszhuliHost;
                r = t.cepId;
                t.userService.toBuy({
                  accessToken: n,
                  umsHost: a,
                  pszhuliHost: i,
                  buyQuery: {
                    gt: r
                  }
                });
                t.showConfirmPayModal();
              case 6:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    updateVip: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        var i;
        var r;
        var s;
        var o;
        var c;
        var l;
        var u;
        var d;
        var f;
        var p;
        var m;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                e.$createElement;
                e.confirmLoading = true;
                a = {
                  code: t.replace(/\s*/g, "")
                };
                n.next = 5;
                return Object(Pt.a)(e.postRequest("v1/user-vip/active", a));
              case 5:
                i = n.sent;
                r = Object(h.a)(i, 2);
                s = r[0];
                o = r[1];
                if (!s) {
                  n.next = 15;
                  break;
                }
                c = s.response.data.message || "激活失败";
                l = c.split(/[，,]/);
                G.a.warning(function (t) {
                  return t("span", [l.map(function (e, n) {
                    return t("span", {
                      key: e
                    }, [n !== 0 ? t("br") : "", e]);
                  })]);
                });
                e.confirmLoading = false;
                return n.abrupt("return");
              case 15:
                u = o.data.msg;
                G.a.success(`${u}版会员兑换成功`);
                n.next = 19;
                return Object(Pt.a)(e.getRequest("v1/user-vip"));
              case 19:
                d = n.sent;
                f = Object(h.a)(d, 2);
                p = f[0];
                m = f[1];
                if (!p) {
                  n.next = 25;
                  break;
                }
                return n.abrupt("return");
              case 25:
                e.userService.updateRight(m.data);
                e.showInput = false;
                e.confirmLoading = false;
              case 28:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    },
    showUpVip: function () {
      this.showInput = true;
    },
    showConfirmPayModal: function () {
      this.confirmPayModalVisible = true;
    },
    finishPay: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        var a;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                t.confirmPayModalLoading = true;
                e.prev = 1;
                e.next = 4;
                return t.getRequest("v1/user-vip");
              case 4:
                n = e.sent;
                a = t.userService.updateRightAfterPay(n.data);
                if (a) {
                  G.a.success("会员已生效");
                } else {
                  G.a.warning("未完成支付");
                }
              case 7:
                e.prev = 7;
                t.confirmPayModalVisible = false;
                t.confirmPayModalLoading = false;
                return e.finish(7);
              case 11:
              case "end":
                return e.stop();
            }
          }
        }, e, null, [[1,, 7, 11]]);
      }))();
    }
  }
}
```