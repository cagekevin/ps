{
      name: "VirtualLayoutWF",
      components: {
        Icon: ie.a,
        BackTop: Ba.a
      },
      props: {
        collection: {
          type: Array,
          required: true
        },
        cellSizeAndPositionGetter: {
          type: Function,
          required: true
        },
        width: {
          type: [String, Number],
          default: "100%"
        },
        height: {
          type: [String, Number],
          default: "100vh"
        },
        sectionSize: {
          type: Number,
          default: 300
        },
        preloadDistance: {
          type: [Number, String],
          required: false,
          default: 50
        },
        otherSlotHeight: {
          type: Number,
          default: 0
        },
        fixedHeight: {
          type: Number,
          default: 200
        },
        isNeedBackTop: {
          type: Boolean,
          default: true
        },
        itemIdPosition: {
          type: String,
          default: "data.id"
        },
        columns: {
          type: Number
        }
      },
      emits: ["loadMore", "scroll"],
      data: function () {
        return {
          totalHeight: 0,
          displayItems: [],
          slotHeight: 0
        };
      },
      computed: {
        outerStyle: function () {
          return {
            height: this.height + "px",
            width: this.width + "px",
            "overflow-x": "hidden"
          };
        },
        containerStyle: function () {
          var t = this.totalHeight + this.fixedHeight;
          this.$emit("isNeedScroll", t > this.height);
          return {
            height: t + "px",
            width: "100%"
          };
        }
      },
      watch: {
        collection: function () {
          this.refreshCollection();
        },
        otherSlotHeight: function () {
          this.slotHeight = this.otherSlotHeight + this.$refs.outer?.scrollTop;
          this.flushDisplayItems();
        }
      },
      created: function () {
        this.groupManagers = [];
        this.onCollectionChanged();
      },
      mounted: function () {
        var t = this;
        this.$nextTick(function () {
          t.slotHeight = t.otherSlotHeight + t.$refs.outer?.scrollTop;
          t.loadMore();
        });
        this.$appBus.on("refreshWaterfallDisplayItems", this.flushDisplayItems);
      },
      beforeDestroy: function () {
        this.$appBus.off("refreshWaterfallDisplayItems", this.flushDisplayItems);
      },
      methods: {
        getBackTopTarget: function () {
          return this.$refs.outer;
        },
        getItemOnlyKey: function (t) {
          var e = Object(ne.get)(t, this.itemIdPosition);
          return e || t.key;
        },
        getComputedStyle: function (t) {
          if (t) {
            var e = this.groupManagers[t.groupIndex];
            if (e) {
              var n = e.getCellMetadata(t.itemIndex);
              if (n) {
                var a = n.width;
                var i = n.height;
                var r = n.x;
                var s = n.y;
                return {
                  transform: `translateX(${r}px) translateY(${s}px)`,
                  width: `${a}px`,
                  height: `${i}px`
                };
              }
            }
          }
        },
        refreshCollection: function () {
          this.groupManagers.forEach(function (t) {
            return t.dispose();
          });
          this.groupManagers = [];
          this.totalHeight = 0;
          this.onCollectionChanged();
        },
        onCollectionChanged: function () {
          var t = this;
          var e = this.collection;
          if (e.length > 0 && e[0].group === undefined) {
            e = [{
              group: e
            }];
          }
          e.forEach(function (e, n) {
            var a = n;
            var i = t.$watch(function () {
              return e;
            }, function () {
              return t.onGroupChanged(e.group, a);
            }, {
              deep: true
            });
            t.groupManagers.push(new io(e.group, a, t.sectionSize, t.cellSizeAndPositionGetter, i));
          });
          this.updateGridDimensions();
          this.flushDisplayItems();
        },
        updateGridDimensions: function () {
          this.totalHeight = Math.max.apply(Math, Object(ct.a)(this.groupManagers.map(function (t) {
            return t.totalHeight;
          })));
          this.totalWidth = Math.max.apply(Math, Object(ct.a)(this.groupManagers.map(function (t) {
            return t.totalWidth;
          })));
        },
        onGroupChanged: function (t, e) {
          this.groupManagers[e].updateGroup(t);
          this.updateGridDimensions();
          this.flushDisplayItems();
        },
        onScroll: function (t) {
          this.flushDisplayItems();
        },
        loadMore: function () {
          var t = this;
          var e = this.$refs.outer;
          if (!e) {
            return false;
          }
          var n = e.scrollTop || 0;
          this.$nextTick(function () {
            t.$emit("scroll", {
              scrollTop: n || 0
            });
            if (e.clientHeight && n + e.clientHeight >= e.scrollHeight - Number(t.preloadDistance)) {
              t.$emit("loadMore");
            }
          });
        },
        flushDisplayItems: function () {
          var t = this;
          var e = 0;
          var n = 0;
          if (this.$refs.outer) {
            e = this.$refs.outer.scrollTop - this.slotHeight;
          }
          var a = [];
          var i = this.columns > 2 ? 2 : 1;
          this.groupManagers.forEach(function (r, s) {
            var o = r.getCellIndices({
              height: t.height * i,
              width: t.width,
              x: n,
              y: e
            });
            o.forEach(function (t) {
              a.push(Object.freeze(Object(P.a)({
                groupIndex: s,
                itemIndex: t,
                key: a.length
              }, r.getItem(t))));
            });
          });
          if (window.requestAnimationFrame) {
            window.requestAnimationFrame(function () {
              t.displayItems = a;
            });
          } else {
            this.displayItems = a;
          }
          this.loadMore();
        }
      }
    }