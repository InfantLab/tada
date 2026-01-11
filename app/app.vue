<script setup>
// Set dark mode as default (cosmic theme)
onMounted(() => {
  if (!localStorage.getItem("color-theme")) {
    document.documentElement.classList.add("dark");
  }
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
