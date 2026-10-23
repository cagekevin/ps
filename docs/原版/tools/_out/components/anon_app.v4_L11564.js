{
      components: {
        BuyReminderDialog: ee,
        Icon: ie.a
      },
      props: {
        trailOverdueDays: {
          type: Number,
          default: 0
        }
      },
      data: function () {
        return {
          features: [{
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
          }],
          userService: re,
          umsHost: "https://ums.gaoding.com",
          pszhuliHost: "https://www.pszhuli.com"
        };
      },
      computed: {
        isTrialMember: function () {
          return Object(ne.get)(this.userService, "isTrialMember") || false;
        }
      },
      methods: {
        handleClose: function () {
          this.$emit("close");
        },
        openUrl: function (t) {
          this.$cep.openUrl(t);
        },
        getAccessToken: function () {
          return ae.a.getAccessToken();
        }
      }
    }