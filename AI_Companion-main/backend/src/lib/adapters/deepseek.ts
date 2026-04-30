import { env } from "../env";

export const deepseekAdapter = {
  isAvailable: () => !!env.DEEPSEEK_API_KEY,

  async generate(req: any) {
    const res = await fetch(`${env.DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: req.template.systemInstruction },
          ...req.history.map((h: any) => ({
            role: h.sender === "user" ? "user" : "assistant",
            content: h.text,
          })),
          { role: "user", content: req.message },
        ],
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  },

  async generateStream(req: any, onChunk: (chunk: string) => void) {
    const text = await this.generate(req);
    onChunk(text);
  },
};
