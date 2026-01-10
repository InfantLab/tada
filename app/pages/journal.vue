<script setup lang="ts">
// Journal page - dream journaling and free-form entries

definePageMeta({
  layout: 'default',
})

// TODO: Fetch journal entries from API
const entries = ref<any[]>([])
const isLoading = ref(true)
const selectedType = ref<'all' | 'dream' | 'note' | 'tada'>('all')

onMounted(async () => {
  // Placeholder data
  entries.value = [
    {
      id: '1',
      type: 'dream',
      title: 'Flying over mountains',
      notes: 'I was soaring above snow-capped peaks. The air was crisp and clear. Could see tiny villages below...',
      occurredAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      data: {
        lucid: true,
        vivid: 4,
        emotions: ['joy', 'wonder'],
      },
    },
    {
      id: '2',
      type: 'tada',
      title: 'Finished the API refactor',
      notes: 'Finally completed the major refactoring work. Tests all passing.',
      occurredAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      type: 'note',
      title: 'Gratitude',
      notes: 'Grateful for the sunny morning, good coffee, and productive work session.',
      occurredAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
  ]
  isLoading.value = false
})

const filteredEntries = computed(() => {
  if (selectedType.value === 'all') return entries.value
  return entries.value.filter(e => e.type === selectedType.value)
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'dream': return '🌙'
    case 'tada': return '🎉'
    case 'note': return '📝'
    default: return '💭'
  }
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">Journal</h1>
        <p class="text-sm text-stone-500 dark:text-stone-400">Dreams, notes & accomplishments</p>
      </div>
      
      <!-- Add entry button -->
      <NuxtLink 
        to="/add?type=journal"
        class="flex items-center gap-2 px-4 py-2 bg-tada-600 hover:bg-tada-700 text-white rounded-lg font-medium transition-colors shadow-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span class="hidden sm:inline">New Entry</span>
      </NuxtLink>
    </div>

    <!-- Type filter -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        v-for="type in ['all', 'dream', 'tada', 'note']"
        :key="type"
        @click="selectedType = type as any"
        class="px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors"
        :class="selectedType === type 
          ? 'bg-tada-600 text-white' 
          : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'"
      >
        <span v-if="type === 'all'">All</span>
        <span v-else-if="type === 'dream'">🌙 Dreams</span>
        <span v-else-if="type === 'tada'">🎉 Tada</span>
        <span v-else>📝 Notes</span>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-tada-600 border-t-transparent"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredEntries.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">📖</div>
      <h2 class="text-xl font-semibold text-stone-700 dark:text-stone-200 mb-2">
        No entries yet
      </h2>
      <p class="text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
        Capture your dreams, celebrate your accomplishments, or jot down thoughts.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button 
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
        >
          🌙 Record a dream
        </button>
        <button 
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-tada-600 hover:bg-tada-700 text-white rounded-lg font-medium transition-colors"
        >
          🎉 Celebrate a win
        </button>
      </div>
    </div>

    <!-- Entries list -->
    <div v-else class="space-y-4">
      <NuxtLink 
        v-for="entry in filteredEntries" 
        :key="entry.id"
        :to="`/entry/${entry.id}`"
        class="block bg-white dark:bg-stone-800 rounded-xl p-4 shadow-sm border border-stone-200 dark:border-stone-700 hover:border-tada-300 dark:hover:border-tada-600 transition-colors"
      >
        <div class="flex items-start gap-3">
          <!-- Type icon -->
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-700 flex items-center justify-center text-xl">
            {{ getTypeIcon(entry.type) }}
          </div>
          
          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-medium text-stone-800 dark:text-stone-100 truncate">
                {{ entry.title }}
              </h3>
              <span class="text-xs text-stone-400 dark:text-stone-500 whitespace-nowrap">
                {{ formatDate(entry.occurredAt) }}
              </span>
            </div>
            <p v-if="entry.notes" class="text-sm text-stone-600 dark:text-stone-300 line-clamp-2">
              {{ entry.notes }}
            </p>
            
            <!-- Dream-specific metadata -->
            <div v-if="entry.type === 'dream' && entry.data" class="flex gap-2 mt-2">
              <span 
                v-if="entry.data.lucid"
                class="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
              >
                Lucid
              </span>
              <span 
                v-if="entry.data.vivid"
                class="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
              >
                Vivid: {{ entry.data.vivid }}/5
              </span>
            </div>
          </div>
          
          <!-- Arrow -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
