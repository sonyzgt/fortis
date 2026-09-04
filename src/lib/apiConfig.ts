export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }
    // In production behind Nginx, relative URL is routed to backend on port 4000
    return '';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

export function getSocketBaseUrl(): string {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    }
    // In production on live domain, if NEXT_PUBLIC_SOCKET_URL still points to localhost, ignore it and use current domain
    if (process.env.NEXT_PUBLIC_SOCKET_URL && !process.env.NEXT_PUBLIC_SOCKET_URL.includes('localhost') && !process.env.NEXT_PUBLIC_SOCKET_URL.includes('127.0.0.1')) {
      return process.env.NEXT_PUBLIC_SOCKET_URL;
    }
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
}
