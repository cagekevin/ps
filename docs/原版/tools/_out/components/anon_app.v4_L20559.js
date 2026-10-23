{
      props: {
        item: Object,
        show: {
          type: Boolean,
          default: true
        }
      },
      data: function () {
        return {
          condition: Math.floor(Math.random() * 10000000)
        };
      },
      watch: {
        show: function (t, e) {
          if (!e && t) {
            this.addClickListener();
          } else if (e && !t) {
            this.removeClickListener();
          }
        }
      },
      methods: {
        openFile: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    e.next = 2;
                    return Ca.openContent(Object(P.a)(Object(P.a)({}, t.item), {}, {
                      type: "template"
                    }));
                  case 2:
                    t.$tracker.functionApply({
                      function_source: "模板库页_模板中心",
                      function_name: "创建设计稿"
                    });
                  case 3:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          }))();
        },
        useFile: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    e.next = 2;
                    return Ca.useContent(Object(P.a)(Object(P.a)({}, t.item), {}, {
                      type: "template"
                    }));
                  case 2:
                    t.$tracker.functionApply({
                      function_source: "模板库页_模板中心",
                      function_name: "应用到当前设计稿"
                    });
                  case 3:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          }))();
        },
        open: function () {
          this.$store.state.showMenu = this.condition;
        },
        close: function () {
          this.$store.state.showMenu = -1;
          this.$emit("close");
        },
        addClickListener: function () {
          var t = this;
          this.handleClick = function (e) {
            if (!t.$refs.menu.contains(e.target)) {
              t.close();
            }
          };
          window.addEventListener("click", this.handleClick, false);
        },
        removeClickListener: function () {
          window.removeEventListener("click", this.handleClick, false);
        }
      }
    }