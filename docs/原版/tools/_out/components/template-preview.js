{
      name: "template-preview",
      inject: ["listTracker"],
      components: {
        Normal: dr,
        Long: wr,
        Wide: Fr,
        Icon: ie.a,
        DownloadProgress: Nr
      },
      data: function () {
        return {
          isHoverImg: false,
          pictureActiveIndex: 0,
          pictureInfoShow: false
        };
      },
      watch: {
        materialActive: function (t) {
          if (t) {
            this.pictureInfoShow = this.getPictureInfoShowValue();
          }
          this.$set(this.template, "materialActive", t);
        }
      },
      props: (ba = {
        columns: {
          type: Number,
          default: 2
        },
        template: {
          type: Object,
          required: true,
          validator: function (t) {
            return t && t.preview;
          }
        },
        materialType: {
          type: String,
          required: true,
          validator: function (t) {
            return t === "template" || t === "material";
          }
        },
        maxRatio: {
          type: Number,
          default: 1.91
        },
        minRatio: {
          type: Number,
          default: 0
        },
        setRatio: {
          type: Number,
          default: 0
        },
        lazy: {
          type: Boolean,
          default: true
        },
        hover: {
          type: Boolean,
          default: false
        },
        showRightKeyMenuFixedPos: {
          type: Function,
          default: function () {}
        }
      }, Object(pt.a)(ba, "columns", {
        type: Number,
        default: 2
      }), Object(pt.a)(ba, "showPopup", {
        type: Boolean,
        required: true
      }), ba),
      computed: {
        disabled: function () {
          return this.materialType === "material" && Ca.pendingUsingId && this.downloadStatus !== he.A.Downloading;
        },
        materialActive: function () {
          return !!this.showPopup || (this.materialType === "material" ? this.isHoverImg && this.downloadStatus !== he.A.Downloading : this.isHoverImg || this.downloadTask && this.downloadStatus !== he.A.Done);
        },
        pictureHoverType: function () {
          if (this.template.pictureInfos) {
            if (this.columns <= 2) {
              return "cover";
            } else {
              return "overflow";
            }
          } else {
            return "normal";
          }
        },
        aspectRatio: function () {
          if (this.setRatio) {
            return this.setRatio;
          } else if (this.isWide) {
            return this.preview.height / Br;
          } else {
            return Math.max(Math.min(this.preview.height / this.preview.width, this.maxRatio), this.minRatio);
          }
        },
        isLong: function () {
          return this.preview.height / this.preview.width - this.aspectRatio > 0.2;
        },
        isWide: function () {
          return this.wideTemplateCount > 1 && this.template.type === "web_page";
        },
        wideTemplateCount: function () {
          var t = this.template.composite_preview;
          if (t && t.url && t.width && t.height) {
            return ~~(t.width / Br);
          } else {
            return 1;
          }
        },
        preview: function () {
          return Ar(this.template);
        },
        component: function () {
          if (this.isLong) {
            return wr;
          } else if (this.isWide) {
            return Fr;
          } else {
            return dr;
          }
        },
        isCreating: function () {
          return Ca.creatingMap[this.template.id];
        },
        downloadTask: function () {
          return Ca.states[this.template.id];
        },
        downloadStatus: function () {
          return this.downloadTask && this.downloadTask.status;
        },
        downloadProgress: function () {
          return this.downloadTask && this.downloadTask.progress;
        },
        downloadSpeed: function () {
          return this.downloadTask && this.downloadTask.downloadSpeed;
        },
        fileSize: function () {
          if (this.downloadTask) {
            return Rr(this.downloadTask.size);
          } else {
            return "0 B";
          }
        },
        progressSize: function () {
          switch (this.columns) {
            case 3:
              return "m";
            case 4:
              return "sm";
            default:
              return "l";
          }
        }
      },
      methods: {
        handleHover: function (t) {
          var e;
          var n;
          if (!this.disabled) {
            this.isHoverImg = t;
            if (this.component && this.component.name === "long-preview") {
              if (t) {
                if ((e = this.$refs.previewInstance) !== null && e !== undefined) {
                  e.mouseenter();
                }
              } else if ((n = this.$refs.previewInstance) !== null && n !== undefined) {
                n.mouseleave();
              }
            }
          }
        },
        handleMove: function (t) {
          var e;
          if (!this.disabled) {
            if (this.component && this.component.name === "long-preview") {
              if ((e = this.$refs.previewInstance) !== null && e !== undefined) {
                e.mousemove(t);
              }
            }
          }
        },
        resumeTask: function () {
          Ca.resumeTask(this.template);
        },
        pauseTask: function () {
          Ca.pauseTask(this.template);
        },
        cancelTask: function () {
          Ca.cancelTask(this.template);
        },
        retryTask: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    e.next = 2;
                    return Ca.cancelTask(t.template);
                  case 2:
                    if (t.materialType !== "material") {
                      e.next = 5;
                      break;
                    }
                    Ca.downloadAndUse(Object(P.a)(Object(P.a)({}, t.template), {}, {
                      type: "material"
                    }));
                    return e.abrupt("return");
                  case 5:
                    Ca.downloadOrOpen(Object(P.a)(Object(P.a)({}, t.template), {}, {
                      type: "template"
                    }));
                  case 6:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          }))();
        },
        handleDownloadClick: function (t) {
          if (this.disabled) {
            t.stopPropagation();
            t.preventDefault();
            return;
          }
          if (this.downloadStatus !== he.A.Downloading) {
            this.handleClick(t);
          } else {
            this.cancelTask();
          }
        },
        handleClick: function (t, e) {
          if (this.downloadTask || !this.isCreating) {
            var n = [he.A.Downloading, he.A.Waiting, he.A.Pausing, he.A.Error].includes(this.downloadStatus);
            if (this.disabled || n) {
              t.stopPropagation();
              t.preventDefault();
              return;
            }
            this.$emit("click", {
              downloadType: e,
              target: this.template,
              event: t
            });
            window.__download_click_event__ = t;
          }
        },
        openPreviewPage: function () {
          var t = this;
          this.$store.commit("setPreviewInfo", Object(P.a)(Object(P.a)({}, this.template), {}, {
            useTemplate: function (e) {
              t.$emit("click", {
                downloadType: e,
                target: t.template
              });
            }
          }));
          this.listTracker.useTemplate(this.template, "预览");
        },
        getPictureInfoShowValue: function () {
          if (this.pictureHoverType === "cover") {
            var t;
            var e;
            var n;
            var a = ((t = this.$refs.previewInstance) === null || t === undefined || (e = t.$el) === null || e === undefined || (n = e.getBoundingClientRect) === null || n === undefined ? undefined : n.call(e)) || {};
            var i = a.height;
            return !i || !(i < 66);
          }
          return false;
        },
        showRightKeyMenu: function (t) {
          var e = t.currentTarget.getBoundingClientRect();
          var n = e.top;
          var a = e.left;
          var i = e.height;
          var r = e.right;
          this.$emit("open-right-key-menu", {
            clientX: a,
            clientY: n + i + 5,
            rightLimit: r + 4
          }, this.template);
        }
      }
    }