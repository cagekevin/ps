{
      name: "font-manage-list-item",
      components: {
        Icon: Jt.a,
        Rating: ox,
        License: fx
      },
      props: {
        font: {
          type: Object,
          required: true
        },
        selectedFont: {
          type: String,
          default: ""
        },
        ratings: {
          type: Object,
          required: true
        },
        commercials: {
          type: Object,
          required: true
        }
      },
      computed: {
        rating: function () {
          return this.ratings[this.font.family] || 0;
        }
      },
      methods: {
        selectFont: function () {
          this.$emit("select-font", this.font);
        },
        tagToFont: function () {
          this.$emit("tag-to-font", this.font);
        },
        ratingToFont: function (t) {
          this.$emit("rating-to-font", this.font, t);
        }
      }
    }