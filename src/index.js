export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response("Missing 'url' query parameter.", { status: 400 });
    }

    try {
      // The native scrape action expects target elements and their target attributes
      const response = await env.BROWSER.quickAction("scrape", {
        url: targetUrl,
        elements: [
          {
            selector: "video",       // Find all <video> tags
            type: "element",
            attributes: ["src", "paused", "currentTime", "duration"] // Grab these fields
          },
          {
            selector: "video source", // Also check nested <source> tags if present
            type: "element",
            attributes: ["src", "type"]
          }
        ]
      });

      const data = await response.json();
      return new Response(JSON.stringify({ success: true, matches: data }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  },
};
