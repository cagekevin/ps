{
      data: function () {
        return {
          istrue: false,
          cyLinkObject: -1,
          set: V.a.info
        };
      },
      watch: {},
      computed: {},
      methods: {
        linkToSmart: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    t.$load.show("正在转回普通智能对象...");
                    e.next = 3;
                    return t.$cep.jsxHistory("cy_linkSmartObjectToSmartObject", [], "转智能对象");
                  case 3:
                    t.$load.hide();
                  case 4:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          }))();
        },
        toLinkSmart: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    t.$load.show("正在转链接智能对象...");
                    e.next = 3;
                    return t.$cep.jsxHistory("cy_smartToLinkSmartObject", [], "转链接智能对象");
                  case 3:
                    t.$load.hide();
                  case 4:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          }))();
        }
      },
      mounted: function () {}
    }