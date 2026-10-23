# 模板 · activate-modal

> 来源：`app.v4.js` render 函数 `NO`（行 61800）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="app-padding">
  <p class="user-info-title">
    会员信息
  </p>
  <div class="user-info-item">
    <span class="left">
      用户昵称
    </span>
    <span />
  </div>
  <div class="user-info-item">
    <span class="left">
      用户ID
    </span>
    <span />
  </div>
  <div class="user-info-item">
    <span class="left">
      会员版本
      <GTooltip>
        <template>
          仅展示当前生效的会员版本，其他待生效版本请到官网-个人中心查看
        </template>
        <Icon type="a-Warning-Fill" />
      </GTooltip>
    </span>
    <span />
  </div>
  <div class="user-info-item">
    <span class="left">
      有效期至
    </span>
    <span />
  </div>
  <div class="user-info-item">
    <span class="left" />
    <span />
  </div>
  <GButton class="main-btn" @click type="primary">
  </GButton>
  <div class="update-vip-container">
    <span class="update-vip" @click>
      会员卡激活
    </span>
  </div>
  <ActivateModal />
  <ConfirmPayModal />
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "app-padding"
      }, [n("p", {
        staticClass: "user-info-title"
      }, [t._v("会员信息")]), n("div", {
        staticClass: "user-info-item"
      }, [n("span", {
        staticClass: "left"
      }, [t._v("用户昵称")]), n("span", [t._v(t._s(t.userName))])]), n("div", {
        staticClass: "user-info-item"
      }, [n("span", {
        staticClass: "left"
      }, [t._v("用户ID")]), n("span", [t._v(t._s(t.userId))])]), t.cepId === "CEP001" ? [n("div", {
        staticClass: "user-info-item"
      }, [n("span", {
        staticClass: "left"
      }, [t._v(" 会员版本 "), t.userVipIsMulti ? n("GTooltip", {
        attrs: {
          placement: "bottom",
          overlayClassName: "vip_version_tips"
        }
      }, [n("template", {
        slot: "title"
      }, [t._v(" 仅展示当前生效的会员版本，其他待生效版本请到官网-个人中心查看 ")]), n("Icon", {
        staticStyle: {
          color: "#8E8E8E"
        },
        attrs: {
          type: "a-Warning-Fill"
        }
      })], 2) : t._e()], 1), n("span", [t._v(t._s(t.userEdition))])]), n("div", {
        staticClass: "user-info-item"
      }, [n("span", {
        staticClass: "left"
      }, [t._v("有效期至")]), n("span", [t._v(t._s(t.userVipExpiredTime))])])] : n("div", {
        staticClass: "user-info-item"
      }, [n("span", {
        staticClass: "left"
      }, [t._v(t._s(t.expirationTips.key))]), n("span", [t._v(t._s(t.expirationTips.value))])]), t.operationDesc ? n("GButton", {
        staticClass: "main-btn",
        attrs: {
          type: "primary"
        },
        on: {
          click: t.toBuy
        }
      }, [t._v(" " + t._s(t.operationDesc) + " ")]) : t._e(), t.isForeverMember ? t._e() : n("div", {
        staticClass: "update-vip-container"
      }, [n("span", {
        staticClass: "update-vip",
        on: {
          click: t.showUpVip
        }
      }, [t._v("会员卡激活")])]), n("ActivateModal", t._b({
        attrs: {
          show: t.showInput,
          title: "会员卡激活",
          "confirm-loading": t.confirmLoading
        },
        on: {
          close: function (e) {
            t.showInput = false;
          },
          ok: function (e) {
            return t.updateVip(e);
          }
        }
      }, "ActivateModal", t.$attrs, false)), n("ConfirmPayModal", t._b({
        attrs: {
          visible: t.confirmPayModalVisible,
          "confirm-loading": t.confirmPayModalLoading
        },
        on: {
          close: function (e) {
            t.confirmPayModalVisible = false;
          },
          ok: t.finishPay
        }
      }, "ConfirmPayModal", t.$attrs, false))], 2);
    }
```