<script setup lang="ts">
/**
 * Help & FAQ Page
 *
 * Comprehensive, searchable FAQ organised by feature area.
 * Shortcut chips at the top for quick navigation.
 * Warm, encouraging tone matching the Ta-Da! style guide.
 */

definePageMeta({
  layout: "default",
  auth: false,
});

useSeoMeta({
  title: "Help & FAQ - Ta-Da!",
  description:
    "Answers to common questions about using Ta-Da! for celebrating your daily moments.",
});

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

// Section metadata for shortcuts and headings
const sectionMeta: Record<string, { emoji: string; id: string }> = {
  Timeline: { emoji: "📅", id: "timeline" },
  "Ta-Da!": { emoji: "⚡", id: "tada" },
  Moments: { emoji: "✨", id: "moments" },
  Sessions: { emoji: "⏱️", id: "sessions" },
  Tallies: { emoji: "📊", id: "tallies" },
  Rhythms: { emoji: "🔗", id: "rhythms" },
  Settings: { emoji: "⚙️", id: "settings" },
  Account: { emoji: "👤", id: "account" },
  Categories: { emoji: "📁", id: "categories" },
  Privacy: { emoji: "🔒", id: "privacy" },
  Site: { emoji: "🌐", id: "site" },
  Support: { emoji: "💬", id: "support" },
};

const sectionOrder = [
  "Timeline",
  "Ta-Da!",
  "Moments",
  "Sessions",
  "Tallies",
  "Rhythms",
  "Settings",
  "Account",
  "Categories",
  "Privacy",
  "Site",
  "Support",
];

const faqs: FAQ[] = [
  // ── Timeline ────────────────────────────────────────────
  {
    category: "Timeline",
    question: "What is the timeline?",
    answer:
      "Everything you've captured, in one place. The timeline shows your sessions, ta-das, moments, and tallies in chronological order. It's a celebration of what you've done — not a to-do list of what's left.",
  },
  {
    category: "Timeline",
    question: "What is the daily timeline strip?",
    answer:
      "The colourful bar at the top of each day. Each block represents an entry, sized by duration and coloured by category — so you can see at a glance how your day unfolded. Tap any block to jump to that entry.",
  },
  {
    category: "Timeline",
    question: "What are Beautiful vs Minimal timelines?",
    answer:
      "Beautiful timelines (the default) show rich, colourful category blocks. Minimal timelines show simple dots instead. You can switch between them in Settings → Timelines.",
  },
  {
    category: "Timeline",
    question: "What are the zoom views?",
    answer:
      "Use the Day / Week / Month / Year toggle to change how you see your history. Day shows individual entries. Week, Month, and Year show summaries — tap any period card to zoom in and see its details.",
  },
  {
    category: "Timeline",
    question: "How do I filter the timeline?",
    answer:
      "Tap a category chip to filter by category — this works across all zoom views. In Day view you can also search by text and narrow by time range (Today, This week, This month, This year, or All time).",
  },
  {
    category: "Timeline",
    question: "How do I navigate between views?",
    answer:
      "In Year view, tap a year to see its months. Tap a month or week card to jump to the Day view for that period. Use the back button or zoom toggle to return to a wider view.",
  },
  {
    category: "Timeline",
    question: "Are there keyboard shortcuts?",
    answer:
      "Yes! Press 'n' to open the quick-add menu, or 'm' to capture a moment instantly. On desktop you can also use Cmd/Ctrl + N (new entry) or Cmd/Ctrl + Shift + N (new moment).",
  },

  // ── Ta-Da! ──────────────────────────────────────────────
  {
    category: "Ta-Da!",
    question: "What is a Ta-Da!?",
    answer:
      "A Ta-Da! is the opposite of a to-do. It's an accomplishment you want to celebrate — big or small. Finished a painting, tidied the kitchen, shipped a feature? That's a Ta-Da!",
  },
  {
    category: "Ta-Da!",
    question: "Why celebrate small wins?",
    answer:
      "Research shows that acknowledging small accomplishments builds momentum and motivation. Ta-Da! helps you notice what you're doing right, rather than fixating on what's undone.",
  },
  {
    category: "Ta-Da!",
    question: "How do categories help with wins?",
    answer:
      "Wins span all of life — work, health, creative projects, social connections. Use categories to see patterns in where you're thriving.",
  },
  {
    category: "Ta-Da!",
    question: "How do wins build identity?",
    answer:
      "Regular wins in an area build identity: 'I'm someone who finishes projects' or 'I take care of my health.' This is more powerful than streaks because identity persists even when habits wobble.",
  },

  // ── Moments ─────────────────────────────────────────────
  {
    category: "Moments",
    question: "What are moments?",
    answer:
      "Dreams, magic, gratitude, and reflections. These quiet captures become treasures worth revisiting. There are four types: Magic, Dream, Gratitude, and Journal — plus any custom types you create.",
  },
  {
    category: "Moments",
    question: "What is a Magic moment?",
    answer:
      "Life's delightful surprises — joy, serendipity, wonder, beauty. Noticing magic amplifies it and helps you spot more of it.",
  },
  {
    category: "Moments",
    question: "How does the dream journal work?",
    answer:
      "Capture dreams as soon as you wake up — even fragments matter. Over time, patterns emerge. You can note how vivid or lucid the dream was to spot trends.",
  },
  {
    category: "Moments",
    question: "What about gratitude and journal entries?",
    answer:
      "Gratitude entries are appreciation for people, moments, or experiences — regular gratitude practice shifts your attention toward what's working. Journal entries are freeform reflections — sometimes you just need to get words out, no structure required.",
  },

  // ── Sessions ────────────────────────────────────────────
  {
    category: "Sessions",
    question: "What are sessions?",
    answer:
      "Timed practices like meditation, focused work, or creative flow. Start a timer, do your thing, and stop when you're done. The timer celebrates what you did, not what's left.",
  },
  {
    category: "Sessions",
    question: "Why does the timer count up instead of down?",
    answer:
      "When you meditate for 47 minutes, the celebration is 'You did 47 minutes!' not 'You have 13 minutes left.' Counting up removes pressure and turns every session into a win.",
  },
  {
    category: "Sessions",
    question: "What are interval bells?",
    answer:
      "Optional bells mark time without interrupting flow. Set a gentle chime every 10 minutes to maintain awareness, or practise in silence — it's your choice.",
  },
  {
    category: "Sessions",
    question: "Why do bells seem delayed when I switch tabs?",
    answer:
      "Browsers throttle background tabs to save battery. Your session still records accurately, but bells may fire late. For the best experience, keep Ta-Da! in the foreground during sessions. Consider using Do Not Disturb on your device.",
  },
  {
    category: "Sessions",
    question: "What are practice links?",
    answer:
      "Connect sessions to guided content. Ta-Da! auto-detects YouTube, Insight Timer, and Spotify links so you can revisit what you practised.",
  },
  {
    category: "Sessions",
    question: "Can I save favourite timer setups?",
    answer:
      "Yes! Create session presets in Settings with your preferred duration, bells, and background audio. Name them meaningfully — 'Morning Sit', 'Pomodoro', 'Creative Flow' — then start one with a single tap.",
  },

  // ── Tallies ─────────────────────────────────────────────
  {
    category: "Tallies",
    question: "What are tallies?",
    answer:
      "Quick counts for exercises, habits, or anything you want to capture numerically. 10 push-ups, 3 glasses of water, 5 pages read — simple and friction-free.",
  },
  {
    category: "Tallies",
    question: "What are tally presets?",
    answer:
      "Create presets for activities you capture regularly. One tap to record 10 push-ups or a glass of water — no typing needed.",
  },
  {
    category: "Tallies",
    question: "Can I use voice for tallies?",
    answer:
      "Yes! Say '10 push-ups, 12 kettlebells, 30 squats' and Ta-Da! creates multiple tally entries at once. Press the microphone icon to start.",
  },

  // ── Rhythms ─────────────────────────────────────────────
  {
    category: "Rhythms",
    question: "What are rhythms?",
    answer:
      "Rhythms are views of your entries — they show patterns over time without storing separate data. Deleting a rhythm never deletes your underlying sessions, tallies, moments, or ta-das.",
  },
  {
    category: "Rhythms",
    question: "What are the three rhythm types?",
    answer:
      "Timed rhythms celebrate duration (e.g., 6 minutes of meditation). Tally rhythms celebrate counts (e.g., 5 press-ups). Activity rhythms just need you to show up — any matching entry on a day counts.",
  },
  {
    category: "Rhythms",
    question: "What are graceful chains?",
    answer:
      "Our alternative to harsh streaks. Choose from 5 types: Daily (every day), 5×/Week, 3×/Week, 1×/Week, or 4×/Month. All count completed days. Missing a day doesn't erase your progress — chains bend, not break.",
  },
  {
    category: "Rhythms",
    question: "What happens if I miss a day?",
    answer:
      "Nothing dramatic. Your rhythm continues. You might see a small gap in the year view, but your accumulated experience and journey stage remain. We believe identity — 'I am a meditator' — matters more than an unbroken streak.",
  },
  {
    category: "Rhythms",
    question: "How do journey stages work?",
    answer:
      "Journey stages mark your total experience: Beginning, Building, Becoming, and Being. Thresholds adapt to rhythm type — hours for timed activities (10 / 100 / 1,000), session count for activities (21 / 100 / 365), or reps for tallies (100 / 1,000 / 10,000). Your stage never goes backward, even when chains break.",
  },
  {
    category: "Rhythms",
    question: "Does deleting a rhythm delete my data?",
    answer:
      "No. Rhythms are derived data. Deleting a rhythm removes only the configuration — all your entries remain untouched. You can always create a new rhythm that matches the same entries.",
  },
  {
    category: "Rhythms",
    question: "What are weekly encouragement messages?",
    answer:
      "Every Thursday afternoon Ta-Da! sends a gentle mid-week check-in with stretch goals based on your activity. Monday morning brings a celebration summary of the previous week. Both are optional — enable or disable them in Settings → Rhythms.",
  },
  {
    category: "Rhythms",
    question: "Can I get weekly messages by email?",
    answer:
      "Yes. When you have a verified email address, you can opt into email delivery for celebrations and encouragements separately. Toggle these in Settings → Rhythms under Email Delivery.",
  },

  // ── Settings ────────────────────────────────────────────
  {
    category: "Settings",
    question: "What is the Settings page?",
    answer:
      "Settings is where you make Ta-Da! feel like yours — choose a theme, configure celebration sounds, manage session presets, set up voice input, control notifications, and import or export your data.",
  },
  {
    category: "Settings",
    question: "What can I customise in Settings?",
    answer:
      "Theme (light, dark, or system), celebration sounds, session presets with bells and background audio, voice input provider, notification preferences, and more.",
  },
  {
    category: "Settings",
    question: "What are celebration sounds?",
    answer:
      "When you save a Ta-Da!, a short celebratory sound plays. Choose from Ta-Da Short, Ta-Da Long, or Twinkle — or turn them off if you prefer silence. You can preview each in Settings.",
  },
  {
    category: "Settings",
    question: "How does data export work?",
    answer:
      "Go to Settings and tap Export. Your entire history downloads as a JSON file. Your data is yours — no lock-in, ever.",
  },
  {
    category: "Settings",
    question: "Can I import from other apps?",
    answer:
      "Yes! Ta-Da! has a flexible CSV importer that works with any app. There's a built-in recipe for Insight Timer that maps columns automatically, and you can create custom recipes for other apps. Preview imports before confirming.",
  },

  // ── Account ─────────────────────────────────────────────
  {
    category: "Account",
    question: "What does the Account page manage?",
    answer:
      "The Account page is home to your profile, password, email, and subscription. If you ever need to export your data or delete your account, those options live here too.",
  },
  {
    category: "Account",
    question: "What's the difference between free and premium?",
    answer:
      "Free gives you all features with a 12-month data history window. Premium provides unlimited history, priority support, and early access to new features. Self-hosted instances are always unlimited.",
  },
  {
    category: "Account",
    question: "How do I change my password?",
    answer:
      "Go to your Account page and choose Change Password. You'll need your current password to set a new one. If you've forgotten it, use the 'Forgot Password' link on the login page.",
  },
  {
    category: "Account",
    question: "How do I update my email?",
    answer:
      "Visit your Account page and update the email field. You'll need to verify your new address before it takes effect.",
  },
  {
    category: "Account",
    question: "Can I delete my account?",
    answer:
      "Yes. Go to your Account page, scroll to the bottom, and choose Delete Account. This is permanent — all your entries, rhythms, and settings will be removed. You'll be asked to type DELETE to confirm.",
  },
  {
    category: "Account",
    question: "What happens to my data if I cancel premium?",
    answer:
      "You simply revert to the free tier — nothing is deleted. You keep access to your most recent 12 months of data, and you can export everything anytime.",
  },

  // ── Categories ──────────────────────────────────────────
  {
    category: "Categories",
    question: "What are categories?",
    answer:
      "Categories organise your entries by area of life — Meditation, Work, Health, Creative, Social, and more. They appear as filter chips on the timeline and help you spot where you're showing up.",
  },
  {
    category: "Categories",
    question: "Can I customise categories?",
    answer:
      "Yes! You can change the emoji for any category or subcategory, add your own custom categories, create new subcategories, and hide built-in categories you don't use. Go to Categories from the sidebar.",
  },
  {
    category: "Categories",
    question: "Can I delete all entries in a category?",
    answer:
      "Yes. In the Categories page, open a category and choose 'Delete all entries.' You'll have 15 seconds to undo before it becomes permanent. The category itself remains — only the entries are removed.",
  },

  // ── Privacy ──────────────────────────────────────────────
  {
    category: "Privacy",
    question: "Is my data private?",
    answer:
      "Absolutely. Your entries, reflections, and personal data are yours alone. We never sell your data, use it for advertising, or train AI models with it. You can export everything anytime.",
  },
  {
    category: "Privacy",
    question: "Can I self-host Ta-Da!?",
    answer:
      "Yes! Ta-Da! is fully open source. Run it on your own server for complete control over your data. Self-hosted instances have no feature limitations.",
  },
  {
    category: "Privacy",
    question: "What happens to my data if I delete my account?",
    answer:
      "Everything is permanently removed — entries, rhythms, settings, and account details. There is no recovery after deletion. We recommend exporting your data first from Settings.",
  },
  {
    category: "Privacy",
    question: "Does voice input send my audio to external services?",
    answer:
      "It depends on your chosen provider. The browser provider processes speech locally on your device. Cloud providers (Whisper, Groq, OpenAI) send audio to their servers for transcription. You'll see a privacy disclosure before first use, and you can change provider anytime in Settings.",
  },

  // ── Site ────────────────────────────────────────────────
  {
    category: "Site",
    question: "What kind of app is Ta-Da!?",
    answer:
      "Ta-Da! is a Progressive Web App — install it on any device for a native-app feel, use it offline, and capture moments by voice or text. The full source code is open for anyone to run their own instance.",
  },
  {
    category: "Site",
    question: "Can I install Ta-Da! as an app?",
    answer:
      "Yes! On mobile, tap 'Add to Home Screen' from your browser menu. On desktop, look for the install icon in the address bar. Once installed, it launches full-screen like a native app.",
  },
  {
    category: "Site",
    question: "Does Ta-Da! work offline?",
    answer:
      "Basic features work offline once the app is installed. Sessions continue recording even without a connection. Your entries will sync when you're back online.",
  },
  {
    category: "Site",
    question: "How does voice input work?",
    answer:
      "Tap the microphone icon to speak instead of type. Ta-Da! uses speech-to-text to capture your words. You can configure the voice provider in Settings. Free accounts get 50 voice entries per month.",
  },
  {
    category: "Site",
    question: "Is Ta-Da! open source?",
    answer:
      "Yes! The full source code is available on GitHub. You can contribute, report issues, or run your own instance.",
  },

  // ── Support ─────────────────────────────────────────────
  {
    category: "Support",
    question: "How can I get help with Ta-Da!?",
    answer:
      "We're here to help — reach us via the Feedback page in the sidebar or email us directly. We read everything and respond personally.",
  },
  {
    category: "Support",
    question: "How do I report a bug or request a feature?",
    answer:
      "Use the Feedback page (linked from the sidebar) to send us a message directly. You can also email us — we read everything and respond personally.",
  },
  {
    category: "Support",
    question: "Where can I learn about Ta-Da!'s philosophy?",
    answer:
      "Check out the blog posts in the sidebar — they explain why Ta-Da! counts up, why identity matters more than streaks, and how graceful rhythms replace rigid habits.",
  },
  {
    category: "Support",
    question: "I have another question not listed here",
    answer:
      "We'd love to help! Send us a message via the Feedback page or email us directly. No question is too small.",
  },
];

const route = useRoute();
const searchQuery = ref((route.query["q"] as string) || "");
const expandedQuestions = ref<Set<string>>(new Set());

const filteredFaqs = computed(() => {
  if (!searchQuery.value.trim()) return faqs;
  const q = searchQuery.value.toLowerCase();
  return faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q),
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
  expandedQuestions.value = new Set(expandedQuestions.value);
}

function isExpanded(question: string) {
  return expandedQuestions.value.has(question);
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
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
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back
      </NuxtLink>
      <h1
        class="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-2"
      >
        Help & FAQ
      </h1>
      <p class="text-stone-600 dark:text-stone-400">
        Everything you need to know about Ta-Da!
      </p>
    </div>

    <!-- Shortcut chips -->
    <div
      class="flex flex-wrap gap-2 mb-6"
    >
      <button
        v-for="section in sectionOrder"
        :key="section"
        type="button"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
        @click="scrollToSection(sectionMeta[section]!.id)"
      >
        <span>{{ sectionMeta[section]!.emoji }}</span>
        <span>{{ section }}</span>
      </button>
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

    <!-- FAQ Sections -->
    <div v-else class="space-y-10">
      <section
        v-for="section in sectionOrder"
        :id="sectionMeta[section]!.id"
        :key="section"
        class="scroll-mt-20"
      >
        <template v-if="faqsByCategory[section]?.length">
          <h2
            class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-1 flex items-center gap-2"
          >
            <span>{{ sectionMeta[section]!.emoji }}</span>
            {{ section }}
          </h2>
          <!-- First FAQ shown as section subtitle -->
          <p class="text-stone-600 dark:text-stone-400 leading-relaxed mb-4">
            {{ faqsByCategory[section]![0]!.answer }}
          </p>
          <div class="space-y-3">
            <div
              v-for="faq in faqsByCategory[section]!.slice(1)"
              :key="faq.question"
              class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden"
            >
              <button
                class="w-full px-5 py-4 text-left flex items-center justify-between gap-4"
                @click="toggleQuestion(faq.question)"
              >
                <span
                  class="font-medium text-stone-800 dark:text-stone-100"
                >
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
                  <p class="pt-4 leading-relaxed">{{ faq.answer }}</p>
                </div>
              </Transition>
            </div>
          </div>
        </template>
      </section>
    </div>

    <!-- Still have questions? -->
    <div
      class="mt-12 pt-8 border-t border-stone-200 dark:border-stone-700 text-center"
    >
      <h3
        class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-2"
      >
        Still have questions?
      </h3>
      <p class="text-stone-600 dark:text-stone-400 mb-4">
        We'd love to help!
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <NuxtLink
          to="/feedback"
          class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-tada-600 text-white rounded-xl font-medium hover:bg-tada-700 transition-colors"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
          href="mailto:infantologist@gmail.com"
          class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl font-medium hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
    <div
      class="mt-12 pt-8 border-t border-stone-200 dark:border-stone-700 flex gap-4 text-sm justify-center"
    >
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
