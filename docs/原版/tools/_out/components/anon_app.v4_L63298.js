{
      components: {
        Input: ZT
      },
      props: {
        maxDevicesCount: {
          type: Number,
          default: 2
        },
        devices: {
          type: Array,
          default: function () {
            return [];
          }
        }
      },
      computed: {
        currentDevicesCount: function () {
          return this.devices.length;
        },
        emptyDevicesCount: function () {
          return this.maxDevicesCount - this.currentDevicesCount;
        },
        emptyDevices: function () {
          return new Array(this.emptyDevicesCount);
        }
      },
      methods: {
        renameDevice: function (t, e, n) {
          console.log(t, e, n);
          this.$emit("rename-device", t, e, n);
        },
        removeDevice: function (t, e) {
          this.$emit("remove-device", t, e);
        },
        timeToDate: function (t) {
          if (!t) {
            return "";
          }
          var e = new Date(t);
          return `${e.getFullYear()}.${e.getMonth() + 1}.${e.getDate()}`;
        }
      }
    }