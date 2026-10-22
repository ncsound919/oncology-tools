// Server-side singleton wrapper around z-ai-web-dev-sdk.
// Must NEVER be imported from a client component ('use client').
import ZAI from "z-ai-web-dev-sdk";

let _instance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZai() {
  if (!_instance) {
    _instance = await ZAI.create();
  }
  return _instance;
}
