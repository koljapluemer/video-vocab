<script setup lang="ts">
import { X } from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
  title: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
}>()

function closeModal() {
  emit('close')
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    closeModal()
  }
}
</script>

<template>
  <dialog :open="props.isOpen" class="modal" @click="handleBackdropClick">
    <div class="modal-box max-h-[85vh] max-w-2xl overflow-y-auto p-0">
      <div class="sticky top-0 z-10 flex items-center justify-between border-b border-base-300 bg-base-100 px-4 py-3">
        <h2 class="text-lg font-semibold">{{ props.title }}</h2>

        <button type="button" class="btn btn-ghost btn-square btn-sm" @click="closeModal">
          <X class="size-4" />
        </button>
      </div>

      <div class="px-4 py-4">
        <slot />
      </div>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button type="button" @click="closeModal">close</button>
    </form>
  </dialog>
</template>
