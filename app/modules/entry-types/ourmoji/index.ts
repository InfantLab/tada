/**
 * Ourmoji Entry Type Module (013-ourmoji-module)
 *
 * Daily Ourmoji card — emoji + reflection + moon/wheel context.
 * Self-registers with the entry type registry on import.
 */

import { registerEntryType } from "~/registry/entryTypes";
import type { EntryTypeDefinition } from "~/types/entryType";

export const ourmojiDefinition: EntryTypeDefinition = {
  type: "ourmoji",
  label: "Ourmoji",
  emoji: "🌙",
  description: "Daily emoji + reflection (with moon & wheel of year)",

  // The Ourmoji daily card is delivered via the API rather than entered
  // by hand, so we point at a placeholder input for now. The actual
  // daily-card UI lives in `app/components/ourmoji/OurmojiDailyCard.vue`
  // and the page in `app/pages/ourmoji.vue` (Phase 3).
  inputComponent: "OurmojiDailyCard",

  navigation: {
    href: "/ourmoji",
    icon: "moon",
    order: 6,
  },
};

registerEntryType(ourmojiDefinition);
