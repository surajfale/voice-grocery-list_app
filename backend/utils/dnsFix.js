import dns from 'dns';

// In development, MongoDB Atlas SRV records often fail to resolve on some Windows setups or local network routers.
// This utility configures Node to use Google's public DNS servers (8.8.8.8 and 8.8.4.4) for resolution.
if (process.env.NODE_ENV !== 'production') {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (error) {
    // Silently fallback if unable to set custom DNS servers
  }
}
