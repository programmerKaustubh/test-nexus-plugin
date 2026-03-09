/**
 * HTTP Client for TestNexus Backend
 *
 * Posts alert payloads with exponential backoff retry.
 * - Max 3 retries on 5xx errors
 * - No retry on 4xx errors
 * - 30 second timeout
 */

const https = require("https");
const {logger} = require("firebase-functions");

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const TIMEOUT_MS = 30000;
const EXTENSION_VERSION = "1.0.0";

/**
 * Posts a JSON payload to the TestNexus backend.
 *
 * @param {string} url - The backend endpoint URL
 * @param {string} token - The connection token (Bearer auth)
 * @param {object} payload - The alert payload to send
 * @return {Promise<object>} Response with statusCode and body
 */
async function postAlert(url, token, payload) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      logger.info(`Retry attempt ${attempt}/${MAX_RETRIES} after ${backoff}ms`);
      await sleep(backoff);
    }

    try {
      const result = await doPost(url, token, payload);

      // Success
      if (result.statusCode >= 200 && result.statusCode < 300) {
        return result;
      }

      // Client error — don't retry
      if (result.statusCode >= 400 && result.statusCode < 500) {
        logger.warn(`Client error ${result.statusCode}, not retrying`, {body: result.body});
        return result;
      }

      // Server error — retry
      logger.warn(`Server error ${result.statusCode}, will retry`);
      lastError = new Error(`HTTP ${result.statusCode}: ${JSON.stringify(result.body)}`);
    } catch (error) {
      logger.error(`Request failed: ${error.message}`);
      lastError = error;
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

/**
 * Performs a single HTTP POST request.
 * @param {string} url - Target URL
 * @param {string} token - Bearer token
 * @param {object} payload - JSON body
 * @return {Promise<object>} Response with statusCode and body
 */
function doPost(url, token, payload) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") {
      return reject(new Error("TestNexus requires HTTPS for secure token transport."));
    }

    const body = JSON.stringify(payload);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Authorization": `Bearer ${token}`,
        "X-TestNexus-Source": "firebase-extension",
        "X-TestNexus-Version": EXTENSION_VERSION,
      },
      timeout: TIMEOUT_MS,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = {raw: data};
        }
        resolve({statusCode: res.statusCode, body: parsed});
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy(new Error(`Request timed out after ${TIMEOUT_MS}ms`));
    });

    req.write(body);
    req.end();
  });
}

/**
 * @param {number} ms - Milliseconds to sleep
 * @return {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  postAlert,
  EXTENSION_VERSION,
};
