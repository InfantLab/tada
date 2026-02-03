<script setup lang="ts">
/**
 * Blog - Philosophy articles about mindful tracking, rhythm formation, and identity-based change
 *
 * Content that explores the "why" behind Ta-Da!'s design philosophy.
 */

definePageMeta({
  layout: "default",
  auth: false, // Public page
});

useSeoMeta({
  title: "Blog - Ta-Da!",
  description: "Thoughts on mindful tracking, graceful rhythms, and becoming who you want to be.",
  ogTitle: "Ta-Da! Blog",
  ogDescription: "Thoughts on mindful tracking, graceful rhythms, and becoming who you want to be.",
});

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  emoji: string;
}

const posts: BlogPost[] = [
  {
    slug: "counting-up",
    title: "Why We Count Up",
    excerpt:
      "Traditional timers count down, creating pressure and anxiety. What if we flipped the script and celebrated what we accomplished instead?",
    date: "February 2026",
    readTime: "4 min read",
    category: "Philosophy",
    emoji: "⬆️",
  },
  {
    slug: "identity-over-streaks",
    title: "Identity Over Streaks",
    excerpt:
      "Streaks are fragile — one missed day breaks them. But identity is resilient. You're a meditator, not someone who hasn't missed a day.",
    date: "February 2026",
    readTime: "5 min read",
    category: "Philosophy",
    emoji: "🌱",
  },
  {
    slug: "graceful-rhythms",
    title: "The Case for Graceful Rhythms",
    excerpt:
      "Life isn't perfectly consistent. Neither should your practice be. Here's why we built chains that bend but don't break.",
    date: "February 2026",
    readTime: "6 min read",
    category: "Design",
    emoji: "🔗",
  },
];

const categories = computed(() => {
  const cats = [...new Set(posts.map((p) => p.category))];
  return ["All", ...cats];
});

const selectedCategory = ref("All");

const filteredPosts = computed(() => {
  if (selectedCategory.value === "All") return posts;
  return posts.filter((p) => p.category === selectedCategory.value);
});
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors mb-4"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </NuxtLink>
      <h1 class="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-2">
        Blog
      </h1>
      <p class="text-stone-600 dark:text-stone-400">
        Thoughts on mindful tracking, graceful rhythms, and becoming who you want to be.
      </p>
    </div>

    <!-- Category filter -->
    <div class="flex gap-2 mb-8 overflow-x-auto pb-2">
      <button
        v-for="category in categories"
        :key="category"
        type="button"
        class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
        :class="
          selectedCategory === category
            ? 'bg-tada-500 text-white'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
        "
        @click="selectedCategory = category"
      >
        {{ category }}
      </button>
    </div>

    <!-- Posts list -->
    <div class="space-y-6">
      <NuxtLink
        v-for="post in filteredPosts"
        :key="post.slug"
        :to="`/blog/${post.slug}`"
        class="block bg-white dark:bg-stone-800 rounded-xl p-6 border border-stone-200 dark:border-stone-700 hover:border-tada-500 dark:hover:border-tada-400 transition-colors group"
      >
        <div class="flex items-start gap-4">
          <span class="text-3xl">{{ post.emoji }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                {{ post.category }}
              </span>
              <span class="text-xs text-stone-500 dark:text-stone-400">
                {{ post.date }}
              </span>
              <span class="text-xs text-stone-500 dark:text-stone-400">
                · {{ post.readTime }}
              </span>
            </div>
            <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100 group-hover:text-tada-600 dark:group-hover:text-tada-400 transition-colors mb-2">
              {{ post.title }}
            </h2>
            <p class="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
              {{ post.excerpt }}
            </p>
          </div>
          <svg
            class="w-5 h-5 text-stone-400 group-hover:text-tada-500 transition-colors flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </NuxtLink>
    </div>

    <!-- Empty state -->
    <div
      v-if="filteredPosts.length === 0"
      class="text-center py-12 text-stone-600 dark:text-stone-400"
    >
      <div class="text-4xl mb-4">📝</div>
      <p>No posts in this category yet.</p>
      <button
        class="mt-4 text-tada-600 dark:text-tada-400 hover:underline"
        @click="selectedCategory = 'All'"
      >
        View all posts
      </button>
    </div>

    <!-- Newsletter signup (placeholder for future) -->
    <div class="mt-12 pt-8 border-t border-stone-200 dark:border-stone-700">
      <div class="bg-pearl-mist dark:bg-cosmic-indigo rounded-xl p-6 text-center">
        <h3 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-2">
          More thoughts coming soon
        </h3>
        <p class="text-stone-600 dark:text-stone-400 text-sm">
          We're writing about mindfulness, habits, and the philosophy behind Ta-Da!
        </p>
      </div>
    </div>
  </div>
</template>
