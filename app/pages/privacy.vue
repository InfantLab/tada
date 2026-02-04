<script setup lang="ts">
definePageMeta({
  layout: "default",
  auth: false, // Public page
});

useSeoMeta({
  title: "Privacy Policy - Ta-Da!",
  description: "How Ta-Da! handles your data with care and respect.",
});

const lastUpdated = "February 2026";
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
        Privacy Policy
      </h1>
      <p class="text-stone-600 dark:text-stone-400">
        Last updated: {{ lastUpdated }}
      </p>
    </div>

    <!-- Content -->
    <div class="prose prose-stone dark:prose-invert max-w-none space-y-8">
      <!-- Introduction -->
      <section>
        <p class="text-lg text-stone-700 dark:text-stone-300">
          Ta-Da! is built on a foundation of respect for your privacy. Your personal
          reflections, meditations, and accomplishments are yours alone. This policy
          explains how we handle your data when you use tada.living, our hosted service.
        </p>
        <p class="text-stone-600 dark:text-stone-400">
          <strong>Self-hosted users:</strong> If you run Ta-Da! on your own server,
          your data stays entirely on your infrastructure. This policy applies only
          to the hosted service at tada.living.
        </p>
      </section>

      <!-- What We Collect -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          What We Collect
        </h2>
        <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6 space-y-4">
          <div>
            <h3 class="font-medium text-stone-800 dark:text-stone-100">Account Information</h3>
            <p class="text-stone-600 dark:text-stone-400">
              Email address (for account access and communication), username, and
              timezone preference.
            </p>
          </div>
          <div>
            <h3 class="font-medium text-stone-800 dark:text-stone-100">Your Entries</h3>
            <p class="text-stone-600 dark:text-stone-400">
              Meditation sessions, moments, ta-das, and other entries you create.
              This is your personal content and is never shared, sold, or used for
              advertising.
            </p>
          </div>
          <div>
            <h3 class="font-medium text-stone-800 dark:text-stone-100">Usage Data</h3>
            <p class="text-stone-600 dark:text-stone-400">
              Basic analytics to improve the service: page views, feature usage,
              and error reports. We use privacy-respecting analytics that don't
              track you across the web.
            </p>
          </div>
          <div>
            <h3 class="font-medium text-stone-800 dark:text-stone-100">Payment Information</h3>
            <p class="text-stone-600 dark:text-stone-400">
              For premium subscriptions, Stripe handles all payment processing.
              We only store your Stripe customer ID, never your card details.
            </p>
          </div>
        </div>
      </section>

      <!-- How We Use Your Data -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          How We Use Your Data
        </h2>
        <ul class="space-y-2 text-stone-600 dark:text-stone-400">
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>To provide and maintain the Ta-Da! service</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>To process your subscription payments</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>To send important service updates (never marketing without consent)</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>To improve the service based on aggregate, anonymized usage patterns</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>To respond to support requests</span>
          </li>
        </ul>
      </section>

      <!-- Data Retention -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Data Retention
        </h2>
        <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6 space-y-4">
          <div>
            <h3 class="font-medium text-stone-800 dark:text-stone-100">Free Tier</h3>
            <p class="text-stone-600 dark:text-stone-400">
              Your entries are accessible for a rolling 1-year window. Older entries
              are archived (not deleted) and restored if you upgrade to Premium.
            </p>
          </div>
          <div>
            <h3 class="font-medium text-stone-800 dark:text-stone-100">Premium Tier</h3>
            <p class="text-stone-600 dark:text-stone-400">
              All your entries are retained indefinitely for as long as your
              subscription is active.
            </p>
          </div>
          <div>
            <h3 class="font-medium text-stone-800 dark:text-stone-100">Account Deletion</h3>
            <p class="text-stone-600 dark:text-stone-400">
              When you delete your account, all your data is permanently removed
              within 30 days. You can export all your data before deletion.
            </p>
          </div>
        </div>
      </section>

      <!-- Your Rights (GDPR) -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Your Rights
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-4">
          Under GDPR and similar privacy laws, you have the right to:
        </p>
        <div class="grid gap-3">
          <div class="flex items-start gap-3 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
            <span class="text-xl">📥</span>
            <div>
              <h3 class="font-medium text-stone-800 dark:text-stone-100">Access & Export</h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">
                Download all your data anytime from Settings → Data Export
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
            <span class="text-xl">✏️</span>
            <div>
              <h3 class="font-medium text-stone-800 dark:text-stone-100">Correction</h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">
                Edit or correct any of your personal information
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
            <span class="text-xl">🗑️</span>
            <div>
              <h3 class="font-medium text-stone-800 dark:text-stone-100">Deletion</h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">
                Delete your account and all associated data
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
            <span class="text-xl">🚫</span>
            <div>
              <h3 class="font-medium text-stone-800 dark:text-stone-100">Objection</h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">
                Object to processing of your data for specific purposes
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Third Parties -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Third-Party Services
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-4">
          We use a minimal set of trusted services:
        </p>
        <ul class="space-y-2 text-stone-600 dark:text-stone-400">
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span><strong>Stripe</strong> — Payment processing (PCI compliant)</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span><strong>Email provider</strong> — Transactional emails only</span>
          </li>
        </ul>
        <p class="text-stone-600 dark:text-stone-400 mt-4">
          We never sell your data or use third-party advertising networks.
        </p>
      </section>

      <!-- Cookies -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Cookies
        </h2>
        <p class="text-stone-600 dark:text-stone-400">
          We use only essential cookies required for the service to function:
        </p>
        <ul class="mt-2 space-y-1 text-stone-600 dark:text-stone-400">
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Session cookie — keeps you logged in</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Preferences — remembers your theme and settings</span>
          </li>
        </ul>
        <p class="text-stone-600 dark:text-stone-400 mt-2">
          No tracking cookies. No third-party cookies.
        </p>
      </section>

      <!-- Security -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Security
        </h2>
        <p class="text-stone-600 dark:text-stone-400">
          We protect your data with:
        </p>
        <ul class="mt-2 space-y-1 text-stone-600 dark:text-stone-400">
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>HTTPS encryption for all connections</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Secure password hashing (scrypt)</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Regular security updates</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Encrypted database backups</span>
          </li>
        </ul>
      </section>

      <!-- Contact -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Contact Us
        </h2>
        <p class="text-stone-600 dark:text-stone-400">
          For privacy questions or to exercise your rights:
        </p>
        <p class="mt-2">
          <a
            href="mailto:infantologist@gmail.com"
            class="text-tada-600 hover:text-tada-700 dark:text-tada-400 dark:hover:text-tada-300"
          >
            infantologist@gmail.com
          </a>
        </p>
      </section>

      <!-- Changes -->
      <section class="border-t border-stone-200 dark:border-stone-700 pt-8">
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Changes to This Policy
        </h2>
        <p class="text-stone-600 dark:text-stone-400">
          We'll notify you of significant changes via email or in-app notice.
          Continued use after changes constitutes acceptance of the updated policy.
        </p>
      </section>
    </div>

    <!-- Footer Links -->
    <div class="mt-12 pt-8 border-t border-stone-200 dark:border-stone-700 flex flex-wrap gap-4 text-sm">
      <NuxtLink
        to="/terms"
        class="text-stone-600 dark:text-stone-400 hover:text-tada-600 dark:hover:text-tada-400"
      >
        Terms of Service
      </NuxtLink>
      <NuxtLink
        to="/dpa"
        class="text-stone-600 dark:text-stone-400 hover:text-tada-600 dark:hover:text-tada-400"
      >
        Data Processing Agreement
      </NuxtLink>
      <NuxtLink
        to="/help"
        class="text-stone-600 dark:text-stone-400 hover:text-tada-600 dark:hover:text-tada-400"
      >
        Help & FAQ
      </NuxtLink>
    </div>
  </div>
</template>
