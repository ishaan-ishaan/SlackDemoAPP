import { slackApi } from "./api";
import { getAIResponse } from "../ai/chat";

export function handleSlackEvent(event: any) {
  if (!event || !event.type) return;

  // Only reply to messages (not bot messages)
  if (event.type === "message" && !event.subtype && event.text) {
    const userPrompt = event.text;

    const aiReply = getAIResponse(userPrompt);

    slackApi("chat.postMessage", "post", {
      channel: event.channel,
      text: aiReply,
    });
  }
}
