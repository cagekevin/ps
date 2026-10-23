# 模板 · my-templates_entry

> 来源：`56d7.js` render 函数 `Kd`（行 25195）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="topic-banner">
  <TopicCarousel @detail />
</div>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    staticClass: "topic-banner",
    style: t.bannerStyle
  }, [t.visible ? n("TopicCarousel", {
    attrs: {
      topics: t.topics
    },
    on: {
      detail: t.toDetail,
      "go-center": t.toAll
    }
  }) : t._e()], 1);
}
```