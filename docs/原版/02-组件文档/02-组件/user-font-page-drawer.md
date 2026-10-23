# user-font-page-drawer

> 来源：`app/56d7.js`　大小：0.8KB
> 特征：methods

## 子组件

`FilterPanel`

## computed（1）

`tagCategories`

## methods（2）

`toggleTagFilter`、`cleanCategoryFilter`

## 源码

```js
{
  name: "user-font-page-drawer",
  components: {
    FilterPanel: Kk
  },
  computed: {
    tagCategories: function () {
      return Rw.tagCategories;
    }
  },
  methods: {
    toggleTagFilter: function (t) {
      t.index;
      var e = t.selected;
      var n = Object(Vn.a)(t, Yk);
      if (e) {
        Rw.addTagFilter(n);
      } else {
        Rw.removeTagFilter(n);
      }
      Rw.toggleTagCategory(Object(P.a)(Object(P.a)({}, n), {}, {
        selected: e
      }));
      Rw.resetPage();
      f.a.info({
        msg: "FONT_MANAGE_TOGGLE_TAG_FILTER"
      });
    },
    cleanCategoryFilter: function (t) {
      Rw.removeCategoryTagFilter({
        category: t
      });
      Rw.removeWholeTagCategory({
        category: t
      });
      Rw.resetPage();
      f.a.info({
        msg: "FONT_MANAGE_RESET_TAG_FILTER"
      });
    }
  }
}
```