{
      name: "select-box",
      components: {
        "gd-icon": Jt.a
      },
      props: {
        options: {
          type: Array,
          required: true
        }
      },
      data: function () {
        return {
          visibility: false,
          current: 0
        };
      },
      computed: {
        currentLabel: function () {
          return (this.options[this.current] || {
            label: ""
          }).label;
        }
      },
      methods: {
        toggle: function (t) {
          this.visibility = t;
          this.$emit("toggle", t);
        },
        choose: function (t) {
          this.current = t;
          this.toggle(false);
          this.$emit("choose", t);
        }
      }
    }