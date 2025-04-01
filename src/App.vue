<template>
  <header>
    <nav class="flex flex-row gap-2 m-auto justify-center">
      <router-link class="btn" to="/">Videos</router-link>
    </nav>
  </header>
  <main>
    <router-view :key="$route.fullPath" />

  </main>
</template>

<script setup lang="ts">
</script>
