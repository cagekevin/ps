# template-preview · 方法实现

> 来源：`template-preview.js`
> 方法数：12

## `handleHover`

参数：`t`

```js
function (t) {
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
    }
```

## `handleMove`

参数：`t`

```js
function (t) {
      var e;
      if (!this.disabled) {
        if (this.component && this.component.name === "long-preview") {
          if ((e = this.$refs.previewInstance) !== null && e !== undefined) {
            e.mousemove(t);
          }
        }
      }
    }
```

## `resumeTask`


```js
function () {
      Ca.resumeTask(this.template);
    }
```

## `pauseTask`


```js
function () {
      Ca.pauseTask(this.template);
    }
```

## `cancelTask`


```js
function () {
      Ca.cancelTask(this.template);
    }
```

## `retryTask`


```js
function () {
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
    }
```

## `handleDownloadClick`

参数：`t`

```js
function (t) {
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
    }
```

## `handleClick`

参数：`t, e`

```js
function (t, e) {
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
    }
```

## `openPreviewPage`


```js
function () {
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
    }
```

## `getPictureInfoShowValue`


```js
function () {
      if (this.pictureHoverType === "cover") {
        var t;
        var e;
        var n;
        var a = ((t = this.$refs.previewInstance) === null || t === undefined || (e = t.$el) === null || e === undefined || (n = e.getBoundingClientRect) === null || n === undefined ? undefined : n.call(e)) || {};
        var i = a.height;
        return !i || !(i < 66);
      }
      return false;
    }
```

## `showRightKeyMenu`

参数：`t`

```js
function (t) {
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
```

## `e`


```js
e() {
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
      }
```
