<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CepModal from '@/components/CepModal.vue'
import GInput from '@/components/GInput.vue'
import FontSetIcon from './FontSetIcon.vue'
import FontSetSelect from './FontSetSelect.vue'
import type { HierarchyPreset } from '@/domain/font-set-config'
import { HIERARCHY_TITLES } from '../font-set-constants'

/**
 * 原版 fontSetHierarych（app.v4.js:39344）：
 * 层级预设下拉 + 6 级字号 + 预设保存。
 * 智能排版已整块移除，不再保留相关状态/事件。
 */
const props = defineProps<{
  showCustom: boolean
  levels: number[]
  presets: HierarchyPreset[]
  presetIndex: number
}>()

const emit = defineEmits<{
  (e: 'applyLevel', value: number): void
  (e: 'updateLevels', levels: number[]): void
  (e: 'selectPreset', index: number): void
  (e: 'savePreset', levels: number[]): void
  (e: 'createPreset', name: string, levels: number[]): void
  (e: 'renamePreset', index: number, name: string): void
  (e: 'deletePreset', index: number): void
}>()

const presetNames = computed(() => props.presets.map((preset) => preset.name))
const currentName = computed(() => props.presets[props.presetIndex]?.name ?? '自定义')

const settingsOpen = ref(false)
const draft = ref<number[]>([...props.levels])
watch(
  () => props.levels,
  (value) => {
    draft.value = [...value]
  },
)

function commitLevels() {
  emit(
    'updateLevels',
    draft.value.map((item) => Number(item) || 0),
  )
}

/** 保存到预设：先把输入框的值写回配置，再用同一份值覆盖预设 */
function onSavePreset() {
  commitLevels()
  emit(
    'savePreset',
    draft.value.map((item) => Number(item) || 0),
  )
}

/** 预设重命名 / 新建 */
const nameModal = ref(false)
const nameMode = ref<'create' | 'rename'>('create')
const nameDraft = ref('')
const nameTarget = ref(0)

function openCreate() {
  nameMode.value = 'create'
  nameDraft.value = ''
  nameModal.value = true
}

function openRename(index: number) {
  nameMode.value = 'rename'
  nameTarget.value = index
  nameDraft.value = presetNames.value[index] ?? ''
  nameModal.value = true
}

function confirmName() {
  const name = nameDraft.value.trim()
  if (!name) return
  if (nameMode.value === 'create') {
    // 用输入框里的当前值，不用 props.levels——原版 v-model 直接改 set.ztHierarych，
    // 这里不先同步会把"刚改过但还没保存"的层级丢掉
    const levels = draft.value.map((item) => Number(item) || 0)
    commitLevels()
    emit('createPreset', name, levels)
  } else {
    emit('renamePreset', nameTarget.value, name)
  }
  nameModal.value = false
}
</script>

<template>
  <div class="fontset-hierarchy">
    <div v-if="showCustom" class="fontset-hierarchy__preset">
      <div class="fontset-hierarchy__row">
        <FontSetSelect
          class="fontset-hierarchy__select"
          :items="presetNames"
          :model-value="presetIndex"
          :display="currentName"
          rename
          remove
          @select="emit('selectPreset', $event)"
          @rename="openRename"
          @remove="emit('deletePreset', $event)"
        />
        <FontSetIcon
          name="#iconchangguicengjiyushe"
          title="设置层级预设"
          svg-size="md"
          :selected="settingsOpen"
          @handle="settingsOpen = !settingsOpen"
        />
      </div>

      <div class="fontset-hierarchy__levels">
        <button
          v-for="(level, index) in levels"
          :key="index"
          class="fontset-hierarchy__level"
          type="button"
          :title="HIERARCHY_TITLES[index]"
          @click="emit('applyLevel', level)"
        >
          {{ level }}
        </button>
      </div>

      <div v-show="settingsOpen" class="fontset-hierarchy__editor">
        <div class="fontset-hierarchy__editor-row">
          <input
            v-for="(_, index) in draft"
            :key="index"
            v-model.number="draft[index]"
            class="fontset-hierarchy__editor-input"
            type="text"
            :title="HIERARCHY_TITLES[index]"
          />
        </div>
        <div class="fontset-hierarchy__editor-actions">
          <button
            class="fontset-hierarchy__btn"
            type="button"
            title="替换当前层级"
            @click="onSavePreset"
          >
            保存到预设
          </button>
          <button
            class="fontset-hierarchy__btn"
            type="button"
            title="保存到新预设"
            @click="openCreate"
          >
            新建预设
          </button>
        </div>
      </div>
      <hr class="fontset-hierarchy__line" />
    </div>

    <CepModal
      v-model:visible="nameModal"
      :title="nameMode === 'create' ? '新建预设' : '重命名预设'"
      :width="260"
      @ok="confirmName"
    >
      <GInput
        v-model="nameDraft"
        :placeholder="nameMode === 'create' ? '请输入层级名字' : '请输入新的名字'"
      />
    </CepModal>
  </div>
</template>

<style scoped>
/* 原版各区块自己带 app-padding（0 10）；根节点不再加，否则会变成 20px */
.fontset-hierarchy {
  width: 100%;
}

.fontset-hierarchy__preset {
  margin-top: var(--sp-exact-10);
}

.fontset-hierarchy__row {
  display: flex;
  align-items: center;
  gap: var(--sp-exact-10);
  padding: 0 var(--sp-exact-10);
}

.fontset-hierarchy__select {
  flex: 1;
}

.fontset-hierarchy__levels {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-3);
  margin-top: var(--sp-exact-10);
  padding: 0 var(--sp-exact-10);
}

/* 原版 6 级按钮是 .btn-small：全局 button 底 #535353、无边框、radius 5、height 26 */
.fontset-hierarchy__level {
  /* 同 .btn-small-6：6 列 + 5×6px gap 正好 100% */
  width: var(--fontset-six-col);
  height: var(--h-row);
  padding: 0;
  border: 0;
  border-radius: var(--r-input);
  background: var(--c-font-btn);
  color: var(--text);
  font-size: var(--fs-md);
  cursor: pointer;
}

.fontset-hierarchy__level:hover {
  background: var(--c-font-btn-hover);
}

/* 原版 .Hierarchy-svg-context{padding:13px 10px;background:#222}，整宽 */
.fontset-hierarchy__editor {
  margin-top: var(--sp-exact-10);
  padding: 13px var(--sp-exact-10);
  background: var(--c-sunken);
}

.fontset-hierarchy__editor-row {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-2);
}

/* 原版 .hierarchy-layout-input{width:30px;height:24px;radius 5;background:#111} */
.fontset-hierarchy__editor-input {
  width: 30px;
  height: var(--h-control-sm);
  border: 0;
  border-radius: var(--r-input);
  outline: none;
  background: var(--c-font-editor-input);
  color: var(--text);
  font-size: var(--fs-md);
  text-align: center;
}

.fontset-hierarchy__editor-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-exact-10);
  margin-top: var(--sp-exact-10);
}

/* 原版 .btn-2 走全局 button：height 30、底 #535353、无边框、radius 5、文字 #c3c3c3 */
.fontset-hierarchy__btn {
  width: calc(50% - 5px);
  height: 30px;
  border: 0;
  border-radius: var(--r-input);
  background: var(--c-font-btn);
  color: var(--text);
  font-size: var(--fs-md);
  cursor: pointer;
}

.fontset-hierarchy__btn:hover {
  background: var(--c-font-btn-hover);
}

.fontset-hierarchy__line {
  height: 1px;
  margin: var(--sp-exact-10) 0 var(--sp-exact-5);
  border: 0;
  background: var(--c-divider);
}
</style>
