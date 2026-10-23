<script setup lang="ts">
import { ref } from 'vue'
import GAnchorGrid from '@/components/GAnchorGrid.vue'
import GButton from '@/components/GButton.vue'
import GInput from '@/components/GInput.vue'
import SettingsRow from '@/components/SettingsRow.vue'
import { useCommand } from '@/components/command/useCommand'

/**
 * ⑧ 自定义变换（官方 `comcustomChange`，render `Ip()` `app.v4.js:36062`）。
 * 结构：3 行「两个等宽输入」（`:36076-36177`）→ 九宫格锚点（两段容器 `:36198`/`:36223`）
 * → hr → 一行两个 50% 按钮（`:36253-36265`）。
 * TODO(T-88): 6 个输入与锚点选择应可保存（`getOption()`），本轮只做界面。
 */
// 官方 data 六项（pp.v4.js:36316-36323：number / scale / leftRigth / topBottom / angle / opacity）
const number = ref('')
const scale = ref('')
const leftRight = ref('')
const topBottom = ref('')
const angle = ref('')
const opacity = ref('')
/** 锚点下标（官方 pointIdex，默认 0 = 第一个） */
const anchorIndex = ref(0)

const transformCmd = useCommand('commonUse.transform')

/** 官方 getCustomBuildTransformOption()：[数量, 缩放, 左右, 上下, 角度, 不透明度, 锚点下标]（顺序取自 data 声明 :36316-36323） */
function runTransform() {
  void transformCmd.run({
    params: [
      Number(number.value) || 0,
      Number(scale.value) || 100,
      leftRight.value,
      topBottom.value,
      Number(angle.value) || 0,
      Number(opacity.value) || 100,
      anchorIndex.value,
    ],
  })
}

function resetParams() {
  number.value = ''
  scale.value = ''
  leftRight.value = ''
  topBottom.value = ''
  angle.value = ''
  opacity.value = ''
  anchorIndex.value = 0
}
</script>

<template>
  <div class="panel-custom">
    <SettingsRow>
      <GInput v-model="number" class="u-fill" size="small" />
      <GInput v-model="scale" class="u-fill" size="small" />
    </SettingsRow>
    <SettingsRow>
      <GInput v-model="leftRight" class="u-fill" size="small" />
      <GInput v-model="topBottom" class="u-fill" size="small" />
    </SettingsRow>
    <SettingsRow>
      <GInput v-model="angle" class="u-fill" size="small" />
      <GInput v-model="opacity" class="u-fill" size="small" />
    </SettingsRow>

    <GAnchorGrid v-model="anchorIndex" class="panel-custom__anchors" />

    <hr class="panel-custom__rule" />

    <SettingsRow>
      <GButton width="half" @click="runTransform">生成变换</GButton>
      <GButton width="half" @click="resetParams">重置参数</GButton>
    </SettingsRow>
  </div>
</template>

<style scoped>
.panel-custom {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  padding: var(--sp-5) 0;
}

.panel-custom__anchors {
  width: 100%;
}

.panel-custom__rule {
  height: 1px;
  margin: var(--sp-2) 0;
  border: none;
  background: var(--c-divider);
}
</style>
