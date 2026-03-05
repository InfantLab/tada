import type { ApiAuthContext } from "~/types/api";

declare module "h3" {
  interface H3EventContext {
    auth: ApiAuthContext | undefined;
  }
}
