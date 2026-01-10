<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
/* Tada brand color utilities */
.text-tada-50 { color: #ecfdf5; }
.text-tada-100 { color: #d1fae5; }
.text-tada-200 { color: #a7f3d0; }
.text-tada-300 { color: #6ee7b7; }
.text-tada-400 { color: #34d399; }
.text-tada-500 { color: #10b981; }
.text-tada-600 { color: #059669; }
.text-tada-700 { color: #047857; }
.text-tada-800 { color: #065f46; }
.text-tada-900 { color: #064e3b; }

.bg-tada-50 { background-color: #ecfdf5; }
.bg-tada-100 { background-color: #d1fae5; }
.bg-tada-200 { background-color: #a7f3d0; }
.bg-tada-300 { background-color: #6ee7b7; }
.bg-tada-400 { background-color: #34d399; }
.bg-tada-500 { background-color: #10b981; }
.bg-tada-600 { background-color: #059669; }
.bg-tada-700 { background-color: #047857; }
.bg-tada-800 { background-color: #065f46; }
.bg-tada-900 { background-color: #064e3b; }

.border-tada-300 { border-color: #6ee7b7; }
.border-tada-500 { border-color: #10b981; }
.border-tada-600 { border-color: #059669; }

.ring-tada-500 { --tw-ring-color: #10b981; }

/* Dark mode variants */
@media (prefers-color-scheme: dark) {
  .dark\:text-tada-300 { color: #6ee7b7; }
  .dark\:text-tada-400 { color: #34d399; }
  .dark\:bg-tada-900\/50 { background-color: rgb(6 78 59 / 0.5); }
  .dark\:bg-tada-900\/20 { background-color: rgb(6 78 59 / 0.2); }
  .dark\:hover\:border-tada-600:hover { border-color: #059669; }
}
</style>
