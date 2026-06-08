export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response("Missing 'url' query parameter.", { status: 400 });
    }

    try {
      // Use the native 'scrape' quick action. This runs out-of-band 
      // and won't throw the /v1/acquire Puppeteer version error.
      const response = await env.MY_BROWSER.quickAction("scrape", {
        url: targetUrl,
        // The prompt directs the browser's optimized extraction model on what to find
        prompt: "Extract all streaming video source URLs, specifically looking for links ending in .m3u8 or .mp4, along with any video element attributes like current playback source, status, or duration.",
        format: "json"
      });

      // The response returned from quickAction is a standard Response object containing the scraped data
      const data = await response.json();

      return new Response(JSON.stringify({ success: true, data }), {
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
