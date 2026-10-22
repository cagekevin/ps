<script setup lang="ts">
import CepModal from '@/components/CepModal.vue'

/**
 * 「从云端拉取」确认框（T-78）。
 *
 * 这是**会丢本地数据**的操作，所以确认框的首要职责是把话说死：
 * 云端整包覆盖本地，本地还没推上去的改动会没有。文案里不出现"同步"这种中性的词。
 *
 * 只做确认，不自己发请求：确认后由设置页跑 `cloud.download`（走队列的 runSerial）。
 */
withDefaults(
  defineProps<{
    visible: boolean
    /** 「上次同步」的现成文案（'尚未同步' 或时间） */
    syncedText: string
    /** 队列里还没推上去的条数 */
    queuedUnits: number
  }>(),
  {},
)

const emit = defineEmits<{ (e: 'update:visible', value: boolean): void; (e: 'ok'): void }>()

function onOk() {
  emit('ok')
  emit('update:visible', false)
}
</script>

<template>
  <CepModal
    :visible="visible"
    title="从云端拉取"
    ok-text="覆盖本地"
    cancel-text="取消"
    @ok="onOk"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="cloud-pull">
      <p class="cloud-pull__line">
        这会把云端预设整个写到本地，<strong>覆盖本地现有的同类数据</strong>
        （字体收藏 / 标签 / 字体设置 / 层级预设 / 动作库）。
      </p>
      <p class="cloud-pull__danger">本地还没推上去的改动会被覆盖丢失。</p>

      <div class="cloud-pull__row">
        <span>上次同步</span>
        <span class="cloud-pull__value">{{ syncedText }}</span>
      </div>
      <div class="cloud-pull__row">
        <span>本地待推送</span>
        <span class="cloud-pull__value">{{ queuedUnits }} 项</span>
      </div>
    </div>
  </CepModal>
</template>

<style scoped>
.cloud-pull {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  color: var(--c-text-strong);
  font-size: var(--fs-md);
}

.cloud-pull__line,
.cloud-pull__danger {
  margin: 0;
}

.cloud-pull__danger {
  color: var(--c-danger);
}

.cloud-pull__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
}

.cloud-pull__value {
  color: var(--c-text-inverse);
}
</style>
