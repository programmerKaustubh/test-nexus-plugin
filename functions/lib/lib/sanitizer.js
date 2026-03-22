"use strict";
/**
 * Payload sanitizer for defense-in-depth against notification injection.
 *
 * Strips URLs, HTML tags, and JavaScript protocol handlers from string fields
 * before they are forwarded to the TestNexus backend for push notification delivery.
 *
 * Even though Crashlytics/Config/Performance events are system-generated,
 * the backend API endpoints can also be called directly with arbitrary payloads.
 * This sanitization prevents phishing content from appearing in push notifications.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizePayload = exports.sanitizeField = void 0;
/**
 * Sanitize a single string field.
 * - Strips HTTP/HTTPS URLs (replaced with [link removed])
 * - Strips HTML tags
 * - Strips javascript: protocol
 * - Truncates to maxLength
 */
function sanitizeField(value, maxLength = 500) {
    if (!value || typeof value !== "string")
        return "";
    return value
        .replace(/https?:\/\/\S+/gi, "[link removed]")
        .replace(/<[^>]*>/g, "")
        .replace(/javascript:/gi, "")
        .substring(0, maxLength);
}
exports.sanitizeField = sanitizeField;
/**
 * Sanitize all string fields in a payload object (shallow, one level deep).
 * Non-string fields (numbers, booleans, arrays, null) are passed through unchanged.
 */
function sanitizePayload(payload, fieldLimits) {
    const result = {};
    for (const [key, value] of Object.entries(payload)) {
        if (typeof value === "string") {
            const limit = fieldLimits?.[key] ?? 500;
            result[key] = sanitizeField(value, limit);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
exports.sanitizePayload = sanitizePayload;
//# sourceMappingURL=sanitizer.js.map