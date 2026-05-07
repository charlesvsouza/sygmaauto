export interface WhatsappSendOptions {
  phoneNumberId?: string;
}

export interface WhatsappProvider {
  readonly name: string;
  isConfigured(): boolean;
  sendText(to: string, message: string, options?: WhatsappSendOptions): Promise<void>;
}
