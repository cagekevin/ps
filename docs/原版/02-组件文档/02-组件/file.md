# file

> 来源：`app/56d7.js`　大小：4.2KB
> 特征：data / methods

## 子组件

`fileChilder`、`fileNumber`、`GIcon`、`GInput`

## computed（2）

`fileNumber`、`getFileNumberList`

## methods（10）

`handlerBesideScroll`、`changeFolderInput`、`getFolderNumber`、`changeId`、`addFolder`、`confirmAddFolder`、`showAll`、`showUnfiledTemplate`、`showRecycleTemplate`、`open`

## 文案（5）

输入字符数不超过 · 位 · 未命名文件夹 · 请输入文件名 · 新建文件夹成功

## 源码

```js
{
  name: "file",
  components: {
    fileChilder: Bc,
    fileNumber: Wc,
    GIcon: ie.a,
    GInput: $a.a
  },
  data: function () {
    return {
      data: Ln.a,
      testindex: -1,
      mouseDownIstrue: false,
      num: null,
      mouseDownIndex: null,
      condition: Math.floor(Math.random() * 10000000),
      updataStatus: false,
      newFolder: {
        isActive: false,
        value: "",
        confirmType: ""
      },
      besideScrollInfo: {
        scrollLeft: 0,
        clientWidth: 0
      }
    };
  },
  computed: {
    fileNumber: function () {
      var t = this;
      var e = {};
      var n = function n(a) {
        var i;
        var r = Object(T.a)(a);
        try {
          for (r.s(); !(i = r.n()).done;) {
            var s = i.value;
            if (s.children.length > 0) {
              e[s.id] = t.getFolderNumber(s, 0);
              n(s.children);
            } else {
              e[s.id] = s.number;
            }
          }
        } catch (o) {
          r.e(o);
        } finally {
          r.f();
        }
      };
      n(this.data.folder);
      return e;
    },
    getFileNumberList: function () {
      var t = this;
      var e = function e(n, a) {
        return n.reduce(function (n, a) {
          var i = a.children.length && a.showChildren;
          if (i) {
            n.push(a.number);
          } else {
            n.push(t.fileNumber[a.id]);
          }
          if (a.id === t.$temp.newFolderParentsId) {
            n.push(0);
          }
          if (i) {
            return e(a.children, n);
          } else {
            return n;
          }
        }, a);
      };
      var n = e(this.data.folder, []);
      return n;
    }
  },
  watch: {
    "$store.state.showMenu": function (t) {
      this.$emit("isOpen", this.$store.state.showMenu === this.condition);
      if (this.updataStatus !== false) {
        this.updataStatus = false;
        this.$temp.updataFolderData();
      }
    }
  },
  methods: {
    handlerBesideScroll: function (t, e) {
      Object.assign(this.besideScrollInfo, {
        scrollLeft: t,
        clientWidth: e
      });
    },
    changeFolderInput: function (t) {
      var e = t.target.value.substring(0, 38);
      if (t.target.value.length > 38) {
        G.a.info("输入字符数不超过38位");
        t.target.value = e;
      }
      this.newFolder.value = e;
    },
    getFolderNumber: function (t, e) {
      e += t.number;
      for (var n = 0; n < t.children.length; n++) {
        if (t.children[n].children.length > 0) {
          e = this.getFolderNumber(t.children[n], e);
        } else {
          e += t.children[n].number;
        }
      }
      return e;
    },
    changeId: function () {
      this.$emit("changeId");
    },
    addFolder: function () {
      var t = this;
      this.newFolder.value = "未命名文件夹";
      this.newFolder.isActive = true;
      this.$nextTick(function () {
        t.$refs.folderInput.select();
        t.$refs.fileScroll.$el.scrollTo(0, t.$refs.fileScroll.$el.scrollHeight);
      });
    },
    confirmAddFolder: function (t) {
      if (t === "enter") {
        this.newFolder.confirmType = "enter";
      } else if (t === "blur" && this.newFolder.confirmType === "enter") {
        this.newFolder.confirmType = "";
        return;
      }
      if (this.newFolder.value === "") {
        G.a.error("请输入文件名");
        return false;
      }
      Pc.addFolder(this.newFolder.value);
      G.a.success("新建文件夹成功");
      this.newFolder.isActive = false;
      this.newFolder.value = "";
    },
    showAll: function () {
      this.data.showAllTemplate(this.$temp.loadAllCacheInfo);
      this.$emit("changeId");
      this.$store.state.showMenu = -1;
    },
    showUnfiledTemplate: function () {
      this.data.showUnfiledTemplate();
      this.$emit("changeId");
      this.$store.state.showMenu = -1;
    },
    showRecycleTemplate: function () {
      Xc.showRecycleTemplate();
      this.$emit("changeId");
      this.$store.state.showMenu = -1;
    },
    open: function () {
      if (V.a.mbMultiMode && this.$store.state.showMenu !== this.condition) {
        this.$temp.initFolderData();
      }
      this.$store.state.showMenu = this.$store.state.showMenu === this.condition ? -1 : this.condition;
    }
  }
}
```