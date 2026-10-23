{
      components: {
        dropDown: gm
      },
      data: function () {
        return {
          dropDownval: ["10,5", "28,12", "15=3:1"],
          set: V.a.info
        };
      },
      watch: {
        "set.ztCreateButton.type": function () {
          this.createBtn();
        },
        "set.ztCreateButton.isLine": function () {
          this.createBtn();
        }
      },
      methods: {
        createBtn: function () {
          this.$cep.jsxHistory("zt_createButton", [this.set.ztCreateButton], "生成按钮");
        },
        dropOpen: function (t) {
          this.$refs[t].open();
        },
        dropfun: function (t) {
          this.set.ztCreateButton.padding = this.dropDownval[t[0]];
          this.$cep.jsxHistory("zt_createButton", [this.set.ztCreateButton], "生成按钮");
        },
        quickCreateBtn: function (t) {
          this.set.ztCreateButton.padding = "自动生成" + t;
          this.$cep.jsxHistory("zt_createButton", [this.set.ztCreateButton], "生成按钮");
        }
      }
    }