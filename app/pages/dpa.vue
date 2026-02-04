<script setup lang="ts">
/**
 * Data Processing Agreement (DPA)
 *
 * GDPR-compliant data processing addendum for business customers
 * and users who need formal documentation of data handling practices.
 */

definePageMeta({
  layout: "default",
  auth: false, // Public page
});

useSeoMeta({
  title: "Data Processing Agreement - Ta-Da!",
  description: "GDPR-compliant data processing agreement for Ta-Da! users.",
});

const lastUpdated = "February 2026";
const effectiveDate = "February 1, 2026";
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
        Data Processing Agreement
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
          This Data Processing Agreement ("DPA") forms part of the Terms of Service
          between Ta-Da! ("Processor", "we", "us") and you ("Controller", "you")
          for the use of the Ta-Da! service.
        </p>
        <div class="bg-tada-50 dark:bg-tada-900/20 border border-tada-200 dark:border-tada-700 rounded-xl p-4 mt-4">
          <p class="text-sm text-stone-700 dark:text-stone-300">
            <strong>Effective Date:</strong> {{ effectiveDate }}<br />
            This DPA applies to processing of personal data under GDPR, UK GDPR,
            and similar data protection laws.
          </p>
        </div>
      </section>

      <!-- 1. Definitions -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          1. Definitions
        </h2>
        <div class="space-y-3 text-stone-600 dark:text-stone-400">
          <p>
            <strong>"Personal Data"</strong> means any information relating to an
            identified or identifiable natural person that you submit to the Service.
          </p>
          <p>
            <strong>"Processing"</strong> means any operation performed on Personal
            Data, including collection, storage, retrieval, use, and deletion.
          </p>
          <p>
            <strong>"Sub-processor"</strong> means any third party engaged by us
            to process Personal Data on your behalf.
          </p>
          <p>
            <strong>"Data Subject"</strong> means the individual to whom Personal
            Data relates (typically, you as the user of Ta-Da!).
          </p>
        </div>
      </section>

      <!-- 2. Scope and Purpose -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          2. Scope and Purpose of Processing
        </h2>
        <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6 space-y-4">
          <div>
            <h3 class="font-medium text-stone-800 dark:text-stone-100">Nature of Processing</h3>
            <p class="text-stone-600 dark:text-stone-400">
              We process Personal Data to provide the Ta-Da! service, including
              storing your entries (sessions, moments, ta-das), managing your account,
              and enabling data export/import functionality.
            </p>
          </div>
          <div>
            <h3 class="font-medium text-stone-800 dark:text-stone-100">Purpose of Processing</h3>
            <ul class="text-stone-600 dark:text-stone-400 space-y-1">
              <li>• Providing access to the Ta-Da! application</li>
              <li>• Storing and synchronizing your personal entries</li>
              <li>• Processing subscription payments</li>
              <li>• Sending service-related communications</li>
              <li>• Providing customer support</li>
            </ul>
          </div>
          <div>
            <h3 class="font-medium text-stone-800 dark:text-stone-100">Duration of Processing</h3>
            <p class="text-stone-600 dark:text-stone-400">
              We process your data for as long as your account is active or as
              needed to provide services. Upon account deletion, data is permanently
              removed within 30 days.
            </p>
          </div>
        </div>
      </section>

      <!-- 3. Types of Data -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          3. Categories of Personal Data
        </h2>
        <div class="grid gap-3">
          <div class="flex items-start gap-3 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
            <span class="text-xl">👤</span>
            <div>
              <h3 class="font-medium text-stone-800 dark:text-stone-100">Account Data</h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">
                Email address, username, timezone, password hash
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
            <span class="text-xl">📝</span>
            <div>
              <h3 class="font-medium text-stone-800 dark:text-stone-100">User Content</h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">
                Meditation sessions, moments, ta-das, rhythms, notes, and tags
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
            <span class="text-xl">⚙️</span>
            <div>
              <h3 class="font-medium text-stone-800 dark:text-stone-100">Usage Data</h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">
                Service preferences, timer presets, import configurations
              </p>
            </div>
          </div>
          <div class="flex items-start gap-3 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
            <span class="text-xl">💳</span>
            <div>
              <h3 class="font-medium text-stone-800 dark:text-stone-100">Payment Data</h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">
                Stripe customer ID only (card details handled by Stripe)
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. Processor Obligations -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          4. Processor Obligations
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-4">We commit to:</p>
        <ul class="space-y-2 text-stone-600 dark:text-stone-400">
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">✓</span>
            <span>Process Personal Data only according to your documented instructions</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">✓</span>
            <span>Ensure personnel are bound by confidentiality obligations</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">✓</span>
            <span>Implement appropriate technical and organizational security measures</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">✓</span>
            <span>Assist with Data Subject requests and regulatory obligations</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">✓</span>
            <span>Delete or return Personal Data upon contract termination</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">✓</span>
            <span>Make available information necessary to demonstrate compliance</span>
          </li>
        </ul>
      </section>

      <!-- 5. Security Measures -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          5. Security Measures
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-4">
          We implement the following security measures:
        </p>
        <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
          <ul class="space-y-3 text-stone-600 dark:text-stone-400">
            <li class="flex items-start gap-3">
              <span class="text-lg">🔒</span>
              <div>
                <strong>Encryption in Transit</strong> — All data transmitted via HTTPS/TLS 1.3
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-lg">🔐</span>
              <div>
                <strong>Encryption at Rest</strong> — Database and backups encrypted
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-lg">🔑</span>
              <div>
                <strong>Password Security</strong> — Passwords hashed with scrypt (secure key derivation)
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-lg">🛡️</span>
              <div>
                <strong>Access Control</strong> — Strict access controls and authentication
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-lg">📋</span>
              <div>
                <strong>Audit Logging</strong> — Authentication events logged for security review
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-lg">💾</span>
              <div>
                <strong>Regular Backups</strong> — Automated, encrypted backups with tested restoration
              </div>
            </li>
          </ul>
        </div>
      </section>

      <!-- 6. Sub-processors -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          6. Sub-processors
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-4">
          We use the following sub-processors to provide the Service:
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-stone-200 dark:border-stone-700">
                <th class="text-left py-3 font-semibold text-stone-800 dark:text-stone-100">Sub-processor</th>
                <th class="text-left py-3 font-semibold text-stone-800 dark:text-stone-100">Purpose</th>
                <th class="text-left py-3 font-semibold text-stone-800 dark:text-stone-100">Location</th>
              </tr>
            </thead>
            <tbody class="text-stone-600 dark:text-stone-400">
              <tr class="border-b border-stone-100 dark:border-stone-800">
                <td class="py-3">Stripe, Inc.</td>
                <td class="py-3">Payment processing</td>
                <td class="py-3">USA (SCCs)</td>
              </tr>
              <tr class="border-b border-stone-100 dark:border-stone-800">
                <td class="py-3">Hosting Provider</td>
                <td class="py-3">Infrastructure</td>
                <td class="py-3">EU/UK</td>
              </tr>
              <tr>
                <td class="py-3">Email Service Provider</td>
                <td class="py-3">Transactional emails</td>
                <td class="py-3">EU/UK</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-sm text-stone-500 dark:text-stone-500 mt-4">
          We will notify you of any intended changes to sub-processors, giving you
          the opportunity to object to such changes.
        </p>
      </section>

      <!-- 7. Data Subject Rights -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          7. Data Subject Rights
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-4">
          We assist you in responding to Data Subject requests by providing:
        </p>
        <ul class="space-y-2 text-stone-600 dark:text-stone-400">
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span><strong>Data Export</strong> — Full export of all personal data in machine-readable format</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span><strong>Data Correction</strong> — Ability to edit all personal information</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span><strong>Data Deletion</strong> — Complete account and data deletion from Settings</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span><strong>Data Access</strong> — View all stored personal data within the application</span>
          </li>
        </ul>
      </section>

      <!-- 8. Data Breach Notification -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          8. Data Breach Notification
        </h2>
        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
          <p class="text-stone-700 dark:text-stone-300">
            In the event of a Personal Data breach, we will:
          </p>
          <ul class="mt-3 space-y-2 text-stone-600 dark:text-stone-400">
            <li class="flex items-start gap-2">
              <span class="text-amber-600 mt-1">1.</span>
              <span>Notify you without undue delay (within 72 hours of becoming aware)</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-amber-600 mt-1">2.</span>
              <span>Provide details of the nature, scope, and likely consequences of the breach</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-amber-600 mt-1">3.</span>
              <span>Describe measures taken or proposed to address the breach</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-amber-600 mt-1">4.</span>
              <span>Cooperate with investigations and remediation efforts</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- 9. International Transfers -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          9. International Data Transfers
        </h2>
        <p class="text-stone-600 dark:text-stone-400">
          When Personal Data is transferred outside the EEA/UK, we ensure appropriate
          safeguards are in place:
        </p>
        <ul class="mt-3 space-y-2 text-stone-600 dark:text-stone-400">
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>EU-approved Standard Contractual Clauses (SCCs)</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>UK International Data Transfer Agreement (IDTA) where applicable</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Adequacy decisions where available</span>
          </li>
        </ul>
      </section>

      <!-- 10. Termination -->
      <section>
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          10. Data Return and Deletion
        </h2>
        <p class="text-stone-600 dark:text-stone-400">
          Upon termination of the Service or your request:
        </p>
        <ul class="mt-3 space-y-2 text-stone-600 dark:text-stone-400">
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>You may export all Personal Data via Settings → Data Export</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Upon account deletion, all Personal Data is permanently deleted within 30 days</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-tada-600 mt-1">•</span>
            <span>Backups containing your data are overwritten within 90 days</span>
          </li>
        </ul>
      </section>

      <!-- Contact -->
      <section class="border-t border-stone-200 dark:border-stone-700 pt-8">
        <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Contact
        </h2>
        <p class="text-stone-600 dark:text-stone-400">
          For questions about this DPA or to exercise your rights:
        </p>
        <p class="mt-2">
          <a
            href="mailto:privacy@tada.living"
            class="text-tada-600 hover:text-tada-700 dark:text-tada-400 dark:hover:text-tada-300"
          >
            privacy@tada.living
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
        to="/terms"
        class="text-stone-600 dark:text-stone-400 hover:text-tada-600 dark:hover:text-tada-400"
      >
        Terms of Service
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
