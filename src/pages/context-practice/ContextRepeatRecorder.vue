<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const recorderError = ref('')
const isRecording = ref(false)
const isPreparing = ref(false)
const recordingUrl = ref('')

let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let recordedChunks: Blob[] = []
let isCleaningUp = false

const isRecorderSupported = computed(
  () => Boolean(navigator.mediaDevices?.getUserMedia) && typeof window.MediaRecorder !== 'undefined',
)

function revokeRecordingUrl() {
  if (!recordingUrl.value) {
    return
  }

  URL.revokeObjectURL(recordingUrl.value)
  recordingUrl.value = ''
}

function stopStream() {
  if (!mediaStream) {
    return
  }

  for (const track of mediaStream.getTracks()) {
    track.stop()
  }

  mediaStream = null
}

function resetRecording() {
  revokeRecordingUrl()
  recordedChunks = []
}

function handleRecorderStop() {
  stopStream()

  if (isCleaningUp || recordedChunks.length === 0) {
    recordedChunks = []
    return
  }

  revokeRecordingUrl()
  recordingUrl.value = URL.createObjectURL(new Blob(recordedChunks, { type: 'audio/webm' }))
  recordedChunks = []
}

async function startRecording() {
  if (isRecording.value || isPreparing.value) {
    return
  }

  recorderError.value = ''
  resetRecording()

  if (!isRecorderSupported.value) {
    recorderError.value = 'Recording is unavailable here.'
    return
  }

  isPreparing.value = true

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new window.MediaRecorder(stream)

    mediaStream = stream
    mediaRecorder = recorder
    recordedChunks = []

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data)
      }
    })
    recorder.addEventListener('stop', handleRecorderStop)
    recorder.start()
    isRecording.value = true
  } catch (error) {
    console.error('Failed to start repeat recorder:', error)
    recorderError.value = 'Microphone unavailable.'
    stopStream()
    mediaRecorder = null
    recordedChunks = []
  } finally {
    isPreparing.value = false
  }
}

function stopRecording() {
  if (!mediaRecorder || !isRecording.value) {
    return
  }

  isRecording.value = false
  mediaRecorder.stop()
  mediaRecorder = null
}

function discardRecording() {
  if (isRecording.value) {
    return
  }

  recorderError.value = ''
  resetRecording()
}

onBeforeUnmount(() => {
  isCleaningUp = true

  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
  }

  isRecording.value = false
  mediaRecorder = null
  stopStream()
  revokeRecordingUrl()
  recordedChunks = []
})
</script>

<template>
  <div class="space-y-4">
    <p class="text-lg font-medium">Record yourself repeating it.</p>

    <div class="flex flex-wrap gap-2">
      <button
        v-if="!isRecording"
        type="button"
        class="btn btn-primary"
        :disabled="isPreparing"
        @click="startRecording"
      >
        {{ recordingUrl ? 'Re-record' : 'Start recording' }}
      </button>

      <button
        v-else
        type="button"
        class="btn btn-primary"
        @click="stopRecording"
      >
        Stop recording
      </button>

      <button
        v-if="recordingUrl && !isRecording"
        type="button"
        class="btn btn-ghost"
        @click="discardRecording"
      >
        Discard
      </button>
    </div>

    <span v-if="isPreparing" class="loading loading-spinner loading-md"></span>

    <audio
      v-if="recordingUrl"
      class="w-full"
      controls
      :src="recordingUrl"
    ></audio>

    <div v-if="recorderError" class="alert alert-error">
      <span>{{ recorderError }}</span>
    </div>
  </div>
</template>
