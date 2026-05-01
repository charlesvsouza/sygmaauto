import { Injectable, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ImportService {
  private genAI: GoogleGenerativeAI;

  private readonly basePrompt = `
Você é um especialista em sistemas de gestão de oficinas mecânicas.
Sua tarefa é extrair os dados de um orçamento e formatá-los em JSON rigoroso para importação.

Retorne SOMENTE JSON válido com a estrutura:
{
  "customer": { "name": "", "document": "", "phone": "", "email": "", "address": "" },
  "vehicle": { "brand": "", "model": "", "plate": "", "year": "", "km": null, "vin": "", "color": "" },
  "items": [
    { "type": "part|service", "description": "", "quantity": 1, "unitPrice": 0, "internalCode": "" }
  ],
  "totals": { "parts": 0, "services": 0, "labor": 0, "total": 0 }
}

Regras:
1. Se não encontrar um campo, use string vazia, null ou 0.
2. No campo "type", use "part" para peça/produto e "service" para mão de obra/serviço.
3. Valores numéricos devem ser número, não string.
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
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async parseEstimatePdf(fileBuffer: Buffer) {
    try {
      if (!this.genAI) {
        throw new BadRequestException('Google API Key (GOOGLE_API_KEY) não configurada no .env');
      }

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      let text = '';
      try {
        text = await this.extractTextFromPdf(fileBuffer);
      } catch (extractError) {
        console.warn('Falha ao extrair texto com pdf-parse, seguindo com fallback multimodal:', extractError);
      }

      if (text.trim().length >= 80) {
        const parsedFromText = await this.parseWithText(model, text);
        if (this.hasMeaningfulData(parsedFromText)) {
          return parsedFromText;
        }
      }

      const parsedFromPdf = await this.parseWithPdf(model, fileBuffer);
      if (this.hasMeaningfulData(parsedFromPdf)) {
        return parsedFromPdf;
      }

      throw new Error('Não foi possível extrair dados úteis do PDF.');
    } catch (e) {
      console.error('Error parsing PDF with AI:', e);
      throw new BadRequestException('Falha ao processar orçamento: ' + (e as Error).message);
    }
  }
}
