<script setup lang="ts">
definePageMeta({
  layout: "default",
  auth: false, // Public page
});

useSeoMeta({
  title: "Terms of Service - Ta-Da!",
  description: "Terms and conditions for using the Ta-Da! service.",
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
        Terms of Service
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
          Welcome to Ta-Da! These terms govern your use of tada.living, our hosted
          mindfulness and accomplishment tracking service. By using Ta-Da!, you agree
          to these terms.
        </p>
        <p class="text-stone-600 dark:text-stone-400">
          <strong>Plain language summary:</strong> Be kind, use the service for its
          intended purpose, and we'll do our best to provide a reliable, respectful
          experience.
        </p>
      </section>

      <!-- The Service -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          1. The Service
        </h2>
        <p class="text-stone-600 dark:text-stone-400">
          Ta-Da! is a personal tracking tool for meditation sessions, accomplishments,
          moments, and daily rhythms. We provide:
        </p>
        <ul class="mt-2 space-y-1 text-stone-600 dark:text-stone-400">
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>A meditation timer with customizable intervals</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Entry logging for various life moments</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Rhythm tracking to notice patterns over time</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Data import and export capabilities</span>
          </li>
        </ul>
      </section>

      <!-- Accounts -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          2. Your Account
        </h2>
        <div class="space-y-4 text-stone-600 dark:text-stone-400">
          <p>
            You're responsible for maintaining the security of your account. Use a
            strong, unique password and don't share your login credentials.
          </p>
          <p>
            You must provide accurate information when creating your account, including
            a valid email address for account recovery and important notifications.
          </p>
          <p>
            You must be at least 16 years old to use Ta-Da!. If you're under 18, you
            confirm that your parent or guardian has consented to your use.
          </p>
        </div>
      </section>

      <!-- Acceptable Use -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          3. Acceptable Use
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-4">
          Use Ta-Da! for its intended purpose: personal mindfulness and accomplishment
          tracking. You agree not to:
        </p>
        <div class="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-6 space-y-2">
          <p class="flex items-start gap-2 text-stone-600 dark:text-stone-400">
            <span class="text-red-500">✗</span>
            <span>Use the service for illegal activities</span>
          </p>
          <p class="flex items-start gap-2 text-stone-600 dark:text-stone-400">
            <span class="text-red-500">✗</span>
            <span>Attempt to access other users' accounts or data</span>
          </p>
          <p class="flex items-start gap-2 text-stone-600 dark:text-stone-400">
            <span class="text-red-500">✗</span>
            <span>Interfere with or disrupt the service</span>
          </p>
          <p class="flex items-start gap-2 text-stone-600 dark:text-stone-400">
            <span class="text-red-500">✗</span>
            <span>Use automated tools to scrape or abuse the service</span>
          </p>
          <p class="flex items-start gap-2 text-stone-600 dark:text-stone-400">
            <span class="text-red-500">✗</span>
            <span>Resell or redistribute the service without permission</span>
          </p>
        </div>
      </section>

      <!-- Subscriptions -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          4. Subscriptions & Payment
        </h2>
        <div class="space-y-4">
          <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
            <h3 class="font-medium text-stone-800 dark:text-stone-100 mb-2">Free Tier</h3>
            <p class="text-stone-600 dark:text-stone-400">
              All core features are available for free. Your data is accessible for
              a rolling 1-year window. No credit card required.
            </p>
          </div>
          <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
            <h3 class="font-medium text-stone-800 dark:text-stone-100 mb-2">Premium Tier</h3>
            <p class="text-stone-600 dark:text-stone-400 mb-2">
              Premium subscriptions are billed monthly or annually. Prices are displayed
              at checkout and may change with notice.
            </p>
            <ul class="space-y-1 text-stone-600 dark:text-stone-400 text-sm">
              <li>• Subscriptions auto-renew unless canceled</li>
              <li>• Cancel anytime from your account settings</li>
              <li>• Refunds available within 7 days of initial purchase</li>
              <li>• After cancellation, you retain Premium until the billing period ends</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Your Content -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          5. Your Content
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-4">
          You retain full ownership of everything you create in Ta-Da!. Your entries,
          reflections, and personal data belong to you.
        </p>
        <p class="text-stone-600 dark:text-stone-400">
          We don't claim any rights to your content. We won't use it for advertising,
          sell it to third parties, or train AI models with it.
        </p>
      </section>

      <!-- Service Availability -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          6. Service Availability
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-4">
          We strive to keep Ta-Da! available 24/7, but we can't guarantee uninterrupted
          service. Occasional downtime may occur for:
        </p>
        <ul class="space-y-1 text-stone-600 dark:text-stone-400">
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Scheduled maintenance (we'll give advance notice when possible)</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Emergency fixes and security updates</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Circumstances beyond our control</span>
          </li>
        </ul>
      </section>

      <!-- Limitation of Liability -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          7. Limitation of Liability
        </h2>
        <div class="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-6 text-stone-600 dark:text-stone-400">
          <p class="mb-4">
            Ta-Da! is provided "as is" without warranties of any kind. While we work
            hard to provide a reliable service, we cannot guarantee that:
          </p>
          <ul class="space-y-1 mb-4">
            <li>• The service will meet all your requirements</li>
            <li>• The service will be error-free or uninterrupted</li>
            <li>• Any errors will be corrected</li>
          </ul>
          <p>
            To the maximum extent permitted by law, we shall not be liable for any
            indirect, incidental, special, or consequential damages arising from
            your use of the service.
          </p>
        </div>
      </section>

      <!-- Termination -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          8. Termination
        </h2>
        <div class="space-y-4 text-stone-600 dark:text-stone-400">
          <p>
            <strong>By you:</strong> You can delete your account at any time from
            Settings. We'll remove your data within 30 days.
          </p>
          <p>
            <strong>By us:</strong> We may suspend or terminate accounts that violate
            these terms or engage in abusive behavior. We'll provide notice when
            possible.
          </p>
          <p>
            <strong>Data export:</strong> You can export all your data at any time,
            before or after termination is requested.
          </p>
        </div>
      </section>

      <!-- Open Source -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          9. Open Source
        </h2>
        <p class="text-stone-600 dark:text-stone-400">
          Ta-Da! is open source software. The code is available at
          <a
            href="https://github.com/infantlab/tada"
            target="_blank"
            rel="noopener noreferrer"
            class="text-tada-600 hover:text-tada-700 dark:text-tada-400"
          >
            github.com/infantlab/tada
          </a>
          under the MIT license. You're welcome to self-host your own instance.
        </p>
      </section>

      <!-- Changes -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          10. Changes to Terms
        </h2>
        <p class="text-stone-600 dark:text-stone-400">
          We may update these terms occasionally. For significant changes, we'll
          notify you via email or in-app notice at least 30 days before they take
          effect. Continued use after changes constitutes acceptance.
        </p>
      </section>

      <!-- Governing Law -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          11. Governing Law
        </h2>
        <p class="text-stone-600 dark:text-stone-400">
          These terms are governed by the laws of the United Kingdom. Any disputes
          shall be resolved in the courts of England and Wales.
        </p>
      </section>

      <!-- Contact -->
      <section class="border-t border-stone-200 dark:border-stone-700 pt-8">
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Questions?
        </h2>
        <p class="text-stone-600 dark:text-stone-400">
          If you have questions about these terms:
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
    </div>

    <!-- Footer Links -->
    <div class="mt-12 pt-8 border-t border-stone-200 dark:border-stone-700 flex gap-4 text-sm">
      <NuxtLink
        to="/privacy"
        class="text-stone-600 dark:text-stone-400 hover:text-tada-600 dark:hover:text-tada-400"
      >
        Privacy Policy
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
