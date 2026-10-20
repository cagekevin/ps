<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * 星级收藏，对应原版 font-manage-rating。
 * hover 时临时显示到第几星，移开恢复成已选值；点击 emit 具体星数。
 *
 * 原版的图标 sprite 里没有星形图标，这里用文本 ★，避免瞎编图标名。
 */
const props = withDefaults(defineProps<{ selected?: number; nums?: number }>(), {
  selected: 0,
  nums: 3,
})

const emit = defineEmits<{ (e: 'rating', value: number): void }>()

const score = ref(props.selected)

watch(
  () => props.selected,
  (value) => {
    score.value = value
  },
)

function enter(index: number) {
  score.value = index
}

function leave() {
  score.value = props.selected
}
</script>

<template>
  <div class="rating" @mouseleave="leave">
    <button
      v-for="index in nums"
      :key="index"
      class="rating__star"
      :class="{ 'is-on': index <= score }"
      type="button"
      @mouseenter="enter(index)"
      @click.stop="emit('rating', index)"
    >
      ★
    </button>
  </div>
</template>

<style scoped>
.rating {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
}

.rating__star {
  padding: 0 0 0 var(--sp-2);
  border: 0;
  background: transparent;
  color: var(--bg-raise);
  font-size: var(--fs-md);
  line-height: 1;
}

.rating__star.is-on {
  color: var(--c-text-muted);
}

.rating__star:hover {
  color: var(--text-strong);
}
</style>
