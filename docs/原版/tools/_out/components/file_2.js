{
      name: "file",
      components: {
        GDropdown: ii.a,
        GMenu: ai.a,
        GMenuItem: ai.a.Item,
        GMenuDivider: ai.a.Divider,
        Icon: ie.a,
        GCheckbox: cu.a
      },
      data: function () {
        return {
          data1: [Jl.a.day, Jl.a.fileName, Jl.a.score],
          data2: ["升序", "降序"],
          data2Index: 0,
          data1Index: 0
        };
      },
      created: function () {
        this.data2Index = V.a.info.mbOrder ? 0 : 1;
        this.data1Index = this.data1.indexOf(V.a.info.mbSortFunVal);
      },
      methods: {
        open: function () {
          this.$refs.test.open();
        },
        top: function (t) {
          this.data1Index = t;
          this.$emit("topFun", this.data1[t]);
        },
        bottom: function (t) {
          this.data2Index = t;
          this.$emit("bottomFun", this.data2[t]);
        }
      }
    }