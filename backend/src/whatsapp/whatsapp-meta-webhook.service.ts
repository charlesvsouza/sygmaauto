import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHmac, createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhatsappMetaWebhookService {
  private readonly logger = new Logger(WhatsappMetaWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  isEnabled(): boolean {
    return this.providerMode === 'META_CLOUD';
  }

  validateWebhookChallenge(mode?: string, token?: string, challenge?: string): string | null {
    if (!this.isEnabled()) return null;
    if (!mode || !token || !challenge) return null;
    if (mode !== 'subscribe') return null;
    if (token !== this.verifyToken) return null;
    return challenge;
  }

  isValidSignature(signatureHeader: string | undefined, rawBody: Buffer | undefined): boolean {
    if (!this.isEnabled()) return false;
    if (!this.appSecret || !signatureHeader || !rawBody) return false;
    if (!signatureHeader.startsWith('sha256=')) return false;

    const received = signatureHeader.slice('sha256='.length);
    const expected = createHmac('sha256', this.appSecret).update(rawBody).digest('hex');

    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(received, 'hex');

    if (expectedBuffer.length !== receivedBuffer.length) return false;

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  async processInboundEvent(payload: any): Promise<{ processed: number; duplicates: number }> {
    const ids = this.extractEventIds(payload);
    if (ids.length === 0) {
      const fallbackId = this.buildFallbackEventId(payload);
      ids.push(fallbackId);
    }

    let processed = 0;
    let duplicates = 0;

    const eventType = this.extractEventType(payload);
    const now = new Date();

    for (const id of ids) {
      const existing = await this.prisma.whatsappWebhookEvent.findUnique({
        where: {
          provider_eventKey: {
            provider: this.providerMode,
            eventKey: id,
          },
        },
      });

      if (existing) {
        await this.prisma.whatsappWebhookEvent.update({
          where: { id: existing.id },
          data: {
            processCount: { increment: 1 },
            lastReceivedAt: now,
            eventType,
            payload: payload as Prisma.InputJsonValue,
          },
        });
        duplicates++;
        continue;
      }

      await this.prisma.whatsappWebhookEvent.create({
        data: {
          provider: this.providerMode,
          eventKey: id,
          eventType,
          payload: payload as Prisma.InputJsonValue,
          firstReceivedAt: now,
          lastReceivedAt: now,
        },
      });
      processed++;
    }

    this.logger.log(
      `Meta webhook recebido: provider=${this.providerMode} processed=${processed} duplicates=${duplicates}`,
    );

    return { processed, duplicates };
  }

  private get providerMode(): string {
    return (this.config.get<string>('WHATSAPP_PROVIDER') ?? 'META_CLOUD').trim().toUpperCase();
  }

  private get verifyToken(): string {
    return this.config.get<string>('META_WHATSAPP_VERIFY_TOKEN') ?? '';
  }

  private get appSecret(): string {
    return this.config.get<string>('META_WHATSAPP_APP_SECRET') ?? '';
  }

  private extractEventIds(payload: any): string[] {
    const ids = new Set<string>();

    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value ?? {};

        const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
        for (const status of statuses) {
          if (status?.id) {
            ids.add(`status:${status.id}`);
          }
        }

        const messages = Array.isArray(value?.messages) ? value.messages : [];
        for (const message of messages) {
          if (message?.id) {
            ids.add(`message:${message.id}`);
          }
        }
      }
    }

    return Array.from(ids);
  }

  private buildFallbackEventId(payload: any): string {
    const raw = JSON.stringify(payload ?? {});
    const hash = createHash('sha256').update(raw).digest('hex');
    return `fallback:${hash}`;
  }

  private extractEventType(payload: any): string {
    const firstEntry = Array.isArray(payload?.entry) ? payload.entry[0] : null;
    const firstChange = Array.isArray(firstEntry?.changes) ? firstEntry.changes[0] : null;
    return firstChange?.field ?? payload?.object ?? 'unknown';
  }
}
