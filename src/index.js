import chromium from '@cloudflare/puppeteer';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response("Missing 'url' query parameter.", { status: 400 });
    }

    let browser;
    try {
      // Launch the browser using the wrangler configuration binding
      browser = await chromium.launch(env.MY_BROWSER);
      const page = await browser.newPage();

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Injects and runs your media scraper script inside the headless browser tab
      const capturedMedia = await page.evaluate(async () => {
        return new Promise((resolve) => {
          
          function completion(result) {
            resolve(result.data || result);
          }

          // === YOUR ORIGINAL MEDIA SCRAPER LOGIC ===
          (function() {
              window.button_m3u8VideoUrls_touchend = false;
              window.m3u8VideoUrlsXmlM3u8 = '';
              window.m3u8VideoUrlsm3u8Array = [];
              var capturedVideos = [];

              function ensureAbsoluteUrl(url) {
                  if (!url) return url;
                  return url.indexOf('/') === 0 ? window.location.origin + url : url;
              }

              function processAndSendVideo(videoObj) {
                  if (!videoObj.src || !videoObj.pageSrc) return;
                  if (videoObj.src === videoObj.pageSrc) return;
                  videoObj.type = 'mpjex';
                  if (!capturedVideos.some(v => v.src === videoObj.src)) {
                      capturedVideos.push(videoObj);
                  }
              }

              function scanNetworkResources() {
                  const resources = performance.getEntriesByType('resource');
                  resources.forEach(resource => {
                      if (resource.initiatorType === 'xmlhttprequest' || resource.initiatorType === 'fetch') {
                          if (resource.name.includes('.m3u8') || resource.name.includes('.mp4')) {
                              processAndSendVideo({
                                  'src': resource.name, 'pageSrc': window.location.href, 
                                  'title': document.title, 'apiType': 'http', 'ua': navigator.userAgent
                              });
                          }
                      }
                  });
              }

              function scanDOMForVideos() {
                  document.querySelectorAll('video').forEach(video => {
                      var sourceUrl = video.src ? ensureAbsoluteUrl(video.src) : '';
                      if (sourceUrl && sourceUrl.startsWith('http')) {
                          processAndSendVideo({
                              'src': sourceUrl, 'pageSrc': window.location.href,
                              'title': document.title, 'apiType': 'tagUrl', 'ua': navigator.userAgent
                          });
                      }
                  });
              }

              function startScraperEngine() {
                  scanNetworkResources();
                  scanDOMForVideos();
                  
                  let pollingInterval = setInterval(function () {
                      scanNetworkResources();
                      scanDOMForVideos();
                      if (capturedVideos.length >= 1) {
                          clearInterval(pollingInterval);
                          completion({ 'data': capturedVideos });
                      }
                  }, 1000);
                  
                  setTimeout(function () {
                      clearInterval(pollingInterval);
                      completion({ 'data': capturedVideos });
                  }, 15000);
              }
              
              if (document.readyState === 'complete' || document.readyState === 'interactive') {
                  startScraperEngine();
              } else {
                  document.addEventListener('DOMContentLoaded', startScraperEngine);
              }
          })();
        });
      });

      await browser.close();

      return new Response(JSON.stringify({ success: true, streams: capturedMedia }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      if (browser) await browser.close();
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
