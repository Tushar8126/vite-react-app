// AI insights: analyze recent readings and return JSON insights + risk level
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { readings } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");

    if (!Array.isArray(readings) || readings.length === 0) {
      return new Response(
        JSON.stringify({ insights: [], risk: "low", summary: "Log a few readings to unlock personalized insights." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const compact = readings.slice(0, 60).map((r: any) => ({
      v: r.value,
      ctx: r.meal_context ?? null,
      t: r.measured_at ?? r.created_at,
    }));

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a diabetes data analyst. Analyze blood glucose readings (mg/dL) and produce concise, actionable insights for a patient. Never give a diagnosis. Always remind to consult a doctor when relevant.",
          },
          {
            role: "user",
            content:
              "Analyze these recent readings and call the function with insights. Each entry has v=value mg/dL, ctx=meal context, t=timestamp.\n" +
              JSON.stringify(compact),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_insights",
              description: "Return diabetes insights and a risk level.",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "1-2 sentence summary." },
                  risk: { type: "string", enum: ["low", "medium", "high"] },
                  insights: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 short, specific insights or recommendations.",
                  },
                },
                required: ["summary", "risk", "insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_insights" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit hit." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (resp.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : null;
    if (!args) {
      return new Response(JSON.stringify({ insights: [], risk: "low", summary: "No insights available." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
