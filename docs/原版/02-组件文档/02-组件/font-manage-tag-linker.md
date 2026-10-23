# font-manage-tag-linker

> 来源：`app/56d7.js`　大小：1.5KB
> 特征：props / data / methods

## 子组件

`TagInput`、`TagGroup`、`UserTagOverlay`

## props（3）

`font`、`userTags`、`groups`

## computed（1）

`tags`

## methods（8）

`pinTag`、`unpinTag`、`addUserTag`、`toggleFontTag`、`removeUserTagFromFont`、`toggleTag`、`removeTag`、`renameTag`

## 源码

```js
{
  name: "font-manage-tag-linker",
  components: {
    TagInput: _k,
    TagGroup: bb,
    UserTagOverlay: Lb
  },
  props: {
    font: {
      type: Object,
      default: function () {
        return null;
      }
    },
    userTags: {
      type: Array,
      required: true
    },
    groups: {
      type: Object,
      default: function () {
        return {};
      }
    }
  },
  data: function () {
    return {
      beRemoved: null
    };
  },
  computed: {
    tags: function () {
      return this.font && this.groups[this.font.family] || [];
    }
  },
  methods: {
    pinTag: function (t) {
      this.beRemoved = t;
    },
    unpinTag: function () {
      this.beRemoved = null;
    },
    addUserTag: function (t) {
      this.$emit("add-user-tag", {
        text: t,
        autoClose: false
      });
    },
    toggleFontTag: function (t) {
      this.$emit("filter-by-user-tag", Object(P.a)(Object(P.a)({}, t), {}, {
        index: undefined
      }));
    },
    removeUserTagFromFont: function (t) {
      this.$emit("remove-user-tag-from-font", Object(P.a)(Object(P.a)({}, t), {}, {
        index: undefined
      }));
    },
    toggleTag: function (t) {
      if (this.font) {
        this.$emit("add-user-tag-to-font", Object(P.a)(Object(P.a)({}, t), {}, {
          index: undefined
        }));
      } else {
        this.$emit("filter-by-user-tag", t);
      }
    },
    removeTag: function () {
      this.$emit("remove-user-tag", this.beRemoved);
    },
    renameTag: function () {
      this.$emit("rename-user-tag", this.beRemoved);
    }
  }
}
```