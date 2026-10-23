{
      name: "font-manage-list-font-preview",
      props: {
        fontFamily: {
          type: [String, Number],
          default: 500
        },
        previewText: {
          type: String,
          default: ""
        },
        previewMode: {
          type: String,
          default: xg[0].mode
        },
        displayName: {
          type: String,
          required: true
        },
        language: {
          type: String,
          default: "cn"
        }
      },
      computed: {
        showText: function () {
          return this.previewText || this.getDefaultText(this.language);
        },
        classes: function () {
          return `font-manage__list-item__preview--${this.previewMode}`;
        }
      },
      methods: {
        getDefaultText: function (t) {
          if (t === "en") {
            return "Crazy Design";
          } else {
            return "设计助理";
          }
        }
      }
    }