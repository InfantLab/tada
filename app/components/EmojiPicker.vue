<script setup lang="ts">
/**
 * Reusable emoji picker component
 * Uses emoji-picker-element for full native emoji support
 */

interface Props {
  modelValue: boolean;
  entryName?: string;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "select", emoji: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const pickerContainer = ref<HTMLElement | null>(null);
const pickerInstance = ref<any>(null);

// Close modal
function close() {
  emit("update:modelValue", false);
  
  // Clean up picker instance so it recreates fresh next time
  if (pickerInstance.value && pickerContainer.value) {
    try {
      pickerInstance.value.removeEventListener("emoji-click", handleEmojiSelect);
      pickerContainer.value.innerHTML = "";
    } catch (error) {
      console.error("Error cleaning up emoji picker:", error);
    }
    pickerInstance.value = null;
  }
}

// Handle emoji selection
function handleEmojiSelect(event: CustomEvent) {
  const emoji = event.detail.unicode || event.detail.emoji?.unicode;
  if (emoji) {
    emit("select", emoji);
    close();
  }
}

// Mount emoji picker when modal opens
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen && !pickerInstance.value) {
      // Wait for next tick to ensure DOM is ready
      await nextTick();
      
      if (!pickerContainer.value) {
        console.error("Emoji picker container not found");
        return;
      }

      try {
        // Dynamically import the emoji picker (client-side only)
        const { Picker } = await import("emoji-picker-element");
        const picker = new Picker();

        // Apply dark mode styling if needed
        picker.className = "emoji-picker";

        // Listen for emoji selection
        picker.addEventListener(
          "emoji-click",
          handleEmojiSelect as EventListener
        );

        // Store instance and append to container
        pickerInstance.value = picker;
        pickerContainer.value.appendChild(picker);
      } catch (error) {
        console.error("Failed to load emoji picker:", error);
      }
    }
  }
);

// Close on Escape key
function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    close();
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  if (pickerInstance.value) {
    pickerInstance.value.removeEventListener("emoji-click", handleEmojiSelect);
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click="close"
      >
        <div
          class="bg-white dark:bg-stone-800 rounded-xl shadow-xl overflow-hidden"
          @click.stop
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700"
          >
            <h3
              class="text-lg font-semibold text-stone-800 dark:text-stone-100"
            >
              Choose Emoji
              <span v-if="entryName" class="text-sm font-normal text-stone-500">
                for {{ entryName }}
              </span>
            </h3>
            <button
              class="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
              @click="close"
            >
              <svg
                class="w-5 h-5 text-stone-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Emoji picker container -->
          <div ref="pickerContainer" class="emoji-picker-container" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.emoji-picker-container {
  max-height: 400px;
  overflow: hidden;
}

:deep(.emoji-picker) {
  border: none;
  width: 100%;
  --background: transparent;
}

/* Dark mode support */
:deep(.dark .emoji-picker) {
  --background: theme("colors.stone.800");
  --border-color: theme("colors.stone.700");
  --input-border-color: theme("colors.stone.600");
  --input-font-color: theme("colors.stone.100");
  --input-placeholder-color: theme("colors.stone.400");
  --outline-color: #f59e0b;
  --category-emoji-size: 1.25rem;
  --emoji-size: 1.5rem;
  --category-font-color: theme("colors.stone.300");
  --search-background-color: theme("colors.stone.700");
  --search-icon-color: theme("colors.stone.400");
  --indicator-color: #f59e0b;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.2s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>
