{
        columns: function () {
          this.refreshColumns();
        },
        data: function () {
          this.refreshColumns();
        },
        extraHeight: function () {
          this.refreshColumns();
        },
        actualWidth: function (t) {
          if (t !== 0) {
            this.refreshColumns();
          }
        }
      }