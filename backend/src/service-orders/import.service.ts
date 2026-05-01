import { Injectable, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ImportService {
  private genAI: GoogleGenerativeAI;

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

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async parseEstimatePdf(fileBuffer: Buffer) {
    try {
      const text = await this.extractTextFromPdf(fileBuffer);

      if (!this.genAI) {
        throw new BadRequestException('Google API Key (GOOGLE_API_KEY) não configurada no .env');
      }

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `
        Você é um especialista em sistemas de gestão de oficinas mecânicas.
        Abaixo está o texto extraído de um PDF de orçamento de terceiros.
        Sua tarefa é extrair os dados e formatá-los em um JSON rigoroso para que possamos importar para nosso sistema.

        Campos necessários:
        - customer: { name: string, document: string (CPF/CNPJ), phone: string, email: string, address: string }
        - vehicle: { brand: string, model: string, plate: string, year: string, km: number, vin: string, color: string }
        - items: Array of { type: 'part' | 'service', description: string, quantity: number, unitPrice: number, internalCode: string }
        - totals: { parts: number, services: number, labor: number, total: number }

        Regras:
        1. Se não encontrar um campo, deixe nulo ou string vazia.
        2. No campo "type" de itens, use 'part' para peças/produtos e 'service' para mão de obra ou serviços.
        3. Certifique-se de que os valores numéricos sejam números, não strings.
        4. No campo "plate", formate como ABC1D23 ou ABC-1234 conforme encontrado.
        5. O JSON deve ser o único conteúdo da sua resposta. Não inclua markdown.

        Texto do PDF:
        ${text}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonStr = response.text().replace(/```json|```/g, '').trim();
      
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Error parsing PDF with AI:', e);
      throw new BadRequestException('Falha ao processar orçamento: ' + e.message);
    }
  }
}
