<template>
  <header>
    <nav class="flex flex-row gap-2 m-auto justify-center">
      <router-link class="btn" to="/">Home</router-link>
      <router-link class="btn" to="/video-list">Video List</router-link>
    </nav>
  </header>
  <main>
    <router-view />

  </main>
</template>

<script setup lang="ts">
</script>
