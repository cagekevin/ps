{
      components: {
        GInput: $a.a
      },
      model: {
        prop: "value",
        event: "change"
      },
      props: {
        value: {
          type: String,
          required: true
        },
        suffixText: {
          type: String,
          default: ""
        }
      },
      data: function () {
        return {
          editing: false,
          inputVal: ""
        };
      },
      methods: {
        onEdit: function () {
          var t = this;
          this.editing = true;
          this.inputVal = this.value;
          this.$nextTick(function () {
            var e = t.$refs.input;
            if (e) {
              e.focus();
            }
          });
        },
        onBlur: function () {
          console.log("newName ", this.inputVal);
          this.$emit("change", this.inputVal);
          this.editing = false;
        }
      }
    }