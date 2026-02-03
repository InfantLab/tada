<script setup lang="ts">
/**
 * Help & FAQ Page
 *
 * Zen-like FAQ page with searchable, categorized questions.
 * Warm, philosophical tone matching the app's identity.
 */

definePageMeta({
  layout: "default",
  auth: false, // Public page
});

useSeoMeta({
  title: "Help & FAQ - Ta-Da!",
  description: "Answers to common questions about using Ta-Da! for mindful life tracking.",
});

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  // Getting Started
  {
    category: "Getting Started",
    question: "What is Ta-Da! and who is it for?",
    answer:
      "Ta-Da! is a mindful life tracker for anyone who wants to notice and celebrate their daily moments — meditation sessions, accomplishments, dreams, and the rhythms that shape who you're becoming. It's built on a philosophy of counting up (celebrating what you did) rather than counting down (focusing on what's left).",
  },
  {
    category: "Getting Started",
    question: "How do I get started?",
    answer:
      "Start by capturing something! Try the meditation timer in Sessions, log a win in Ta-Da!, or write a reflection in Moments. There's no right way to use Ta-Da! — it adapts to what matters to you.",
  },
  {
    category: "Getting Started",
    question: "Can I use Ta-Da! offline?",
    answer:
      "Yes! Ta-Da! is a Progressive Web App (PWA). Once installed, the timer and basic features work offline. Your entries will sync when you're back online. For the best experience, install Ta-Da! to your home screen.",
  },
  // Timer
  {
    category: "Timer",
    question: "Why do timers count up instead of down?",
    answer:
      "Counting up celebrates what you accomplished rather than what's remaining. When you meditate for 47 minutes, the celebration is \"You did 47 minutes!\" not \"You have 13 minutes left.\" This philosophy extends throughout Ta-Da! — we focus on what you did, not what you missed.",
  },
  {
    category: "Timer",
    question: "What are the interval bells for?",
    answer:
      "Interval bells can mark time during your session without interrupting flow. You might set a gentle chime every 10 minutes to maintain awareness, or use them for walking meditation segments. They're completely optional — many people prefer silence.",
  },
  {
    category: "Timer",
    question: "Why does my timer stop when I switch tabs?",
    answer:
      "Browsers throttle background tabs to save battery. The timer will continue tracking, but bells might be delayed. For the most accurate experience, keep the Ta-Da! tab in the foreground during sessions. Consider using \"Do Not Disturb\" mode on your device.",
  },
  // Rhythms
  {
    category: "Rhythms",
    question: "What are 'graceful chains'?",
    answer:
      "Graceful chains are our alternative to harsh streaks. Traditional streak counters punish you for missing a single day. Our chains celebrate consistency while acknowledging that life happens. Missing a day doesn't break your identity as a meditator — it's just one day.",
  },
  {
    category: "Rhythms",
    question: "What happens if I miss a day?",
    answer:
      "Nothing dramatic! Your rhythm continues. Ta-Da! tracks patterns, not perfection. You might see a small gap in your year tracker, but your accumulated hours and overall journey remain. We believe identity ('I am a meditator') matters more than streaks ('I haven't missed a day').",
  },
  {
    category: "Rhythms",
    question: "How do the journey stages work?",
    answer:
      "Journey stages mark your accumulated practice time: Starting (0-10 hours), Building (10-100 hours), Becoming (100-1000 hours), and Being (1000+ hours). These aren't about speed — they celebrate the depth of your practice over time.",
  },
  // Privacy & Data
  {
    category: "Privacy",
    question: "Is my data private?",
    answer:
      "Absolutely. Your entries, reflections, and personal data are yours alone. We never sell your data, use it for advertising, or train AI models with it. You can export all your data anytime from Settings.",
  },
  {
    category: "Privacy",
    question: "Can I self-host Ta-Da!?",
    answer:
      "Yes! Ta-Da! is fully open source. You can run it on your own server for complete control over your data. Check our GitHub repository for setup instructions. Self-hosted instances have no limitations.",
  },
  {
    category: "Privacy",
    question: "What happens to my data if I cancel?",
    answer:
      "If you're on the free tier, you always have access to your last 12 months of data, and you can export everything anytime. If you cancel Premium, you simply revert to the free tier — nothing is deleted. You can delete your account entirely from Settings if you wish.",
  },
  // Import
  {
    category: "Import",
    question: "How do I import from Insight Timer?",
    answer:
      "Go to Settings → Data → Import. Select the Insight Timer recipe, upload your CSV export from Insight Timer, and Ta-Da! will map the columns automatically. You can preview the import before confirming.",
  },
  {
    category: "Import",
    question: "Can I import from other apps?",
    answer:
      "Yes! Ta-Da! has a flexible CSV importer that works with any app that can export to CSV. You can map columns manually or create custom import recipes for apps you use frequently.",
  },
  // Account
  {
    category: "Account",
    question: "What's the difference between free and premium?",
    answer:
      "Free gives you all features with a 1-year data history window. Premium ($5/month or $50/year) provides unlimited history, priority support, and early access to new features. Self-hosted instances are always unlimited.",
  },
  {
    category: "Account",
    question: "How do I change my password?",
    answer:
      "Go to Settings → Security → Change Password. You'll need your current password to set a new one. If you've forgotten your password, use the 'Forgot Password' link on the login page.",
  },
];

const categories = [...new Set(faqs.map((f) => f.category))];

const route = useRoute();

// Support pre-filtering via ?q= query parameter
const searchQuery = ref((route.query["q"] as string) || "");
const expandedQuestions = ref<Set<string>>(new Set());

const filteredFaqs = computed(() => {
  if (!searchQuery.value.trim()) return faqs;

  const query = searchQuery.value.toLowerCase();
  return faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query)
  );
});

const faqsByCategory = computed(() => {
  const grouped: Record<string, FAQ[]> = {};
  for (const faq of filteredFaqs.value) {
    if (!grouped[faq.category]) {
      grouped[faq.category] = [];
    }
    grouped[faq.category].push(faq);
  }
  return grouped;
});

function toggleQuestion(question: string) {
  if (expandedQuestions.value.has(question)) {
    expandedQuestions.value.delete(question);
  } else {
    expandedQuestions.value.add(question);
  }
  // Trigger reactivity
  expandedQuestions.value = new Set(expandedQuestions.value);
}

function isExpanded(question: string) {
  return expandedQuestions.value.has(question);
}
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
        Help & FAQ
      </h1>
      <p class="text-stone-600 dark:text-stone-400">
        Answers to common questions about Ta-Da!
      </p>
    </div>

    <!-- Search -->
    <div class="mb-8">
      <div class="relative">
        <svg
          class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search questions..."
          class="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-tada-500"
        />
      </div>
    </div>

    <!-- No results -->
    <div
      v-if="filteredFaqs.length === 0"
      class="text-center py-12 text-stone-600 dark:text-stone-400"
    >
      <div class="text-4xl mb-4">🔍</div>
      <p>No questions match "{{ searchQuery }}"</p>
      <button
        class="mt-4 text-tada-600 dark:text-tada-400 hover:underline"
        @click="searchQuery = ''"
      >
        Clear search
      </button>
    </div>

    <!-- FAQ Categories -->
    <div v-else class="space-y-8">
      <section v-for="category in categories" :key="category">
        <template v-if="faqsByCategory[category]?.length">
          <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
            <span v-if="category === 'Getting Started'">🚀</span>
            <span v-else-if="category === 'Timer'">⏱️</span>
            <span v-else-if="category === 'Rhythms'">📊</span>
            <span v-else-if="category === 'Privacy'">🔒</span>
            <span v-else-if="category === 'Import'">📥</span>
            <span v-else-if="category === 'Account'">👤</span>
            <span v-else>❓</span>
            {{ category }}
          </h2>
          <div class="space-y-3">
            <div
              v-for="faq in faqsByCategory[category]"
              :key="faq.question"
              class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden"
            >
              <button
                class="w-full px-5 py-4 text-left flex items-center justify-between gap-4"
                @click="toggleQuestion(faq.question)"
              >
                <span class="font-medium text-stone-800 dark:text-stone-100">
                  {{ faq.question }}
                </span>
                <svg
                  class="w-5 h-5 text-stone-400 transition-transform flex-shrink-0"
                  :class="{ 'rotate-180': isExpanded(faq.question) }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-96"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 max-h-96"
                leave-to-class="opacity-0 max-h-0"
              >
                <div
                  v-if="isExpanded(faq.question)"
                  class="px-5 pb-4 text-stone-600 dark:text-stone-400 border-t border-stone-100 dark:border-stone-700"
                >
                  <p class="pt-4">{{ faq.answer }}</p>
                </div>
              </Transition>
            </div>
          </div>
        </template>
      </section>
    </div>

    <!-- Still have questions? -->
    <div class="mt-12 pt-8 border-t border-stone-200 dark:border-stone-700 text-center">
      <h3 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-2">
        Still have questions?
      </h3>
      <p class="text-stone-600 dark:text-stone-400 mb-4">
        We're here to help!
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <NuxtLink
          to="/feedback"
          class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-tada-600 text-white rounded-xl font-medium hover:bg-tada-700 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          Send Feedback
        </NuxtLink>
        <a
          href="mailto:hello@tada.living"
          class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl font-medium hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Email Us
        </a>
      </div>
    </div>

    <!-- Footer Links -->
    <div class="mt-12 pt-8 border-t border-stone-200 dark:border-stone-700 flex gap-4 text-sm justify-center">
      <NuxtLink
        to="/privacy"
        class="text-stone-600 dark:text-stone-400 hover:text-tada-600 dark:hover:text-tada-400"
      >
        Privacy Policy
      </NuxtLink>
      <NuxtLink
        to="/terms"
        class="text-stone-600 dark:text-stone-400 hover:text-tada-600 dark:hover:text-tada-400"
      >
        Terms of Service
      </NuxtLink>
    </div>
  </div>
</template>
