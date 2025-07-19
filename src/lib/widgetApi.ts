// API service for embedded widget to fetch user configurations
export class WidgetApiService {
  private baseUrl: string;
  private widgetId: string;

  constructor(baseUrl: string, widgetId: string) {
    this.baseUrl = baseUrl;
    this.widgetId = widgetId;
  }

  async fetchBotConfig(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/widget/${this.widgetId}/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch bot config:', error);
      throw error;
    }
  }

  async sendMessage(message: string, sessionId?: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/widget/${this.widgetId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }
}