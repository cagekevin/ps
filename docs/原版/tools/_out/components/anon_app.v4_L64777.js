{
      components: {
        Icon: Jt.a,
        Item: JI
      },
      data: function () {
        return {
          intersectionObserver: undefined
        };
      },
      computed: Object(P.a)(Object(P.a)({}, Object(mu.d)("topic", {
        topics: function (t) {
          return t.topics;
        },
        loading: function (t) {
          return t.loading;
        },
        pageInfo: function (t) {
          return t.topicsPageInfo;
        }
      })), {}, {
        topicType: function () {
          return this.$route.params.type;
        },
        topicText: function () {
          return {
            material: "素材",
            template: "模版",
            "": ""
          }[this.topicType || ""];
        },
        list: function () {
          var t = this;
          return this.topics.filter(function (e) {
            return e.type === t.topicType;
          });
        },
        visible: function () {
          return this.$route.name === "TopicCenter";
        }
      }),
      watch: {
        visible: function (t) {
          if (t) {
            this.init();
          }
        }
      },
      mounted: function () {
        var t = this;
        this.intersectionObserver = new IntersectionObserver(function () {
          var e = Object(d.a)(regeneratorRuntime.mark(function e(n) {
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    if (!(n[0].intersectionRatio <= 0)) {
                      e.next = 2;
                      break;
                    }
                    return e.abrupt("return");
                  case 2:
                    if (!(t.pageInfo.total <= t.pageInfo.page_num * t.pageInfo.page_size)) {
                      e.next = 4;
                      break;
                    }
                    return e.abrupt("return");
                  case 4:
                    e.next = 6;
                    return t.getTopics(t.pageInfo);
                  case 6:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          }));
          return function (t) {
            return e.apply(this, arguments);
          };
        }());
        this.intersectionObserver.observe(this.$refs.loadMore);
      },
      methods: Object(P.a)(Object(P.a)(Object(P.a)({
        init: function () {
          this.setTopics([]);
          this.getTopics({
            page_size: 20,
            page_num: 1,
            total: Infinity
          });
        }
      }, Object(mu.b)("topic", ["getTopics"])), Object(mu.c)("topic", ["setTopics"])), {}, {
        routeBack: function () {
          this.$router.back();
        },
        routeDetail: function (t) {
          this.$router.push(`/topic/${this.topicType}/${t.id}`);
        }
      })
    }