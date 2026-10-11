import { Injectable, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ImportService {
  private genAI: GoogleGenerativeAI;
  private configuredApiKeyName: string | null = null;

  private readonly basePrompt = `
Você é um analista experiente de oficina mecânica. Vai receber um orçamento ou ordem de serviço feito por OUTRO sistema ou oficina.
Leia o documento inteiro, ENTENDA o que cada informação significa e coloque cada uma no campo correto do nosso sistema.
Não copie o documento cegamente: interprete, classifique e separe.

Retorne SOMENTE um JSON válido com esta estrutura:
{
  "customer": { "name": "", "document": "", "rg": "", "phone": "", "email": "", "address": "", "cep": "", "cidade": "", "estado": "" },
  "vehicle": { "brand": "", "model": "", "plate": "", "year": "", "km": null, "vin": "", "color": "" },
  "equipment": { "brand": "", "model": "", "serialNumber": "" },
  "complaint": "",
  "diagnosis": "",
  "technicalReport": "",
  "observations": "",
  "notes": "",
  "paymentMethod": "",
  "scheduledDate": "",
  "items": [
    { "type": "part|service", "description": "", "quantity": 1, "unitPrice": 0, "discount": 0, "internalCode": "" }
  ],
  "totals": { "parts": 0, "services": 0, "labor": 0, "discount": 0, "total": 0 }
}

Significado de cada campo (coloque cada informação SOMENTE no campo certo, sem repetir em dois):
- customer: dados do cliente/proprietário. "document" = CPF ou CNPJ. "estado" = sigla da UF. Endereço sem cidade/UF/CEP em "address".
- vehicle: dados do veículo. "plate" = placa. "km" = quilometragem do veículo como número inteiro (sem pontos). "year" = ano.
- equipment: SOMENTE se o documento tratar de um equipamento que não é um carro (motor avulso, câmbio, máquina etc.); caso contrário, deixe vazio.
- complaint: o que o cliente RELATOU / defeito reclamado / motivo da visita (ex.: "barulho na suspensão ao virar").
- diagnosis: o que o mecânico CONSTATOU / causa identificada / parecer de diagnóstico.
- technicalReport: laudo técnico detalhado, medições, testes, procedimentos executados, se houver.
- observations: SUGESTÕES e RECOMENDAÇÕES ao cliente (itens a trocar no futuro, serviços adicionais recomendados, alertas de segurança, próximas revisões). Uma por linha.
- notes: informações administrativas e comerciais: garantia, validade do orçamento, prazos, condições, avisos legais, observações gerais que não sejam sugestão técnica.
- paymentMethod: forma de pagamento citada, normalizada para um destes valores exatos: "PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Boleto", "Transferência Bancária", "Cheque". Se houver parcelamento (ex.: 3x no cartão), mantenha o método aqui e registre as parcelas em "notes". Vazio se não houver.
- scheduledDate: data prevista/agendada em formato AAAA-MM-DD, vazio se não houver.
- items: CADA linha de peça, produto, serviço ou mão de obra. "type": "part" para peça/produto/insumo/fluido; "service" para serviço, mão de obra, revisão, diagnóstico. "description" = nome limpo do item (sem o código dentro). "internalCode" = código/referência da peça, se houver. "quantity" = quantidade. "unitPrice" = preço UNITÁRIO (se o documento só traz o total da linha, divida pela quantidade). "discount" = desconto em R$ naquela linha (0 se não houver).
- totals: valores totais do documento. "discount" = desconto total em R$.

Regras:
1. Se não encontrar um campo, use string vazia, null ou 0. NUNCA invente dados que não estejam no documento.
2. Valores numéricos devem ser número (ponto decimal), não string. Converta "1.234,56" para 1234.56.
3. Se uma mesma informação aparece em mais de um lugar, use-a uma vez no campo mais adequado.
4. Não inclua markdown, explicações nem texto fora do JSON.
`;

  private isNodeVersionAtLeast(minMajor: number, minMinor: number): boolean {
    const [majorStr, minorStr] = process.versions.node.split('.');
    const major = Number(majorStr);
    const minor = Number(minorStr);

    if (!Number.isFinite(major) || !Number.isFinite(minor)) {
      return false;
    }

    if (major > minMajor) {
      return true;
    }

    if (major < minMajor) {
      return false;
    }

    return minor >= minMinor;
  }

  private async extractTextFromPdf(fileBuffer: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfModule = require('pdf-parse');

    if (typeof pdfModule === 'function') {
      const data = await pdfModule(fileBuffer);
      return data?.text ?? '';
    }

    if (typeof pdfModule?.default === 'function') {
      const data = await pdfModule.default(fileBuffer);
      return data?.text ?? '';
    }

    if (typeof pdfModule?.PDFParse === 'function') {
      if (!this.isNodeVersionAtLeast(20, 16)) {
        throw new Error(
          `O pdf-parse@2.x requer Node >= 20.16.0 para a API PDFParse. Versão atual: ${process.versions.node}`,
        );
      }

      const parser = new pdfModule.PDFParse({ data: fileBuffer });
      try {
        const result = await parser.getText();
        return result?.text ?? '';
      } finally {
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      }
    }

    throw new Error(
      `Formato de export do pdf-parse não suportado. Chaves encontradas: ${Object.keys(pdfModule || {}).join(', ') || 'nenhuma'}. Versão do Node: ${process.versions.node}`,
    );
  }

  private parseModelJson(rawText: string): any {
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');

      if (start >= 0 && end > start) {
        const jsonSlice = cleaned.slice(start, end + 1);
        return JSON.parse(jsonSlice);
      }

      throw new Error('A IA não retornou um JSON válido.');
    }
  }

  private hasMeaningfulData(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) && value > 0;
    }

    if (Array.isArray(value)) {
      return value.some((entry) => this.hasMeaningfulData(entry));
    }

    if (typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).some((entry) => this.hasMeaningfulData(entry));
    }

    return false;
  }

  private toText(value: unknown): string {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean).join('\n');
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeResult(input: any): any {
    const safe = input && typeof input === 'object' ? input : {};
    const customer = safe.customer && typeof safe.customer === 'object' ? safe.customer : {};
    const vehicle = safe.vehicle && typeof safe.vehicle === 'object' ? safe.vehicle : {};
    const totals = safe.totals && typeof safe.totals === 'object' ? safe.totals : {};
    const items = Array.isArray(safe.items) ? safe.items : [];

    const num = (v: unknown): number => {
      if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
      if (typeof v === 'string') {
        const n = Number(v.replace(/\./g, '').replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };
    const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
    const equipment = safe.equipment && typeof safe.equipment === 'object' ? safe.equipment : {};
    const km = num(vehicle.km);
    const methods = ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Boleto', 'Transferência Bancária', 'Cheque'];
    const rawMethod = str(safe.paymentMethod);
    const paymentMethod = methods.find((m) => m.toLowerCase() === rawMethod.toLowerCase()) ?? '';
    const scheduled = str(safe.scheduledDate);

    return {
      customer: {
        name: str(customer.name),
        document: str(customer.document),
        rg: str(customer.rg),
        phone: str(customer.phone),
        email: str(customer.email),
        address: str(customer.address),
        cep: str(customer.cep),
        cidade: str(customer.cidade),
        estado: str(customer.estado),
      },
      vehicle: {
        brand: str(vehicle.brand),
        model: str(vehicle.model),
        plate: str(vehicle.plate),
        year: str(vehicle.year),
        km: km > 0 ? Math.round(km) : null,
        vin: str(vehicle.vin),
        color: str(vehicle.color),
      },
      equipment: {
        brand: str(equipment.brand),
        model: str(equipment.model),
        serialNumber: str(equipment.serialNumber),
      },
      complaint: this.toText(safe.complaint),
      diagnosis: this.toText(safe.diagnosis),
      technicalReport: this.toText(safe.technicalReport),
      observations: this.toText(safe.observations),
      notes: this.toText(safe.notes),
      paymentMethod,
      scheduledDate: /^\d{4}-\d{2}-\d{2}$/.test(scheduled) ? scheduled : '',
      items: items.map((item: any) => {
        const quantity = num(item?.quantity);
        return {
          type: item?.type === 'part' ? 'part' : 'service',
          description: str(item?.description),
          quantity: quantity > 0 ? quantity : 1,
          unitPrice: num(item?.unitPrice),
          discount: num(item?.discount),
          internalCode: str(item?.internalCode),
        };
      }),
      totals: {
        parts: num(totals.parts),
        services: num(totals.services),
        labor: num(totals.labor),
        discount: num(totals.discount),
        total: num(totals.total),
      },
    };
  }

  private async parseWithText(model: any, text: string): Promise<any> {
    const prompt = `${this.basePrompt}\n\nTexto extraído do PDF:\n${text}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return this.parseModelJson(response.text());
  }

  private async parseWithPdf(model: any, fileBuffer: Buffer): Promise<any> {
    const pdfBase64 = fileBuffer.toString('base64');

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: this.basePrompt },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: pdfBase64,
              },
            },
          ],
        },
      ],
    });

    const response = await result.response;
    return this.parseModelJson(response.text());
  }

  constructor(private configService: ConfigService) {
    const keyCandidates = [
      'GOOGLE_API_KEY',
      'GEMINI_API_KEY',
      'GOOGLE_GENERATIVE_AI_API_KEY',
    ] as const;

    let apiKey: string | undefined;
    for (const keyName of keyCandidates) {
      const value = this.configService.get<string>(keyName);
      if (value && value.trim().length > 0) {
        apiKey = value.trim();
        this.configuredApiKeyName = keyName;
        break;
      }
    }

    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async parseEstimatePdf(fileBuffer: Buffer) {
    try {
      if (!this.genAI) {
        throw new BadRequestException(
          'Chave da IA não configurada no ambiente. Defina GOOGLE_API_KEY, GEMINI_API_KEY ou GOOGLE_GENERATIVE_AI_API_KEY no Railway.',
        );
      }

      if (this.configuredApiKeyName) {
        console.log(`ImportService: usando chave de IA via ${this.configuredApiKeyName}`);
      }

      const model = this.genAI.getGenerativeModel({
        model: this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.8-flash',
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      });
      let bestEffortResult: any = null;
      const warnings: string[] = [];
      let text = '';
      try {
        text = await this.extractTextFromPdf(fileBuffer);
      } catch (extractError) {
        console.warn('Falha ao extrair texto com pdf-parse, seguindo com fallback multimodal:', extractError);
      }

      if (text.trim().length >= 80) {
        const parsedFromText = await this.parseWithText(model, text);
        bestEffortResult = this.normalizeResult(parsedFromText);
        if (this.hasMeaningfulData(parsedFromText)) {
          return bestEffortResult;
        }

        warnings.push('Texto do PDF lido, mas com poucos dados reconhecidos automaticamente.');
      }

      const parsedFromPdf = await this.parseWithPdf(model, fileBuffer);
      const normalizedPdf = this.normalizeResult(parsedFromPdf);
      if (this.hasMeaningfulData(parsedFromPdf)) {
        return normalizedPdf;
      }

      bestEffortResult = normalizedPdf;
      warnings.push('Análise automática concluiu com poucos campos preenchidos; revise e complete manualmente.');

      if (bestEffortResult) {
        return {
          ...bestEffortResult,
          _warnings: warnings,
        };
      }

      throw new Error('Não foi possível extrair dados úteis do PDF.');
    } catch (e) {
      console.error('Error parsing PDF with AI:', e);
      if (e instanceof BadRequestException) throw e;

      const message = (e as Error).message ?? '';
      if (/\b402\b|Payment Required|credits are depleted/i.test(message)) {
        throw new BadRequestException(
          'A leitura automática de orçamentos está indisponível no momento (créditos da IA esgotados). Cadastre o orçamento manualmente ou tente novamente mais tarde.',
        );
      }
      if (/\b429\b|quota|Too Many Requests/i.test(message)) {
        throw new BadRequestException(
          'A IA atingiu o limite de uso. Aguarde alguns minutos e tente novamente.',
        );
      }
      throw new BadRequestException('Falha ao processar orçamento: ' + message);
    }
  }
}
