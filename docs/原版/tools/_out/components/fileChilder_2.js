{
      name: "fileChilder",
      components: {
        GIcon: ie.a
      },
      props: {
        forData: null,
        index: null,
        num: null,
        selectId: null
      },
      data: function () {
        return {};
      },
      methods: {
        getFolderLineLength: function (t) {
          var e = function t(e) {
            if (!e.showChildren) {
              return 0;
            }
            var n = e.children.reduce(function (e, n) {
              var a = e + (n.showChildren ? t(n) : 0);
              return a;
            }, e.children.length);
            return n;
          };
          var n = e(t);
          return n * 25 + "px";
        },
        setShowChildren: function (t) {
          t.showChildren = !t.showChildren;
          this.$emit("changeShowChildren");
        },
        select: function (t, e) {
          this.$emit("changeId", e.id);
        },
        changeId: function (t) {
          this.$emit("changeId", t);
        }
      }
    }