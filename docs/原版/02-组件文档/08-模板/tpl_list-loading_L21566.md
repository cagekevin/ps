# 模板 · list-loading

> 来源：`56d7.js` render 函数 `Rh`（行 21566）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="folder_nav">
  <div class="folder_nav_back" @click :class="{ "folder_nav_back--disable": t.data.parentFolder === null }">
    <GIcon :style="{ fontSize: "16px", color: t.data.parentFolder === null ? "rgba(196, 196, 196, 0" type="back" />
  </div>
  <div class="folder_nav_forward" @click :class="{ "folder_nav_forward--disable": t.historyFolderRecords.length === 0 }">
    <GIcon :style="{ fontSize: "16px", color: t.historyFolderRecords.length === 0 ? "rgba(196, 196," type="forward" />
  </div>
  <div class="folder_nav_name cursor" @click :class="{ "folder_nav_name--focus": t.fileDropDown }">
    <div class="folder_nav_name_icon" @handle>
      <GIcon type="folder" />
    </div>
    <div class="folder_nav_name_name overflow-text">
    </div>
  </div>
  <div class="folder_nav_handle">
    <div class="folder_nav_handle_clear" @click>
      清空
    </div>
  </div>
</div>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    staticClass: "folder_nav"
  }, [n("div", {
    staticClass: "folder_nav_back",
    class: {
      "folder_nav_back--disable": t.data.parentFolder === null
    },
    on: {
      click: function (e) {
        return t.openFolder(t.data.parentFolder);
      }
    }
  }, [n("GIcon", {
    style: {
      fontSize: "16px",
      color: t.data.parentFolder === null ? "rgba(196, 196, 196, 0.30)" : "#c4c4c4"
    },
    attrs: {
      type: "back"
    }
  })], 1), n("div", {
    staticClass: "folder_nav_forward",
    class: {
      "folder_nav_forward--disable": t.historyFolderRecords.length === 0
    },
    on: {
      click: t.openFolderForward
    }
  }, [n("GIcon", {
    style: {
      fontSize: "16px",
      color: t.historyFolderRecords.length === 0 ? "rgba(196, 196, 196, 0.30)" : "#c4c4c4"
    },
    attrs: {
      type: "forward"
    }
  })], 1), n("div", {
    staticClass: "folder_nav_name cursor",
    class: {
      "folder_nav_name--focus": t.fileDropDown
    },
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.dropOpen("filecom");
      }
    }
  }, [n("div", {
    staticClass: "folder_nav_name_icon",
    on: {
      handle: function (e) {
        return t.dropOpen("filecom");
      }
    }
  }, [n("GIcon", {
    staticStyle: {
      "font-size": "16px"
    },
    attrs: {
      type: "folder"
    }
  })], 1), n("div", {
    staticClass: "folder_nav_name_name overflow-text"
  }, [t._v(" " + t._s(t.pathName() != "" ? t.pathName() : t.data.folderInfo.name) + " ")])]), n("div", {
    staticClass: "folder_nav_handle"
  }, [t.data.showType == 2 ? n("div", {
    staticClass: "folder_nav_handle_clear",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.clearRecycle();
      }
    }
  }, [t._v(" 清空 ")]) : t._e()])]);
}
```