{
      components: {
        GIcon: Jt.a
      },
      props: {
        file: {
          type: Object,
          default: function () {
            return {};
          }
        },
        close: {
          type: Function,
          default: function () {}
        }
      },
      computed: {
        fileName: function () {
          return this.file.name;
        }
      },
      methods: {
        openFile: function () {
          Ca.openContent(this.file);
          this.closeMessage();
          Kn.useTemplate(this.file, "应用");
        },
        closeMessage: function () {
          this.close();
        }
      }
    }