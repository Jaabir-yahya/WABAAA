/**
 * WhatsApp Cloud API Client
 * 
 * Direct integration with Meta WhatsApp Cloud API.
 * No third-party dependencies (except fetch).
 */

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string;
}

export interface SendMessageParams {
  to: string;
  type: 'text' | 'template' | 'interactive';
  text?: string;
  template?: {
    name: string;
    language: string;
    components?: any[];
  };
  interactive?: any;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string };
  document?: { id: string; filename: string };
  interactive?: any;
}

/**
 * WhatsApp Cloud API Client
 */
export class WhatsAppClient {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;
  private baseUrl: string;

  constructor(config: WhatsAppConfig) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
  }

  /**
   * Send a text message
   */
  async sendText(to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      to,
      type: 'text',
      text
    });
  }

  /**
   * Send a message (generic)
   */
  async sendMessage(params: SendMessageParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.to,
        type: params.type
      };

      if (params.type === 'text' && params.text) {
        payload.text = { body: params.text };
      } else if (params.type === 'template' && params.template) {
        payload.template = params.template;
      } else if (params.type === 'interactive' && params.interactive) {
        payload.interactive = params.interactive;
      }

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Unknown error'
        };
      }

      return {
        success: true,
        messageId: data.messages[0]?.id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send a template message
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'sw',
    components?: any[]
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      to,
      type: 'template',
      template: {
        name: templateName,
        language: languageCode,
        components
      }
    });
  }

  /**
   * Send interactive buttons
   */
  async sendButtons(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title
            }
          }))
        }
      }
    });
  }

  /**
   * Send a list message
   */
  async sendList(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonText,
          sections
        }
      }
    });
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        })
      });

      return { success: response.ok };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Get media URL
   */
  async getMediaUrl(mediaId: string): Promise<{ url?: string; error?: string }> {
    try {
      const response = await fetch(`https://graph.facebook.com/${this.apiVersion}/${mediaId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const data = await response.json();
      return { url: data.url };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  /**
   * Download media
   */
  async downloadMedia(mediaUrl: string): Promise<{ data?: ArrayBuffer; error?: string }> {
    try {
      const response = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const data = await response.arrayBuffer();
      return { data };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}

/**
 * Factory function
 */
export function createWhatsAppClient(config: WhatsAppConfig): WhatsAppClient {
  return new WhatsAppClient(config);
}
