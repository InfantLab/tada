/**
 * POST /api/entries/parse
 *
 * Parse natural language text to extract entry data.
 * Used for voice input and quick text entry.
 *
 * Request body:
 * - text: Natural language text to parse (required)
 * - contextHints: Array of hints about user preferences (optional)
 * - defaultCategory: Default category if not detected (optional)
 *
 * Response:
 * - parsed: Extracted entry fields
 * - confidence: Parsing confidence (0-1)
 * - extracted: Which fields were extracted vs defaulted
 * - suggestions: Recommended actions based on parse result
 */

import { createLogger } from "~/utils/logger";
import {
  parseNaturalLanguage,
  type ParsedEntry,
} from "~/utils/naturalLanguageParser";
import { z } from "zod";

const logger = createLogger("api:entries:parse");

// Request validation schema
const parseRequestSchema = z.object({
  text: z.string().min(1).max(1000),
  contextHints: z.array(z.string()).optional(),
  defaultCategory: z.string().optional(),
});

interface ParseResponse {
  parsed: ParsedEntry;
  suggestions: {
    action: "create" | "confirm" | "clarify";
    message: string;
    fields?: string[];
  };
}

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const user = event.context.user;
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Authentication required",
    });
  }

  const userId = user.id;

  // Parse request body
  const body = await readBody(event);
  const validation = parseRequestSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: `Invalid request: ${validation.error.issues[0]?.message}`,
    });
  }

  const { text, contextHints, defaultCategory } = validation.data;

  logger.debug("Parsing natural language", {
    userId,
    textLength: text.length,
    hasHints: !!contextHints?.length,
  });

  try {
    // Parse the text
    const parsed = parseNaturalLanguage(text, {
      contextHints,
      defaultCategory,
    });

    // Determine suggested action based on confidence and extracted fields
    let action: "create" | "confirm" | "clarify";
    let message: string;
    const missingFields: string[] = [];

    // Check what's missing
    if (!parsed.input.name) {
      missingFields.push("activity name");
    }
    if (!parsed.input.type) {
      missingFields.push("entry type");
    }
    if (parsed.input.type === "timed" && !parsed.input.durationSeconds) {
      missingFields.push("duration");
    }
    if (parsed.input.type === "tally" && !parsed.input.count) {
      missingFields.push("count");
    }

    if (parsed.confidence >= 0.8 && missingFields.length === 0) {
      action = "create";
      message = "Ready to save";
    } else if (parsed.confidence >= 0.5 && missingFields.length <= 1) {
      action = "confirm";
      message =
        missingFields.length > 0
          ? `Please confirm ${missingFields[0]}`
          : "Please confirm this entry";
    } else {
      action = "clarify";
      message =
        missingFields.length > 0
          ? `Need more info: ${missingFields.join(", ")}`
          : "Could not understand the input";
    }

    const response: ParseResponse = {
      parsed,
      suggestions: {
        action,
        message,
        fields: missingFields.length > 0 ? missingFields : undefined,
      },
    };

    logger.debug("Parse result", {
      userId,
      confidence: parsed.confidence,
      action,
      extracted: parsed.extracted,
    });

    return response;
  } catch (error) {
    logger.error("Failed to parse natural language", { userId, error });
    throw createError({
      statusCode: 500,
      message: "Failed to parse input",
    });
  }
});
