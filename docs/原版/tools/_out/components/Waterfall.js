{
      name: "Waterfall",
      components: {
        VirtualLayoutWF: uo
      },
      props: {
        loading: {
          type: Boolean,
          default: false
        },
        data: {
          type: Array,
          required: true
        },
        columns: {
          type: Number,
          default: 5
        },
        keyProp: {
          type: String,
          default: ""
        },
        gap: {
          type: [Number, Array],
          default: 10
        },
        extraHeight: {
          type: Number,
          default: 30
        },
        clientWidth: {
          type: Number,
          required: true
        },
        clientHeight: {
          type: Number,
          required: true
        },
        minRatio: {
          type: Number,
          default: 0.3
        },
        maxRatio: {
          type: Number,
          default: 3
        },
        otherSlotHeight: {
          type: Number,
          default: 0
        },
        fixedHeight: {
          type: Number,
          default: 200
        },
        paddingRight: {
          type: Number,
          default: 8
        }
      },
      emits: ["scroll", "loadMore"],
      data: function () {
        return {
          columnItems: [],
          collection: [],
          isNeedScroll: ""
        };
      },
      computed: {
        gaps: function () {
          if (typeof this.gap === "number") {
            return [this.gap, this.gap];
          } else {
            return this.gap;
          }
        },
        actualWidth: function () {
          if (this.clientWidth === 0) {
            return 0;
          } else {
            return Math.round((this.clientWidth - this.columns * this.gaps[0] - this.paddingRight) / this.columns);
          }
        }
      },
      watch: {
        columns: function () {
          this.refreshColumns();
        },
        data: function () {
          this.refreshColumns();
        },
        extraHeight: function () {
          this.refreshColumns();
        },
        actualWidth: function (t) {
          if (t !== 0) {
            this.refreshColumns();
          }
        }
      },
      mounted: function () {
        var t = this;
        this.$nextTick(function () {
          t.refreshColumns();
        });
      },
      methods: {
        handleSetIsNeedScroll: function (t) {
          this.isNeedScroll = t;
        },
        handleScroll: function (t) {
          this.$emit("scroll", t);
        },
        loadMore: function () {
          this.$emit("loadMore");
        },
        reset: function () {
          this.columnItems = [];
          this.collection = [];
        },
        refreshColumns: function () {
          if (this.columns) {
            this.reset();
            for (var t = 0; t < this.columns; t++) {
              this.columnItems.push({
                height: 0,
                len: 0,
                items: []
              });
            }
            this.handleColumnData(this.data, this.columnItems);
            this.flatColumnData();
          }
        },
        handleColumnData: function (t, e, n) {
          var a = this;
          if (t) {
            t.forEach(function (t, i) {
              var r = a.getItemSize(t);
              var s = r + a.gaps[1];
              var o = e.reduce(function (t, e) {
                if (t.height > e.height) {
                  return e;
                } else {
                  return t;
                }
              }, e[0]);
              o.len++;
              o.height += s;
              var c = Object(P.a)(Object(P.a)({}, t), {}, {
                _index: (n || 0) + i,
                _width: a.actualWidth,
                _height: r,
                key: Object(ne.get)(t, a.keyProp || "")
              });
              o.items.push(c);
            });
          }
        },
        flatColumnData: function () {
          var t = this;
          var e = this.columnItems.map(function (t) {
            return t.len;
          });
          for (var n = Math.max.apply(null, e), a = function (e) {
              t.columnItems.forEach(function (n, a) {
                if (n.items[e]) {
                  var i = Object(P.a)(Object(P.a)({}, n.items[e]), {}, {
                    x: a * t.actualWidth + a * t.gaps[0],
                    y: t.getItemYOffset(n.items, e)
                  });
                  t.collection.push({
                    data: i
                  });
                }
              });
            }, i = 0; i < n; i++) {
            a(i);
          }
        },
        getItemYOffset: function (t, e) {
          if (e === 0) {
            return 0;
          }
          var n = 0;
          for (var a = 0; a < e; a++) {
            n += t[a]._height + this.gaps[1] + this.extraHeight;
          }
          return n;
        },
        cellSizeAndPositionGetter: function (t) {
          var e = t.data;
          return {
            width: e._width,
            height: e._height,
            x: e.x,
            y: e.y
          };
        },
        getItemSize: function (t) {
          var e = t.height / t.width * this.actualWidth;
          return Math.floor(Math.max(Math.min(this.actualWidth * this.maxRatio, e), this.actualWidth * this.minRatio));
        }
      }
    }