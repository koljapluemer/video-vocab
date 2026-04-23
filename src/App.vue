<template>
  <div class="flex min-h-screen flex-col">
    <header class="py-4">
      <nav class="m-auto flex flex-row justify-center gap-2">
        <router-link class="btn" to="/">Videos</router-link>
      </nav>
    </header>
    <main class="flex-1">
      <router-view :key="$route.fullPath" />
    </main>
    <footer class="border-t border-base-300 px-4 py-4">
      <div class="container mx-auto flex justify-center">
        <router-link class="btn btn-ghost btn-sm" :to="{ name: 'target-language' }">
          Change Language
        </router-link>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
</script>
