# font-manage-user-tag-filter

> 来源：`app/56d7.js`　大小：1.6KB
> 特征：props / data / methods

## 子组件

`Icon`、`TagGroup`、`UserTagOverlay`

## props（1）

`tags`

## computed（1）

`tagsCount`

## methods（8）

`pinTag`、`unpinTag`、`toggleTag`、`removeTag`、`renameTag`、`toggleTagManage`、`toggleUserTagContainer`、`togglePreview`

## 源码

```js
{
  name: "font-manage-user-tag-filter",
  components: {
    Icon: Jt.a,
    TagGroup: bb,
    UserTagOverlay: Lb
  },
  props: {
    tags: {
      type: Array,
      required: true
    }
  },
  data: function () {
    return {
      beRemoved: null,
      open: false,
      show: false
    };
  },
  computed: {
    tagsCount: function () {
      return this.tags.length;
    }
  },
  watch: {
    tagsCount: function (t, e) {
      var n = this;
      if (t !== e) {
        this.$nextTick(function () {
          return n.togglePreview();
        });
      }
    }
  },
  mounted: function () {
    var t = this;
    Pb = Eb(function () {
      return t.togglePreview();
    }, 100, false);
    window.addEventListener("resize", Pb);
  },
  beforeDestroy: function () {
    window.removeEventListener("resize", Pb);
  },
  methods: {
    pinTag: function (t) {
      this.beRemoved = t;
    },
    unpinTag: function () {
      this.beRemoved = null;
    },
    toggleTag: function (t) {
      this.$emit("filter-by-user-tag", t);
    },
    removeTag: function () {
      this.$emit("remove-user-tag", this.beRemoved);
    },
    renameTag: function () {
      this.$emit("rename-user-tag", this.beRemoved);
    },
    toggleTagManage: function () {
      this.$emit("toggle-tag-manage");
    },
    toggleUserTagContainer: function () {
      this.open = !this.open;
    },
    togglePreview: function () {
      var t = this.$refs["user-tags"].getBoundingClientRect().height;
      if (t >= 94) {
        this.open = this.open || false;
        this.show = true;
      } else {
        this.show = false;
        this.open = false;
      }
    }
  }
}
```