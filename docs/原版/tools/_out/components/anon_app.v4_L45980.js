{
          data: function () {
            return {
              searchText: "",
              previewText: "",
              previewMode: xg[1].mode,
              userTags: [],
              tagFilters: [],
              tagCategories: {},
              page: 1,
              pageSize: 30,
              fonts: [],
              groups: {},
              ratings: {},
              commercials: {},
              languages: {}
            };
          },
          computed: {
            total: function () {
              return this.fontInfo.total;
            },
            fontList: function () {
              return this.fontInfo.fonts.slice(0, this.page * this.pageSize);
            },
            fontInfo: function () {
              return Aw(e.presets, this.groups, this.ratings, this.commercials, this.fonts, this.searchText, this.userTags, this.tagFilters);
            },
            groupMap: function () {
              return Object.keys(e.groups).reduce(function (t, n) {
                var a = n.split(_g);
                var i = Object(h.a)(a, 3);
                var r = i[0];
                i[1];
                var s = i[2];
                t[r] ||= [];
                if (e.userTagMap.has(s)) {
                  t[r].push(e.userTagMap.get(s));
                }
                return t;
              }, {});
            }
          }
        }