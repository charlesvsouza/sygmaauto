import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WaOrderPayload {
  customerName: string;
  customerPhone: string;
  orderNumber: number | string;
  vehicleBrand: string;
  vehicleModel: string;
  plate: string;
  approvalLink?: string;
  totalCost?: number;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly config: ConfigService) {}

  private get apiUrl(): string {
    return this.config.get<string>('EVOLUTION_API_URL') ?? '';
  }

  private get globalApiKey(): string {
    return this.config.get<string>('EVOLUTION_API_KEY') ?? '';
  }

  private get instanceName(): string {
    return this.config.get<string>('EVOLUTION_INSTANCE') ?? 'sygmaauto';
  }

  isConfigured(): boolean {
    return !!(this.apiUrl && this.globalApiKey);
  }

  /** Normaliza número para formato E.164 (55 + DDD + número) */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    return `55${digits}`;
  }

  async sendText(to: string, message: string): Promise<void> {
    return this.send(to, message);
  }

  private async send(to: string, message: string): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(`WhatsApp não configurado — mensagem para ${to} descartada`);
      return;
    }

    const number = this.normalizePhone(to);

    try {
      await axios.post(
        `${this.apiUrl}/message/sendText/${this.instanceName}`,
        { number, text: message },
        {
          headers: {
            apikey: this.globalApiKey,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        },
      );
      this.logger.log(`WhatsApp enviado para ${number}`);
    } catch (err: any) {
      this.logger.error(
        `Falha ao enviar WhatsApp para ${number}: ${err?.response?.data?.message ?? err.message}`,
      );
    }
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  async notifyOrcamentoPronto(p: WaOrderPayload): Promise<void> {
    const msg =
      `🔧 *${p.vehicleBrand} ${p.vehicleModel}* (${p.plate})\n` +
      `Olá, *${p.customerName}*! O orçamento da sua OS *#${p.orderNumber}* está pronto.\n` +
      (p.approvalLink
        ? `\nClique para *aprovar ou recusar* o serviço:\n${p.approvalLink}`
        : `\nEntre em contato conosco para aprovar o serviço.`);
    await this.send(p.customerPhone, msg);
  }

  async notifyAprovado(p: WaOrderPayload): Promise<void> {
    const msg =
      `✅ *OS #${p.orderNumber} aprovada!*\n` +
      `Olá, *${p.customerName}*! Recebemos a aprovação do serviço para o *${p.vehicleBrand} ${p.vehicleModel}* (${p.plate}).\n` +
      `Nossa equipe já iniciará os trabalhos. Em breve entramos em contato!`;
    await this.send(p.customerPhone, msg);
  }

  async notifyProntoEntrega(p: WaOrderPayload): Promise<void> {
    const valor = p.totalCost
      ? `\n💰 Valor: *R$ ${Number(p.totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*`
      : '';
    const msg =
      `🏁 *Seu veículo está pronto!*\n` +
      `Olá, *${p.customerName}*! O *${p.vehicleBrand} ${p.vehicleModel}* (${p.plate}) está pronto para retirada.${valor}\n` +
      `Aguardamos você em nossa oficina. 😊`;
    await this.send(p.customerPhone, msg);
  }

  async notifyEntregue(p: WaOrderPayload): Promise<void> {
    const msg =
      `🚗 *Entrega confirmada — OS #${p.orderNumber}*\n` +
      `Obrigado pela preferência, *${p.customerName}*! Esperamos que fique satisfeito com o serviço.\n` +
      `Em caso de dúvidas, estamos à disposição. ⭐`;
    await this.send(p.customerPhone, msg);
  }

  async notifyCancelado(p: WaOrderPayload): Promise<void> {
    const msg =
      `❌ *OS #${p.orderNumber} cancelada*\n` +
      `Olá, *${p.customerName}*. Informamos que a ordem de serviço do *${p.vehicleBrand} ${p.vehicleModel}* (${p.plate}) foi cancelada.\n` +
      `Entre em contato conosco para mais informações.`;
    await this.send(p.customerPhone, msg);
  }
}
