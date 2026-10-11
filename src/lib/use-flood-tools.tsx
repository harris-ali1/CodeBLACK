// Registers FloodLine's client tools with the nearest ElevenLabs ConversationProvider.
// Shared by the voice agent and the text chat so both behave the same.
import { useConversationClientTool } from "@elevenlabs/react";
import { getFloodStatus } from "@/lib/voice-tools";

export function useFloodTools(onFocusGauge?: (gaugeId: string) => void) {
  useConversationClientTool("get_flood_status", (params: { location?: string }) => getFloodStatus(params));
  useConversationClientTool("focus_gauge", (params: { gauge_id?: string }) => {
    if (params.gauge_id) onFocusGauge?.(params.gauge_id);
    return "Map is now showing that gauge.";
  });
}