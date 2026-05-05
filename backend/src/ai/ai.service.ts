import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface AiSuggestDto {
  description: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  existingItems?: string[];
}

export interface AiSuggestion {
  type: 'service' | 'part';
  id?: string;
  description: string;
  reason: string;
  estimatedPrice?: number;
  quantity?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async suggest(tenantId: string, dto: AiSuggestDto): Promise<AiSuggestion[]> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY não configurada — retornando sugestões baseadas em catálogo');
      return this.suggestFromCatalog(tenantId, dto);
    }

    const [services, parts] = await Promise.all([
      this.prisma.service.findMany({
        where: { tenantId },
        select: { id: true, name: true, basePrice: true, hourlyRate: true, tmo: true },
        take: 50,
      }),
      this.prisma.part.findMany({
        where: { tenantId },
        select: { id: true, name: true, unitPrice: true },
        take: 50,
      }),
    ]);

    const vehicleInfo = [dto.vehicleBrand, dto.vehicleModel, dto.vehicleYear]
      .filter(Boolean)
      .join(' ');

    const catalogSummary = [
      services.length
        ? `Serviços disponíveis: ${services.map((s) => `${s.name} (R$ ${s.basePrice ?? s.hourlyRate ?? 0})`).join(', ')}`
        : '',
      parts.length
        ? `Peças em estoque: ${parts.map((p) => `${p.name} (R$ ${p.unitPrice})`).join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const existingList = (dto.existingItems ?? []).join(', ');
    const prompt = [
      'Você é um assistente técnico de oficina mecânica.',
      vehicleInfo ? `Veículo: ${vehicleInfo}.` : '',
      `Problema relatado: "${dto.description}".`,
      existingList ? `Já foi lançado no orçamento: ${existingList}.` : '',
      catalogSummary,
      '',
      'Com base no problema relatado e no catálogo acima, sugira até 5 serviços e/ou peças que provavelmente serão necessários.',
      'Para cada sugestão retorne um JSON com: type ("service" ou "part"), description (nome do item — use exatamente o nome do catálogo se aparecer), reason (motivo em 1 frase curta), estimatedPrice (número), quantity (número).',
      'Responda APENAS com um array JSON válido. Sem texto extra.',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? '[]';

      let suggestions: AiSuggestion[] = JSON.parse(content);

      // Enriquecer com IDs do catálogo quando houver match por nome
      suggestions = suggestions.map((s) => {
        if (s.type === 'service') {
          const match = services.find(
            (srv) => srv.name.toLowerCase() === s.description.toLowerCase(),
          );
          if (match) {
            return {
              ...s,
              id: match.id,
              estimatedPrice: s.estimatedPrice ?? match.basePrice ?? match.hourlyRate ?? 0,
              quantity: s.quantity ?? match.tmo ?? 1,
            };
          }
        } else {
          const match = parts.find(
            (p) => p.name.toLowerCase() === s.description.toLowerCase(),
          );
          if (match) {
            return {
              ...s,
              id: match.id,
              estimatedPrice: s.estimatedPrice ?? match.unitPrice ?? 0,
              quantity: s.quantity ?? 1,
            };
          }
        }
        return s;
      });

      return suggestions.slice(0, 5);
    } catch (err) {
      this.logger.error('Erro ao chamar OpenAI:', err);
      return this.suggestFromCatalog(tenantId, dto);
    }
  }

  /**
   * Fallback: sugestões simples baseadas em palavras-chave do catálogo,
   * sem chamar nenhuma API externa.
   */
  private async suggestFromCatalog(
    tenantId: string,
    dto: AiSuggestDto,
  ): Promise<AiSuggestion[]> {
    const keywords = dto.description.toLowerCase().split(/\s+/);

    const [services, parts] = await Promise.all([
      this.prisma.service.findMany({
        where: { tenantId },
        select: { id: true, name: true, basePrice: true, hourlyRate: true, tmo: true },
      }),
      this.prisma.part.findMany({
        where: { tenantId },
        select: { id: true, name: true, unitPrice: true },
      }),
    ]);

    const scoreMatch = (name: string) =>
      keywords.filter((kw) => kw.length > 3 && name.toLowerCase().includes(kw)).length;

    const matchedServices = services
      .map((s) => ({ ...s, score: scoreMatch(s.name) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map<AiSuggestion>((s) => ({
        type: 'service',
        id: s.id,
        description: s.name,
        reason: 'Serviço do catálogo compatível com a descrição',
        estimatedPrice: s.basePrice ?? s.hourlyRate ?? 0,
        quantity: s.tmo ?? 1,
      }));

    const matchedParts = parts
      .map((p) => ({ ...p, score: scoreMatch(p.name) }))
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map<AiSuggestion>((p) => ({
        type: 'part',
        id: p.id,
        description: p.name,
        reason: 'Peça do estoque compatível com a descrição',
        estimatedPrice: p.unitPrice ?? 0,
        quantity: 1,
      }));

    return [...matchedServices, ...matchedParts];
  }
}
