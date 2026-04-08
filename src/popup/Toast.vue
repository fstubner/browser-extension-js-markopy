<template>
  <div class="fixed bottom-4 left-4 right-4 bg-slate-800 text-white px-4 py-3 rounded shadow-lg animate-bounce">
    {{ message }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
  type?: 'success' | 'error';
}>();
</script>
