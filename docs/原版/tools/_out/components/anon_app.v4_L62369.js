{
      methods: {
        close: function () {
          this.$emit("close");
        },
        help: function () {
          this.$cep.openUrl("https://www.bilibili.com/video/BV1Di4y1F7KB?p=8");
        }
      }
    }