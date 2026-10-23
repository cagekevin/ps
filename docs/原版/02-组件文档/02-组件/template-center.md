# template-center

> 来源：`app/56d7.js`　大小：10.2KB
> 特征：props / data / methods

## 子组件

`Icon`、`InputSearch`、`OtherFilters`、`LibCategoryFilter`、`LibListBottom`、`TemplateList`、`BackTop`、`NewSpin`、`Empty`、`Limite30Dialog`、`NoMemoryDialog`、`DownloadManagement`、`DownloadCountTips`

## props（2）

`visible`、`updater`

## computed（7）

`loadedAll`、`colors`、`ratios`、`filter_id`、`sort`、`totalText`、`isTryLimitShown`

## methods（18）

`handleComponentTracker`、`init`、`getOptions`、`getList`、`onSearch`、`handleColorFilter`、`handleFormatFilter`、`handleCategoryFilter`、`handleSort`、`nextPage`、`getBackTopTarget`、`handleColumnChange`、`showTryLimitDialog`、`closeTryLimitDialog`、`handleIsShowNoMemeryDialog`、`getTrialInfo`、`refreshListByInitialQuery`、`expose`

## 文案（2）

搜索结果 · 全部

## 源码

```js
{
  name: "template-center",
  provide: function () {
    return {
      listTracker: Ko
    };
  },
  components: {
    Icon: ie.a,
    InputSearch: Xa,
    OtherFilters: Bs,
    LibCategoryFilter: Ai,
    LibListBottom: bi,
    TemplateList: Io,
    BackTop: Ba.a,
    NewSpin: W.a,
    Empty: ti,
    Limite30Dialog: Di,
    NoMemoryDialog: $i,
    DownloadManagement: Is,
    DownloadCountTips: Po
  },
  props: {
    visible: {
      type: Boolean,
      default: false
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
      formatOptions: [],
      sortOptions: [],
      list: [],
      pageInfo: null,
      listService: null,
      initialLoading: false,
      loadingNextPage: false,
      columns: 2,
      sliderValue: 0,
      isShowNoMemoryDialog: false,
      recordExportTemplateId: {}
    };
  },
  computed: {
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
    ratios: function () {
      return Object(ne.get)(this.listService, "query.ratios") || "";
    },
    filter_id: function () {
      return Object(ne.get)(this.listService, "query.filter_id");
    },
    sort: function () {
      return Object(ne.get)(this.listService, "query.sort") || "";
    },
    totalText: function () {
      var t = this.listService.query;
      var e = t.q;
      var n = t.colors;
      var a = t.ratios;
      var i = t.filter_id;
      var r = e || n || a || i !== this.listService.allFilterId;
      if (r) {
        return "搜索结果";
      } else {
        return "全部";
      }
    },
    isTryLimitShown: function () {
      return Ca.isTryLimitShown;
    }
  },
  mounted: function () {
    this.init();
  },
  methods: {
    handleComponentTracker: function (t) {
      var e;
      var n = t.method;
      var a = t.params;
      if ((e = Ko[n]) !== null && e !== undefined) {
        e.call(Ko, a);
      }
    },
    init: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                t.listService = qo;
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
        var s;
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
                r = n.formatOptions;
                s = n.sortOptions;
                t.categoryOptions = a;
                t.colorOptions = i;
                t.formatOptions = r;
                t.sortOptions = s;
              case 11:
              case "end":
                return e.stop();
            }
          }
        }, e);
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
                Ko.setList(e.list);
                return n.abrupt("return", s);
              case 18:
                n.prev = 18;
                n.t0 = n.catch(1);
                e.initialLoading = false;
                e.loadingNextPage = false;
              case 22:
              case "end":
                return n.stop();
            }
          }
        }, n, null, [[1, 18]]);
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
                  ratios: "",
                  filter_id: e.listService.allFilterId
                });
              case 2:
                a = n.sent;
                Ko.search({
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
                i = Object(Vn.a)(t, Wo);
                n.next = 3;
                return e.getList(i);
              case 3:
                r = n.sent;
                Ko.filter({
                  color: a,
                  search_result_number: r.total
                });
              case 5:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
    },
    handleFormatFilter: function (t) {
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
                i = Object(Vn.a)(t, Jo);
                n.next = 3;
                return e.getList(i);
              case 3:
                r = n.sent;
                Ko.filter({
                  format: a,
                  search_result_number: r.total
                });
              case 5:
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
                i = Object(Vn.a)(t, Xo);
                n.next = 3;
                return e.getList(i);
              case 3:
                r = n.sent;
                Ko.filter({
                  design_title: a,
                  search_result_number: r.total
                });
              case 5:
              case "end":
                return n.stop();
            }
          }
        }, n);
      }))();
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
        Ko.exposeTemplate(t);
      }
    }
  }
}
```