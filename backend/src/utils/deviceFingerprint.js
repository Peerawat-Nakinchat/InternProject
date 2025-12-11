// src/utils/deviceFingerprint.js
import crypto from "crypto";

/**
 * Generate a device fingerprint from request
 * Uses User-Agent + IP for Option A
 */
export const generateDeviceFingerprint = (req) => {
  const userAgent = req.headers["user-agent"] || "";
  const ip = req.clientInfo?.ipAddress || req.ip || "";

  // Hash for privacy
  return crypto.createHash("sha256").update(`${userAgent}-${ip}`).digest("hex");
};

/**
 * Parse User-Agent to human-readable device name
 */
export const parseUserAgent = (ua) => {
  if (!ua) return "Unknown Device";

  let browser = "Unknown Browser";
  let os = "Unknown OS";

  // Detect Browser
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";

  // Detect OS
  if (ua.includes("Windows NT 10")) os = "Windows 10/11";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} on ${os}`;
};

export default { generateDeviceFingerprint, parseUserAgent };
