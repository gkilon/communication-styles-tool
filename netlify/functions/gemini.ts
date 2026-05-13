import { GoogleGenAI } from "@google/genai";

export default async (req: Request) => {
  try {
    const { action, payload } = await req.json();
    // Try standard Netlify env var first, then the VITE_ prefixed one
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Gemini API Key missing");
      return new Response(JSON.stringify({ error: "API Key missing in environment" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelName = payload.model || "gemini-2.0-flash";

    // Helper for streaming
    if (action.endsWith('Stream')) {
      try {
        const result = await ai.models.generateContentStream({
          model: modelName,
          contents: payload.contents,
          config: payload.config
        });

        // The result itself is an async iterator in @google/genai
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of result) {
                const text = chunk.text;
                if (text) {
                  controller.enqueue(new TextEncoder().encode(text));
                }
              }
              controller.close();
            } catch (e: any) {
              console.error("Stream processing error:", e);
              controller.error(e);
            }
          }
        });

        return new Response(stream, {
          headers: { 
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        });
      } catch (streamError: any) {
        console.error("Streaming initialization error:", streamError);
        return new Response(JSON.stringify({ error: streamError.message }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Non-streaming actions
    const response = await ai.models.generateContent({
      model: modelName,
      contents: payload.contents,
      config: payload.config
    });

    return new Response(JSON.stringify({ text: response.text }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Netlify Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = {
  path: "/api/gemini"
};
