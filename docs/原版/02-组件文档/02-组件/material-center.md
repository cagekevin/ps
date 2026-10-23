# material-center

> 来源：`app/56d7.js`　大小：12.3KB
> 特征：props / data / methods

## 子组件

`Icon`、`InputSearch`、`OtherFilters`、`LibCategoryFilter`、`LibListBottom`、`MaterialList`、`BackTop`、`NewSpin`、`Empty`、`Limite30Dialog`、`DownloadManagement`、`NoMemoryDialog`、`DownloadCountTips`

## props（3）

`visible`、`type`、`updater`

## computed（7）

`disableOtherActionsWhenDownloading`、`loadedAll`、`colors`、`filter_id`、`sort`、`totalText`、`isTryLimitShown`

## methods（19）

`handleComponentTracker`、`init`、`getOptions`、`getExtraInfoForPictures`、`getList`、`onSearch`、`handleColorFilter`、`handleCategoryFilter`、`categoreFilterMoreChange`、`handleSort`、`nextPage`、`getBackTopTarget`、`handleColumnChange`、`showTryLimitDialog`、`closeTryLimitDialog`、`handleIsShowNoMemeryDialog`、`getTrialInfo`、`refreshListByInitialQuery`、`expose`

## 文案（3）

素材库 · 搜索结果 · 全部

## 源码

```js
{
  name: "material-center",
  provide: function () {
    return {
      listTracker: this.listTracker
    };
  },
  components: {
    Icon: ie.a,
    InputSearch: Xa,
    OtherFilters: zf,
    LibCategoryFilter: Ai,
    LibListBottom: bi,
    MaterialList: Uf,
    BackTop: Ba.a,
    NewSpin: W.a,
    Empty: ti,
    Limite30Dialog: Di,
    DownloadManagement: Is,
    NoMemoryDialog: $i,
    DownloadCountTips: Po
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      required: true,
      validator: function (t) {
        return ["icon", "picture", "element"].indexOf(t) > -1;
      }
    },
    updater: {
      type: Boolean,
      default: false
    }
  },
  data: function () {
    return {
      categoryOptions: [],
      colorOptions: [],
      sortOptions: [],
      list: [],
      pageInfo: null,
      listService: null,
      initialLoading: false,
      loadingNextPage: false,
      columns: 2,
      sliderValue: 0,
      isShowNoMemoryDialog: false,
      recordExportTemplateId: {},
      listTracker: qn("素材库", Ef(this.type))
    };
  },
  computed: {
    disableOtherActionsWhenDownloading: function () {
      return !!Ca.pendingUsingId;
    },
    loadedAll: function () {
      if (!this.pageInfo) {
        return false;
      }
      var t = this.pageInfo;
      var e = t.num;
      var n = t.size;
      var a = t.total;
      return e * n >= a;
    },
    colors: function () {
      return Object(ne.get)(this.listService, "query.colors");
    },
    filter_id: function () {
      return Object(ne.get)(this.listService, "query.filter_id");
    },
    sort: function () {
      return Object(ne.get)(this.listService, "query.sort");
    },
    totalText: function () {
      var t = this.listService.query;
      var e = t.q;
      var n = t.colors;
      var a = t.filter_id;
      var i = e || n || a != this.listService.allFilterId;
      if (i) {
        return "搜索结果";
      } else {
        return "全部";
      }
    },
    isTryLimitShown: function () {
      return Ca.isTryLimitShown;
    }
  },
  created: function () {
    this.init();
  },
  methods: {
    handleComponentTracker: function (t) {
      var e;
      var n;
      var a = t.method;
      var i = t.params;
      if ((e = (n = this.listTracker)[a]) !== null && e !== undefined) {
        e.call(n, i);
      }
    },
    init: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                t.listService = Go(t.type);
                e.next = 3;
                return t.getOptions();
              case 3:
                t.getList();
                t.getTrialInfo();
                t.$appBus.on("isShowNoMemoryDialog", t.handleIsShowNoMemeryDialog);
                t.$on("reloadList", function () {
                  t.refreshListByInitialQuery();
                });
              case 7:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    getOptions: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        var a;
        var i;
        var r;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return t.listService.init();
              case 2:
                n = e.sent;
                a = n.categoryOptions;
                i = n.colorOptions;
                r = n.sortOptions;
                t.categoryOptions = a;
                t.colorOptions = i;
                t.sortOptions = r;
              case 9:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    getExtraInfoForPictures: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        var i;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                if (t && t.length !== 0) {
                  n.next = 2;
                  break;
                }
                return n.abrupt("return");
              case 2:
                a = t.map(function (t) {
                  return t.id;
                });
                n.next = 5;
                return e.listService.getExtraInfoForPictures(a);
              case 5:
                i = n.sent;
                t.forEach(function (n, a) {
                  if (i[n.id]) {
                    var r = i[n.id];
                    var s = [];
                    for (var o in r) {
                      var c = r[o];
                      var l = c.size;
                      var u = c.type;
                      if (!l || !u) {
                        break;
                      }
                      s.push(Object(P.a)(Object(P.a)({}, r[o]), {}, {
                        key: o,
                        keyDesc: zr(o),
                        sizeDesc: jr(l),
                        typeDesc: u === null || u === undefined ? undefined : u.toUpperCase()
                      }));
                    }
                    if (s.length === 2) {
                      e.$set(t[a], "pictureInfos", s.sort(function (t, e) {
                        if (t.key === "standard") {
                          return -1;
                        } else if (e.key === "standard") {
                          return 1;
                        } else {
                          return 0;
                        }
                      }));
                    }
                  }
                });
              case 7:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    },
    getList: function () {
      var t = arguments;
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        var i;
        var r;
        var s;
        var o;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                a = t.length > 0 && t[0] !== undefined ? t[0] : {};
                n.prev = 1;
                a.page_num = a.page_num || 1;
                if (a.page_num && a.page_num === 1) {
                  e.initialLoading = true;
                }
                n.next = 6;
                return e.listService.getList(a);
              case 6:
                i = n.sent;
                r = i.nodes;
                s = i.pageInfo;
                if (e.type === "picture") {
                  e.getExtraInfoForPictures(r);
                }
                r.forEach(function (t) {
                  t.width = t.preview.width;
                  t.height = t.preview.height;
                });
                if (a.page_num && a.page_num > 1) {
                  (o = e.list).push.apply(o, Object(ct.a)(r));
                } else {
                  e.list = r;
                  e.recordExportTemplateId = {};
                }
                e.pageInfo = s;
                e.initialLoading = false;
                e.loadingNextPage = false;
                e.listTracker.setList(e.list);
                return n.abrupt("return", s);
              case 19:
                n.prev = 19;
                n.t0 = n.catch(1);
                console.error(n.t0);
                e.initialLoading = false;
                e.loadingNextPage = false;
              case 24:
              case "end":
                return n.stop();
            }
          }
        }, n, null, [[1, 19]]);
      }))();
    },
    onSearch: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                n.next = 2;
                return e.getList({
                  q: t,
                  colors: "",
                  filter_id: e.listService.allFilterId
                });
              case 2:
                a = n.sent;
                e.listTracker.search({
                  search_word: t,
                  search_result_number: a.total
                });
              case 4:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    },
    handleColorFilter: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        var i;
        var r;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                a = t.name;
                i = Object(Vn.a)(t, Gf);
                if (!e.disableOtherActionsWhenDownloading) {
                  n.next = 3;
                  break;
                }
                return n.abrupt("return");
              case 3:
                n.next = 5;
                return e.getList(i);
              case 5:
                r = n.sent;
                e.listTracker.filter({
                  color: a,
                  search_result_number: r.total
                });
              case 7:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    },
    handleCategoryFilter: function (t) {
      var e = this;
      return Object(d.a)(regeneratorRuntime.mark(function n() {
        var a;
        var i;
        var r;
        return regeneratorRuntime.wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                a = t.name;
                i = Object(Vn.a)(t, Wf);
                if (!e.disableOtherActionsWhenDownloading) {
                  n.next = 3;
                  break;
                }
                return n.abrupt("return");
              case 3:
                n.next = 5;
                return e.getList(i);
              case 5:
                r = n.sent;
                e.listTracker.filter({
                  design_title: a,
                  search_result_number: r.total
                });
              case 7:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    },
    categoreFilterMoreChange: function () {
      var t = this;
      this.$nextTick(function () {
        t.$refs.list.update();
      });
    },
    handleSort: function (t) {
      this.getList(t);
    },
    nextPage: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (!t.loadedAll) {
                  e.next = 2;
                  break;
                }
                return e.abrupt("return");
              case 2:
                if (!t.loadingNextPage) {
                  e.next = 4;
                  break;
                }
                return e.abrupt("return");
              case 4:
                t.loadingNextPage = true;
                n = t.pageInfo.num;
                e.next = 8;
                return t.getList({
                  page_num: n + 1
                });
              case 8:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }))();
    },
    getBackTopTarget: function () {
      return this.$refs.list && this.$refs.list.$el;
    },
    handleColumnChange: function (t) {
      this.columns = t;
    },
    showTryLimitDialog: function () {
      Ca.isTryLimitShown = true;
    },
    closeTryLimitDialog: function () {
      Ca.isTryLimitShown = false;
    },
    handleIsShowNoMemeryDialog: function (t) {
      this.isShowNoMemoryDialog = t;
    },
    getTrialInfo: function () {
      this.$store.dispatch("getDownloadCount");
    },
    refreshListByInitialQuery: function () {
      var t = this.listService.getInitialQuery();
      this.getList(t);
    },
    expose: function (t) {
      if (!this.recordExportTemplateId[t.id]) {
        this.recordExportTemplateId[t.id] = true;
        this.listTracker.exposeTemplate(t);
      }
    }
  }
}
```