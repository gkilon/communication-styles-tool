import { GoogleGenAI } from "@google/genai";

export default async (req: Request) => {
  try {
    const { action, payload } = await req.json();
    const apiKey = process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key missing in environment" }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Helper for streaming
    if (action.endsWith('Stream')) {
      const result = await ai.models.generateContentStream({
        model: payload.model || "gemini-2.5-flash",
        contents: payload.contents,
        config: payload.config
      });

      const iterator = result.stream || (typeof (result as any)[Symbol.asyncIterator] === 'function' ? result : null);

      if (!iterator) {
        return new Response(JSON.stringify({ error: "Failed to initialize stream" }), { status: 500 });
      }

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of iterator as any) {
              const text = chunk.text;
              if (text) {
                controller.enqueue(new TextEncoder().encode(text));
              }
            }
            controller.close();
          } catch (e) {
            controller.error(e);
          }
        }
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    // Non-streaming actions
    const response = await ai.models.generateContent({
      model: payload.model || "gemini-2.5-flash",
      contents: payload.contents,
      config: payload.config
    });

    return new Response(JSON.stringify({ text: response.text }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Netlify Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const config = {
  path: "/api/gemini"
};
