{
      name: "user-font-page-content",
      components: {
        Empty: Yw,
        FontList: Dx
      },
      inject: ["userFont", "pushFiles"],
      computed: {
        total: function () {
          return Rw.total;
        },
        fonts: function () {
          return Rw.fontList;
        },
        groups: function () {
          return Rw.groupMap;
        },
        ratings: function () {
          return Rw.ratings;
        },
        previewText: function () {
          return Rw.previewText;
        },
        previewMode: function () {
          return Rw.previewMode;
        },
        commercials: function () {
          return Rw.commercials;
        },
        languages: function () {
          return Rw.languages;
        }
      },
      methods: {
        tagToFont: function (t) {
          this.$emit("set-current-font", t);
        },
        ratingToFont: function (t, e) {
          var n = this;
          return Object(d.a)(regeneratorRuntime.mark(function a() {
            return regeneratorRuntime.wrap(function (a) {
              while (1) {
                switch (a.prev = a.next) {
                  case 0:
                    a.prev = 0;
                    Rw.ratings = {
                      family: t.family,
                      rate: e
                    };
                    a.next = 4;
                    return Rw.saveActivities(n.userFont);
                  case 4:
                    f.a.info({
                      msg: "FONT_MANAGE_RARING_SUCCESS",
                      extra: {
                        family: t.family,
                        rate: e
                      }
                    });
                    n.pushFiles([dw(n.userFont)]);
                    a.next = 13;
                    break;
                  case 8:
                    a.prev = 8;
                    a.t0 = a.catch(0);
                    console.error("rating failed: ", a.t0);
                    cg.a.error("评分操作失败");
                    f.a.error(a.t0, {
                      msg: "FONT_MANAGE_RARING_ERR",
                      extra: a.t0.message
                    });
                  case 13:
                  case "end":
                    return a.stop();
                }
              }
            }, a, null, [[0, 8]]);
          }))();
        },
        selectFont: function (t) {
          this.$emit("select-font", t);
        },
        loadMore: function () {
          if (!(Rw.page * Rw.pageSize >= Rw.total)) {
            Rw.nextPage();
          }
        }
      }
    }