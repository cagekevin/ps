{
      data: function () {
        return {
          set: V.a.info
        };
      },
      methods: {
        reset: function () {
          this.set.ztPasteFont.scriptFamily = true;
          this.set.ztPasteFont.color = true;
          this.set.ztPasteFont.opacity = true;
          this.set.ztPasteFont.size = true;
          this.set.ztPasteFont.leading = true;
          this.set.ztPasteFont.tracking = true;
        }
      },
      mounted: function () {}
    }