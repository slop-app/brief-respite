const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405, { Allow: "GET, OPTIONS" });
  }

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: "date must use YYYY-MM-DD format" }, 400);
  }

  try {
    const nytResponse = await fetch(
      `https://www.nytimes.com/svc/wordle/v2/${date}.json`,
      { headers: { Accept: "application/json" } },
    );

    if (!nytResponse.ok) {
      return json({ error: "Word source request failed" }, nytResponse.status);
    }

    const payload = await nytResponse.json();
    const solution = String(payload?.solution ?? "").toLowerCase();
    if (!/^[a-z]{5}$/.test(solution)) {
      return json({ error: "Word source returned an invalid solution" }, 502);
    }

    return json(
      { solution },
      200,
      { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    );
  } catch {
    return json({ error: "Word source is unavailable" }, 502);
  }
});
