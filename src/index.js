export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response("Missing 'url' query parameter.", { status: 400 });
    }

    // Adjusted to match your exact binding name: MY_BROWSER
    if (!env.MY_BROWSER || typeof env.MY_BROWSER.quickAction !== 'function') {
      return new Response(JSON.stringify({
        success: false,
        error: "The 'MY_BROWSER' environment binding is not active or authorized. Please check your Cloudflare Dashboard configuration."
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    try {
      // Call quickAction directly on MY_BROWSER
      const response = await env.MY_BROWSER.quickAction("screenshot", {
        url: targetUrl,
        evaluate: `(() => {
          const streams = [];
          document.querySelectorAll('video').forEach(v => { if (v.src) streams.push({ src: v.src, type: 'tagUrl' }); });
          performance.getEntriesByType('resource').forEach(r => {
            if (r.name.includes('.m3u8') || r.name.includes('.mp4')) { streams.push({ src: r.name, type: 'network' }); }
          });
          return JSON.stringify(streams);
        })()`
      });

      const resultHeader = response.headers.get("X-Evaluation-Result");
      const parsedStreams = resultHeader ? JSON.parse(resultHeader) : [];

      return new Response(JSON.stringify({ success: true, streams: parsedStreams }), {
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
