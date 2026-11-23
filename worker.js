const ALLOWED_ORIGIN = "https://mukuayumu-alt.github.io";

export default {

  async fetch(request, env) {

    const origin = request.headers.get("Origin");

    const headers = {

      "Content-Type": "application/json",

      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,

      "Access-Control-Allow-Methods": "POST, OPTIONS",

      "Access-Control-Allow-Headers": "Content-Type"

    };

    if (origin && origin !== ALLOWED_ORIGIN) {

      return new Response("Forbidden", { status: 403 });

    }

    if (request.method === "OPTIONS") {

      return new Response(null, { headers });

    }

    if (request.method !== "POST") {

      return new Response(

        JSON.stringify({ error: "POST only" }),

        { status: 405, headers }

      );

    }

    try {

      const body = await request.json();

      let messages = [];

      if (Array.isArray(body.messages)) {

        messages = body.messages;

      } else if (typeof body.message === "string") {

        messages = [{ role: "user", content: body.message }];

      }

      const contents = messages

        .filter(m => ["user", "assistant", "model"].includes(m.role))

        .map(m => ({

          role: m.role === "assistant" ? "model" : m.role,

          parts: [{ text: String(m.content || m.text || "") }]

        }))

        .filter(m => m.parts[0].text.trim());

      if (!contents.length) {

        return new Response(

          JSON.stringify({ error: "メッセージがありません" }),

          { status: 400, headers }

        );

      }

      const response = await fetch(

        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",

        {

          method: "POST",

          headers: {

            "Content-Type": "application/json",

            "x-goog-api-key": env.GEMINI_API_KEY

          },

          body: JSON.stringify({

            contents,

            generationConfig: {

              maxOutputTokens: 600

            }

          })

        }

      );

      const data = await response.json();

      if (!response.ok) {

        return new Response(

          JSON.stringify({

            error: data.error?.message || "Gemini API error"

          }),

          { status: 500, headers }

        );

      }

      const reply = data.candidates?.[0]?.content?.parts

        ?.map(p => p.text || "")

        .join("") || "返答を取得できませんでした。";

      return new Response(

        JSON.stringify({ reply }),

        { headers }

      );

    } catch (error) {

      return new Response(

        JSON.stringify({ error: "サーバー処理でエラーが発生しました。" }),

        { status: 500, headers }

      );

    }

  }

};
