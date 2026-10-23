# font-manage-user-font

> 来源：`app/56d7.js`　大小：4.0KB
> 特征：data / methods

## 子组件

`HCF`、`UserFontHeader`、`UserFontContent`、`UserFontFooter`、`UserFontModal`、`UserFontDrawer`、`UserFontDialog`

## methods（11）

`setCurrentFont`、`unsetCurrentFont`、`selectFont`、`removeUserTag`、`renameUserTag`、`toggleFilterPanel`、`confirmRemoveUserTag`、`cancelRemoveUserTag`、`confirmRenameUserTag`、`cancelRenameUserTag`、`cancelAddUserTag`

## 文案（2）

移除失败 · 重命名失败

## 源码

```js
{
  name: "font-manage-user-font",
  components: {
    HCF: Gg,
    UserFontHeader: $w,
    UserFontContent: Hx,
    UserFontFooter: dk,
    UserFontModal: Vk,
    UserFontDrawer: eC,
    UserFontDialog: lC
  },
  inject: ["userFont", "setFont", "pushFiles"],
  data: function () {
    return {
      currentFont: null,
      selectedFont: null,
      selectedTag: null
    };
  },
  methods: {
    setCurrentFont: function (t, e) {
      this.currentFont = t;
      e();
    },
    unsetCurrentFont: function (t) {
      this.currentFont = null;
      t();
    },
    selectFont: function (t) {
      this.selectedFont = t;
      this.setFont(t);
    },
    removeUserTag: function (t, e) {
      this.selectedTag = t;
      e("remove");
    },
    renameUserTag: function (t, e) {
      this.selectedTag = t;
      e("rename");
    },
    toggleFilterPanel: function (t) {
      t();
    },
    confirmRemoveUserTag: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                n.prev = 0;
                Rw.removeUserTag(e.selectedTag);
                Rw.removeUserTagFromFonts(e.selectedTag.id);
                if (e.selectedTag.selected) {
                  Rw.resetPage();
                }
                n.next = 6;
                return Promise.all([Rw.saveUserTags(e.userFont), Rw.saveActivities(e.userFont)]);
              case 6:
                f.a.info({
                  msg: "FONT_MANGE_REM_USER_TAG_SUCCESS"
                });
                e.pushFiles([hw(e.userFont), dw(e.userFont)]);
                e.cancelRemoveUserTag(t);
                n.next = 16;
                break;
              case 11:
                n.prev = 11;
                n.t0 = n.catch(0);
                console.error("remove user tag failed: ", n.t0);
                cg.a.error("移除失败:" + n.t0.message);
                f.a.error(n.t0, {
                  msg: "FONT_MANAGE_REM_USER_TAG_FAILED",
                  extra: n.t0.message
                });
              case 16:
              case "end":
                return n.stop();
            }
          }
        }, n, null, [[0, 11]]);
      }))();
    },
    cancelRemoveUserTag: function (t) {
      this.selectedTag = null;
      t();
    },
    confirmRenameUserTag: function (t, e) {
      var n = this;
      return Object(d.a)(regeneratorRuntime.mark(function a() {
        return regeneratorRuntime.wrap(function (a) {
          while (1) {
            switch (a.prev = a.next) {
              case 0:
                a.prev = 0;
                console.log(Object(P.a)(Object(P.a)({}, n.selectedTag), {}, {
                  name: t
                }));
                Rw.renameUserTag(Object(P.a)(Object(P.a)({}, n.selectedTag), {}, {
                  name: t
                }));
                if (n.selectedTag.selected) {
                  Rw.resetPage();
                }
                a.next = 6;
                return Promise.all([Rw.saveUserTags(n.userFont), Rw.saveActivities(n.userFont)]);
              case 6:
                f.a.info({
                  msg: "FONT_MANGE_REM_USER_TAG_SUCCESS"
                });
                n.pushFiles([hw(n.userFont), dw(n.userFont)]);
                n.cancelRenameUserTag(e);
                a.next = 16;
                break;
              case 11:
                a.prev = 11;
                a.t0 = a.catch(0);
                console.error("remove user tag failed: ", a.t0);
                cg.a.error("重命名失败:" + a.t0.message);
                f.a.error(a.t0, {
                  msg: "FONT_MANAGE_REM_USER_TAG_FAILED",
                  extra: a.t0.message
                });
              case 16:
              case "end":
                return a.stop();
            }
          }
        }, a, null, [[0, 11]]);
      }))();
    },
    cancelRenameUserTag: function (t) {
      this.selectedTag = null;
      t();
    },
    cancelAddUserTag: function (t) {
      t();
    }
  }
}
```