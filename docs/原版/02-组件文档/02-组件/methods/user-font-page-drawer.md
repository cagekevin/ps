# user-font-page-drawer · 方法实现

> 来源：`user-font-page-drawer.js`
> 方法数：2

## `toggleTagFilter`

参数：`t`

```js
function (t) {
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
    }
```

## `cleanCategoryFilter`

参数：`t`

```js
function (t) {
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
```
