import { Injectable, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdf = require('pdf-parse');

@Injectable()
export class ImportService {
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async parseEstimatePdf(fileBuffer: Buffer) {
    try {
      // Tenta chamar como função direta ou via .default (compatibilidade CJS/ESM)
      const parse = typeof pdf === 'function' ? pdf : pdf.default;
      if (typeof parse !== 'function') {
        throw new Error('Biblioteca pdf-parse não foi carregada corretamente como função.');
      }
      
      const data = await parse(fileBuffer);
      const text = data.text;

      if (!this.genAI) {
        throw new BadRequestException('Google API Key (GOOGLE_API_KEY) não configurada no .env');
      }

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
