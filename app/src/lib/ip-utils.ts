/**
 * IP Address utilities for extracting client IP from requests
 * Handles various proxy headers (CloudFlare, AWS, etc)
 */

import { NextRequest } from 'next/server';

/**
 * Extract client IP address from request
 * Handles various proxy headers that may contain the real client IP
 */
export function getClientIp(request: NextRequest): string | null {
  // Check common proxy headers (in order of preference)
  const headers = [
    'x-forwarded-for', // Standard proxy header (may contain multiple IPs)
    'cf-connecting-ip', // CloudFlare
    'x-real-ip', // Nginx proxy
    'x-client-ip', // AWS ALB
    'x-appengine-user-ip', // Google App Engine
    'true-client-ip', // CloudFlare Enterprise
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for may contain multiple IPs, get the first one
      const ip = value.split(',')[0].trim();
      if (isValidIp(ip)) {
        return ip;
      }
    }
  }

  // Fallback to socket address
  const socket = (request as any).socket;
  if (socket?.remoteAddress && isValidIp(socket.remoteAddress)) {
    return socket.remoteAddress;
  }

  return null;
}

/**
 * Validate if a string is a valid IPv4 or IPv6 address
 */
function isValidIp(ip: string): boolean {
  // IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6 validation (simplified)
  const ipv6Regex = /^([\da-f]{0,4}:){2,7}[\da-f]{0,4}$/i;
  return ipv6Regex.test(ip);
}

/**
 * Get approximate location from IP (for logging purposes)
 * In production, you'd use a GeoIP service like MaxMind
 */
export async function getApproximateLocation(ip: string): Promise<{ country?: string; city?: string } | null> {
  try {
    // Example using free IP geolocation API
    // In production, use a proper GeoIP service for accuracy
    const response = await fetch(`https://ip-api.com/json/${ip}?fields=country,city`);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get IP location:', error);
    return null;
  }
}

/**
 * Check if IP is from a VPN/proxy (simplified check)
 * In production, you'd use a proper VPN detection service
 */
export function isProxyOrVpn(ip: string): boolean {
  // List of known data center IPs (simplified)
  // In production, use a proper service
  const knownProxyRanges = [
    // AWS CloudFront
    /^54\./,
    // Google Cloud
    /^35\./,
    // Azure
    /^13\./,
  ];

  return knownProxyRanges.some(range => range.test(ip));
}
