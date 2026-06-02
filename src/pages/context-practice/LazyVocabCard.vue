<script setup lang="ts">
defineProps<{
  word: string
  translation: string
}>()

const emit = defineEmits<{
  (event: 'dismiss'): void
}>()
</script>

<template>
  <div
    class="pointer-events-auto cursor-pointer rounded-box bg-base-200/90 px-3 py-1.5 text-sm font-medium shadow-sm transition-opacity hover:opacity-70 xl:px-4 xl:py-2 xl:text-2xl"
    @click="emit('dismiss')"
  >
    {{ word }} = {{ translation }}
  </div>
</template>

<style scoped>
.vocab-card-enter-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.vocab-card-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.vocab-card-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.vocab-card-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
