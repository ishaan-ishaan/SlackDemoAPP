// src/ai/chat.ts

export async function getAIResponse(prompt: string): Promise<string> {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GROQ_API_KEY");
  if (!apiKey) throw new Error("Missing GROQ_API_KEY!");

  const body = {
    model: "llama3-8b-8192", // Free and fast
    messages: [
      { role: "system", content: "You are a friendly helpful Slack assistant." },
      { role: "user", content: prompt }
    ]
  };

  const response = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    muteHttpExceptions: true,
  });

  const json = JSON.parse(response.getContentText());

  if (!json.choices || !json.choices[0]) {
    return "Sorry, I couldn't generate a response.";
  }

  return json.choices[0].message.content;
}
