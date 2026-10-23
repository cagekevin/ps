{
      components: {
        Icon: ie.a
      },
      props: {
        type: {
          type: String,
          required: true
        }
      },
      data: function () {
        return {};
      },
      computed: {
        isAddType: function () {
          return this.type === "add";
        },
        isRemoveType: function () {
          return this.type === "remove";
        }
      },
      methods: {
        remove: function () {
          this.$emit("remove");
        },
        add: function () {
          if (this.isAddType) {
            this.$emit("add");
          }
        }
      }
    }