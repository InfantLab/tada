/**
 * Module Registry Plugin
 *
 * Imports all modules to trigger their self-registration.
 * Runs on client-side only (modules reference Vue components).
 *
 * To add a new module: create it in the appropriate modules/ subdirectory
 * and add an import here.
 */

// Entry type modules (each calls registerEntryType on import)
import "~/modules/entry-types/tada";
import "~/modules/entry-types/timed";
import "~/modules/entry-types/tally";
import "~/modules/entry-types/moment";
import "~/modules/entry-types/exercise";

// Importer modules (each calls registerImporter on import)
import "~/modules/importers/csv-generic";
import "~/modules/importers/insight-timer";

// Exporter modules (each calls registerExporter on import)
import "~/modules/exporters/json";
import "~/modules/exporters/csv";
import "~/modules/exporters/markdown";
import "~/modules/exporters/obsidian";

export default defineNuxtPlugin(() => {
  // Modules self-register on import — nothing else needed here.
});
