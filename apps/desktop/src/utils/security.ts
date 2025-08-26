/**
 * Security utilities for Cadence application
 */

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove script tags
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    // Remove javascript: protocols
    .replace(/javascript:/gi, '')
    // Remove data: URIs that might contain scripts
    .replace(/data:text\/html/gi, '')
    // Trim whitespace
    .trim();
}

/**
 * Sanitizes HTML content while preserving basic formatting
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Allow only safe tags (defined for future use)
  // const allowedTags = ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span'];
  // const allowedAttributes = ['class', 'style'];

  return html
    // Remove dangerous tags
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    // Remove event handlers
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    // Remove javascript: and data: protocols
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .replace(/src="javascript:[^"]*"/gi, 'src=""')
    .replace(/src="data:text\/html[^"]*"/gi, 'src=""');
}

/**
 * Validates file type against allowed extensions
 */
export function validateFileType(filename: string, allowedTypes: string[]): boolean {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  const extension = filename.toLowerCase().split('.').pop();
  if (!extension) {
    return false;
  }

  return allowedTypes.includes(extension);
}

/**
 * Validates file size against maximum allowed size
 */
export function validateFileSize(file: File, maxSizeBytes: number): boolean {
  if (!file || typeof maxSizeBytes !== 'number') {
    return false;
  }

  return file.size <= maxSizeBytes;
}

/**
 * Generates a secure random string for IDs and tokens
 */
export function generateSecureId(length: number = 16): string {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    // Fallback for environments without crypto API
    return Math.random().toString(36).substring(2, 2 + length);
  }

  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(36)).join('').substring(0, length);
}

/**
 * Validates that a string is a valid UUID v4
 */
export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates project ID format to prevent path traversal
 */
export function validateProjectId(projectId: string): boolean {
  if (!projectId || typeof projectId !== 'string') {
    return false;
  }

  // Project IDs should be alphanumeric with hyphens only
  const validFormat = /^[a-zA-Z0-9-]+$/.test(projectId);
  
  // Should not contain path traversal patterns
  const noPathTraversal = !projectId.includes('..') && 
                         !projectId.includes('/') && 
                         !projectId.includes('\\');

  // Should have reasonable length
  const reasonableLength = projectId.length >= 1 && projectId.length <= 64;

  return validFormat && noPathTraversal && reasonableLength;
}

/**
 * Rate limiting utility for preventing abuse
 */
export class RateLimiter {
  private requests = new Map<string, number[]>();
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  /**
   * Checks if a request is allowed for the given identifier
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    const existingRequests = this.requests.get(identifier) || [];
    
    // Filter out requests outside the window
    const recentRequests = existingRequests.filter(time => time > windowStart);
    
    // Check if under limit
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    return true;
  }

  /**
   * Clears old requests to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [identifier, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => time > windowStart);
      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }
}

/**
 * Secure localStorage wrapper with encryption-like obfuscation
 */
export class SecureStorage {
  private static encode(value: string): string {
    try {
      // Simple obfuscation - not real encryption but better than plain text
      return btoa(encodeURIComponent(value));
    } catch {
      return value;
    }
  }

  private static decode(value: string): string {
    try {
      return decodeURIComponent(atob(value));
    } catch {
      return value;
    }
  }

  static setItem(key: string, value: string): void {
    try {
      const encoded = this.encode(value);
      localStorage.setItem(key, encoded);
    } catch (error) {
      console.error('SecureStorage: Failed to store item', error);
    }
  }

  static getItem(key: string): string | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return null;
      }
      return this.decode(item);
    } catch (error) {
      console.error('SecureStorage: Failed to retrieve item', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('SecureStorage: Failed to remove item', error);
    }
  }

  static clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('SecureStorage: Failed to clear storage', error);
    }
  }
}

/**
 * Checks if the application is running in a secure context
 */
export function isSecureContext(): boolean {
  // Check if running in Electron (considered secure)
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return true;
  }

  // Check if running over HTTPS or localhost
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;
    return protocol === 'https:' || 
           hostname === 'localhost' || 
           hostname === '127.0.0.1' ||
           hostname === '::1';
  }

  // Default to false if we can't determine context
  return false;
}

/**
 * Logs security events for monitoring
 */
export function logSecurityEvent(event: string, details: Record<string, any> = {}): void {
  const securityLog = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location?.href : 'unknown'
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.warn('Security Event:', securityLog);
  }

  // Store security events for potential analysis
  try {
    const existingLogs = JSON.parse(localStorage.getItem('cadence_security_logs') || '[]');
    existingLogs.push(securityLog);
    
    // Keep only last 100 security events
    const recentLogs = existingLogs.slice(-100);
    localStorage.setItem('cadence_security_logs', JSON.stringify(recentLogs));
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}
