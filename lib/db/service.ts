// SERVER ONLY. Runs as service_role, which BYPASSES Row Level Security.
// Never import this from a page or component. Today it's used by the server-only modules
// (state-machine, pipeline, run, notifications) and sign-in; keep it that way unless there's a
// strong reason.
import "server-only";
import { postgrest } from "./postgrest";

export function createServiceClient() {
  return postgrest("service_role");
}
