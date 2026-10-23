{
      components: {
        TopicBanner: rF,
        TopicTags: hF,
        NoMemoryDialog: $i,
        LimitationDialog: Di,
        MaterialList: Uf,
        TemplateList: Io,
        Preview: Oc
      },
      provide: function () {
        return {
          listTracker: dF
        };
      },
      data: function () {
        return {
          collapse: false,
          scrollTop: 0,
          list: [],
          pageInfo: {
            page_size: 120,
            page_num: 0,
            total: Infinity
          },
          currentModule: undefined,
          topic: undefined,
          initialLoading: false,
          modules: [],
          loading: false,
          isShowNoMemoryDialog: false
        };
      },
      computed: {
        loadedAll: function () {
          var t = this.pageInfo;
          var e = t.page_num;
          var n = t.page_size;
          var a = t.total;
          return e * n >= a;
        },
        topicType: function () {
          return this.$route.params.type;
        },
        topicId: function () {
          return this.$route.params.id;
        },
        materialType: function () {
          return this.topic && this.topic.material_type || "";
        },
        visible: function () {
          return this.$route.name === "TopicDetail";
        },
        isTryLimitShown: function () {
          return Ca.isTryLimitShown;
        },
        previewInfo: function () {
          return this.$store.state.templateCenter.previewInfo;
        }
      },
      watch: {
        visible: {
          handler: function (t) {
            if (t) {
              this.init();
            }
          },
          immediate: true
        },
        currentModule: function (t, e) {
          if (t !== e) {
            this.resetPageInfo();
            this.getContents();
          }
        }
      },
      mounted: function () {
        this.$appBus.on("isShowNoMemoryDialog", this.handleIsShowNoMemeryDialog);
      },
      methods: Object(P.a)(Object(P.a)({
        closePreview: function () {
          this.$store.commit("setPreviewInfo", null);
        },
        onDownload: function () {
          window.__download_to_target__ = {
            top: 12,
            left: 25
          };
        },
        resetPageInfo: function () {
          this.pageInfo.page_num = 0;
          this.pageInfo.total = Infinity;
        },
        init: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    t.resetPageInfo();
                    t.initialLoading = true;
                    e.prev = 2;
                    e.next = 5;
                    return t.getTopicDetail(t.topicId);
                  case 5:
                    t.topic = e.sent;
                    t.modules = t.topic.modules;
                    t.currentModule = t.modules[0];
                    e.next = 10;
                    return t.getContents();
                  case 10:
                    e.prev = 10;
                    t.initialLoading = false;
                    return e.finish(10);
                  case 13:
                  case "end":
                    return e.stop();
                }
              }
            }, e, null, [[2,, 10, 13]]);
          }))();
        },
        getContents: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            var n;
            var a;
            var i;
            var r;
            var s;
            var o;
            var c;
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    n = t.pageInfo;
                    a = n.page_num;
                    i = n.page_size;
                    t.loading = true;
                    e.prev = 2;
                    e.next = 5;
                    return t.getTopicContents({
                      id: t.topic.id,
                      modules_id: t.currentModule.id,
                      page_num: a + 1,
                      page_size: i
                    });
                  case 5:
                    s = e.sent;
                    o = s.items.map(function (t) {
                      return t;
                    });
                    c = o.length;
                    if (c < t.pageInfo.page_size) {
                      t.pageInfo.total = c + a * i;
                    }
                    t.pageInfo.page_num += 1;
                    (r = t.list).splice.apply(r, [i * (a - 1), i].concat(Object(ct.a)(o)));
                  case 11:
                    e.prev = 11;
                    t.loading = false;
                    return e.finish(11);
                  case 14:
                  case "end":
                    return e.stop();
                }
              }
            }, e, null, [[2,, 11, 14]]);
          }))();
        },
        onScrollList: hf()(function (t) {
          if (this.scrollTop >= t.scrollTop && t.scrollTop < 5) {
            this.collapse = false;
          } else {
            this.collapse = true;
          }
          this.scrollTop = t.scrollTop;
        }, 100, {
          leading: true
        })
      }, Object(mu.b)("topic", ["getTopicDetail", "getTopicContents"])), {}, {
        nextPage: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    if (!t.loadedAll) {
                      e.next = 2;
                      break;
                    }
                    return e.abrupt("return");
                  case 2:
                    if (!t.loading) {
                      e.next = 4;
                      break;
                    }
                    return e.abrupt("return");
                  case 4:
                    e.next = 6;
                    return t.getContents();
                  case 6:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          }))();
        },
        expose: function (t) {},
        showTryLimitDialog: function () {
          Ca.isTryLimitShown = true;
        },
        closeTryLimitDialog: function () {
          Ca.isTryLimitShown = false;
        },
        handleIsShowNoMemeryDialog: function (t) {
          this.dialogs.noMemoryDialog = t;
        },
        routeBack: function () {
          this.$router.back();
        },
        routeToCenter: function () {
          this.$router.push(`/topics/${this.topicType}`);
        }
      })
    }