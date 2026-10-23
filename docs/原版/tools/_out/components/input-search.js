{
      name: "input-search",
      components: {
        Icon: ie.a,
        Input: $a.a
      },
      props: {
        placeholder: {
          type: String,
          default: "搜索"
        }
      },
      model: {
        prop: "value",
        event: "change.value"
      },
      data: function () {
        var t = typeof this.value === "undefined" ? this.defaultValue : this.value;
        return {
          stateValue: typeof t === "undefined" ? "" : t
        };
      },
      computed: {
        listeners: function () {
          var t = this.$listeners;
          t.change;
          t.search;
          var e = Object(Vn.a)(t, Ua);
          return Object(P.a)(Object(P.a)({}, e), {}, {
            change: this.onChange
          });
        }
      },
      watch: {
        value: function (t) {
          this.stateValue = t;
        }
      },
      methods: {
        onChange: function (t) {
          this.stateValue = t.target.value;
          if (!t.target.value.trim()) {
            this.$refs.input.focus();
          }
          if (t && t.target && t.type === "click") {
            this.$emit("search", t.target.value, t);
          }
          this.$emit("change", t);
        },
        onSearch: function (t) {
          if (!this.disabled) {
            this.$emit("search", this.$refs.input.stateValue, t);
          }
        }
      }
    }