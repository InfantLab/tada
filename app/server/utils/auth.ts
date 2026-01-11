import { Lucia } from "lucia";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "~/server/db";
import { sessions, users } from "~/server/db/schema";

// Initialize Lucia with Drizzle adapter
const adapter = new DrizzleSQLiteAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env["NODE_ENV"] === "production",
    },
  },
  getUserAttributes: (attributes) => {
    return {
      username: attributes.username,
      timezone: attributes.timezone,
    };
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      username: string;
      timezone: string;
    };
  }
}

declare module "h3" {
  interface H3EventContext {
    user: import("lucia").User | null;
    session: import("lucia").Session | null;
  }
}
