{
      components: {
        IconFont: ie.a
      },
      props: {
        type: {
          type: String,
          default: "limit"
        },
        trailOverdueDays: {
          type: Number,
          default: 0
        }
      },
      data: function () {
        return {
          functionList: [{
            label: "海量精品模板/素材",
            decr: "全行业覆盖，持续更新，免费使用",
            icon: "layer_outline"
          }, {
            label: "商用零风险",
            decr: "提供商用授权书，保障商用无忧",
            icon: "protect"
          }, {
            label: "十大功能板块",
            decr: "批量套版等功能，简化设计流程",
            icon: "upgrade"
          }]
        };
      },
      created: function () {
        this.handleTracker("showTrialDialog");
      },
      methods: {
        handleTracker: function (t, e) {
          this.$emit("handleTrack", {
            method: t,
            params: e
          });
        },
        handleClose: function (t) {
          this.$emit("close");
          this.handleTracker("operateTrialDialog", {
            action_type: t
          });
        },
        getAccessToken: function () {
          return ae.a.getAccessToken();
        },
        jumpToBuy: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            var n;
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    t.handleTracker("operateTrialDialog", {
                      action_type: "立即加入"
                    });
                    e.next = 3;
                    return t.getAccessToken();
                  case 3:
                    n = e.sent;
                    Mi.toBuy({
                      accessToken: n,
                      umsHost: "https://ums.gaoding.com",
                      pszhuliHost: "https://www.pszhuli.com",
                      buyQuery: {
                        gt: "CEP001"
                      }
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