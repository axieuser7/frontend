// Application configuration
export const config = {
  // Get the current domain from environment variables or fallback to current location
  domain: import.meta.env.VITE_APP_DOMAIN || 'frontenddk.netlify.app',
  baseUrl: import.meta.env.VITE_APP_URL || 'https://frontenddk.netlify.app',
  
  // Supabase configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    serviceKey: import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  },
  
  // Widget configuration
  widget: {
    scriptPath: '/chatbot-widget.js',
    apiPath: '/api/widget',
  },
  
  // CORS configuration
  cors: {
    allowedOrigins: [
      import.meta.env.VITE_APP_URL || 'https://frontenddk.netlify.app',
      'http://localhost:5173', // Always allow local development
      'https://frontenddk.netlify.app', // Production domain
    ],
  },
};

// Helper functions
export const getBaseUrl = () => config.baseUrl;
export const getDomain = () => config.domain;
export const getWidgetScriptUrl = () => `${config.baseUrl}${config.widget.scriptPath}`;
export const getApiUrl = (endpoint: string) => `${config.baseUrl}${config.widget.apiPath}${endpoint}`;