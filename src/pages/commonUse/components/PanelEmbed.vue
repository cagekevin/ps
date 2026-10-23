<script setup lang="ts">
import { ref } from 'vue'
import CheckBox from '@/components/CheckBox.vue'
import GButton from '@/components/GButton.vue'
import GRadio from '@/components/GRadio.vue'
import SettingsRow from '@/components/SettingsRow.vue'

/**
 * ① 嵌入图片（官方 `comembed`，render `up()` `app.v4.js:35732`）。
 * 结构：3 勾选 → hr → 3 单选 + 1 勾选 → hr → 1 勾选 → hr → 2 个 50% 按钮（`:35744-35842`）。
 *
 * TODO(T-88): 参数应落 `sj_set.json` 的 `cyDragInAutoEmbed` / `cyPasetImageAutoEmbed` /
 * `cyClipMaskAutoEmbed` / `cyLinkObject` / `cyDeleteNext` / `cyOpenDranInToLinkObject`
 * （官方 watch 见 `:37602-37616`），本轮只做界面、值先留在组件内（命令尚未提供）。
 */
const dragInAutoEmbed = ref(true)
const pasteAutoEmbed = ref(true)
const clipMaskAutoEmbed = ref(false)
const linkMode = ref<'none' | 'original' | 'sameFolder'>('none')
const deleteNextLayer = ref(false)
const dragInToLink = ref(false)
</script>

<template>
  <div class="panel-embed">
    <SettingsRow><CheckBox v-model="dragInAutoEmbed">拖入图片自动嵌入图片</CheckBox></SettingsRow>
    <SettingsRow><CheckBox v-model="pasteAutoEmbed">粘贴图片自动嵌入图片</CheckBox></SettingsRow>
    <SettingsRow
      ><CheckBox v-model="clipMaskAutoEmbed">使用剪贴蒙版时自动嵌入图片</CheckBox></SettingsRow
    >

    <hr class="panel-embed__rule" />

    <SettingsRow>
      <GRadio v-model="linkMode" value="none">嵌入时不存链接对象</GRadio>
    </SettingsRow>
    <SettingsRow>
      <GRadio v-model="linkMode" value="original">嵌入时存链接对象(图片原始路径)</GRadio>
    </SettingsRow>
    <SettingsRow>
      <GRadio v-model="linkMode" value="sameFolder">嵌入时存链接对象(与PSD同一目录)</GRadio>
    </SettingsRow>
    <SettingsRow><CheckBox v-model="deleteNextLayer">删除下一图层</CheckBox></SettingsRow>

    <hr class="panel-embed__rule" />

    <SettingsRow><CheckBox v-model="dragInToLink">拖入图片转成链接智能对象</CheckBox></SettingsRow>

    <hr class="panel-embed__rule" />

    <SettingsRow>
      <GButton width="half">转链接智能对象</GButton>
      <GButton width="half">转智能对象</GButton>
    </SettingsRow>
  </div>
</template>

<style scoped>
.panel-embed {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  padding: var(--sp-5) 0;
}

.panel-embed__rule {
  height: 1px;
  margin: var(--sp-2) 0;
  border: none;
  background: var(--c-divider);
}
</style>
