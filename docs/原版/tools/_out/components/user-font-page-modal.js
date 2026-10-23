{
      name: "user-font-page-modal",
      components: {
        TagManage: Nk
      },
      inject: ["userFont", "pushFiles"],
      props: {
        currentFont: {
          required: true,
          validator: function (t) {
            return Object(F.a)(t) === "object" || t === null;
          }
        },
        closeModal: {
          type: Function,
          default: function () {}
        }
      },
      computed: {
        userTags: function () {
          return Rw.userTags;
        },
        groups: function () {
          return Rw.groupMap;
        }
      },
      methods: {
        addUserTag: function (t) {
          var e = this;
          return Object(d.a)(regeneratorRuntime.mark(function n() {
            var a;
            var i;
            var r;
            return regeneratorRuntime.wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    a = t.text;
                    i = t.autoClose;
                    n.prev = 1;
                    if (a) {
                      n.next = 5;
                      break;
                    }
                    cg.a.warning("请输入标签名称");
                    return n.abrupt("return");
                  case 5:
                    r = Rw.addUserTag({
                      name: a
                    });
                    if (e.currentFont) {
                      Rw.groups = {
                        family: e.currentFont.family,
                        category: "user-tag",
                        id: r
                      };
                    }
                    if (!e.currentFont) {
                      n.next = 13;
                      break;
                    }
                    n.next = 10;
                    return Promise.all([Rw.saveUserTags(e.userFont), Rw.saveActivities(e.userFont)]);
                  case 10:
                    e.pushFiles([hw(e.userFont), dw(e.userFont)]);
                    n.next = 16;
                    break;
                  case 13:
                    n.next = 15;
                    return Rw.saveUserTags(e.userFont);
                  case 15:
                    e.pushFiles([hw(e.userFont)]);
                  case 16:
                    if (i) {
                      e.closeModal();
                    }
                    f.a.info({
                      msg: "FONT_MANGE_ADD_USER_TAG_SUCCESS"
                    });
                    n.next = 25;
                    break;
                  case 20:
                    n.prev = 20;
                    n.t0 = n.catch(1);
                    console.error("add user tag failed: ", n.t0);
                    cg.a.error("新增失败:" + n.t0.message);
                    f.a.error(n.t0, {
                      msg: "FONT_MANGE_ADD_USER_TAG_FAILED",
                      extra: n.t0.message
                    });
                  case 25:
                  case "end":
                    return n.stop();
                }
              }
            }, n, null, [[1, 20]]);
          }))();
        },
        addUserTagToFont: function (t) {
          var e = this;
          return Object(d.a)(regeneratorRuntime.mark(function n() {
            return regeneratorRuntime.wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    n.prev = 0;
                    Rw.addUserTagToFont({
                      id: t.id,
                      name: t.name,
                      family: e.currentFont.family
                    });
                    n.next = 4;
                    return Rw.saveActivities(e.userFont);
                  case 4:
                    e.pushFiles([dw(e.userFont)]);
                    f.a.info({
                      msg: "FONT_MANGE_BIND_USER_TAG_SUCCESS"
                    });
                    n.next = 13;
                    break;
                  case 8:
                    n.prev = 8;
                    n.t0 = n.catch(0);
                    console.error("add user tag to font failed: ", n.t0);
                    cg.a.error("添加失败:" + n.t0.message);
                    f.a.error(n.t0, {
                      msg: "FONT_MANGE_BIND_USER_TAG_FAILED",
                      extra: n.t0.message
                    });
                  case 13:
                  case "end":
                    return n.stop();
                }
              }
            }, n, null, [[0, 8]]);
          }))();
        },
        filterByUserTag: function (t) {
          Rw.toggleUserTag(t);
          Rw.resetPage();
        },
        removeUserTag: function (t) {
          var e = this;
          return Object(d.a)(regeneratorRuntime.mark(function n() {
            return regeneratorRuntime.wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    e.$emit("remove-user-tag", t);
                  case 1:
                  case "end":
                    return n.stop();
                }
              }
            }, n);
          }))();
        },
        removeUserTagFromFont: function (t) {
          var e = this;
          return Object(d.a)(regeneratorRuntime.mark(function n() {
            return regeneratorRuntime.wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    n.prev = 0;
                    Rw.removeUserTagFromFont({
                      id: t.id,
                      name: t.name,
                      family: e.currentFont.family
                    });
                    n.next = 4;
                    return Rw.saveActivities(e.userFont);
                  case 4:
                    e.pushFiles([dw(e.userFont)]);
                    f.a.info({
                      msg: "FONT_MANGE_UNBIND_USER_TAG_SUCCESS"
                    });
                    n.next = 13;
                    break;
                  case 8:
                    n.prev = 8;
                    n.t0 = n.catch(0);
                    console.error("remove user tag from font failed: ", n.t0);
                    cg.a.error("移除失败:" + n.t0.message);
                    f.a.error(n.t0, {
                      msg: "FONT_MANGE_UNBIND_USER_TAG_FAILED",
                      extra: n.t0.message
                    });
                  case 13:
                  case "end":
                    return n.stop();
                }
              }
            }, n, null, [[0, 8]]);
          }))();
        },
        cancelAddUserTag: function () {
          this.$emit("cancel-add-user-tag");
        }
      }
    }