import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { escapeHtml, pdfFooterTemplate, PDF_EMPTY_HEADER } from '../common/pdf-format';

// Campos que já chegam como HTML montado pelo serviço (com o texto escapado lá).
const RAW_HTML_KEYS = new Set(['servicesRows', 'productsRows']);

interface PDFGenerationOptions {
  format?: string;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  // Texto à esquerda do rodapé "Página X de Y" (ex.: oficina · documento).
  footerLabel?: string;
}

@Injectable()
export class PdfService {
  private browser: puppeteer.Browser | null = null;

  private resolveExecutablePath(): string | undefined {
    const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (fromEnv && fs.existsSync(fromEnv)) {
      return fromEnv;
    }

    const linuxCandidates = ['/usr/bin/chromium-browser', '/usr/bin/chromium'];
    for (const candidate of linuxCandidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  async onModuleInit() {
    // Inicializar browser na primeira requisição (lazy loading)
  }

  async generatePdfFromHtml(
    htmlContent: string,
    options: PDFGenerationOptions = {},
  ): Promise<Buffer> {
    try {
      // Garante que o browser esteja inicializado
      if (!this.browser) {
        const executablePath = this.resolveExecutablePath();
        this.browser = await puppeteer.launch({
          headless: true,
          executablePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Para ambientes com pouca memória (Railway)
          ],
        });
      }

      const page = await this.browser.newPage();

      // Configurar viewport para evitar problemas de renderização
      await page.setViewport({ width: 1024, height: 1024 });

      // Carregar HTML
      await page.setContent(htmlContent, { waitUntil: 'networkidle2' });

      // Imagens em data: URI (ex.: logo da empresa) não geram requisição de rede,
      // então 'networkidle2' pode resolver antes delas terminarem de decodificar.
      // Aguarda explicitamente o carregamento de todas as <img> antes de gerar o PDF.
      await page.evaluate(() =>
        Promise.all(
          Array.from(document.images).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((resolve) => {
                  img.addEventListener('load', resolve, { once: true });
                  img.addEventListener('error', resolve, { once: true });
                }),
          ),
        ),
      );

      // Gerar PDF
      const pdfBuffer = await page.pdf({
        format: (options.format || 'A4') as any,
        margin: options.margin || {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: PDF_EMPTY_HEADER,
        footerTemplate: pdfFooterTemplate(options.footerLabel),
      });

      await page.close();

      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('Erro ao gerar PDF com Puppeteer:', error);
      throw new InternalServerErrorException(
        'Falha ao gerar PDF',
      );
    }
  }

  async generatePdfFromTemplate(
    templatePath: string,
    data: Record<string, any>,
    options?: PDFGenerationOptions,
  ): Promise<Buffer> {
    try {
      // Ler arquivo template
      let htmlContent = fs.readFileSync(templatePath, 'utf-8');

      // Processar condicionais {{#if chave}}...{{/if}} antes das substituições
      htmlContent = htmlContent.replace(
        /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g,
        (_match, key, inner) => (data[key] ? inner : ''),
      );

      // Substituir variáveis simples. O valor é escapado (texto do cliente pode ter
      // <, & ou ") e a troca usa split/join, que não interpreta $&, $1 etc. no valor.
      Object.keys(data).forEach((key) => {
        const raw = data[key] ?? '';
        const value = RAW_HTML_KEYS.has(key) ? String(raw) : escapeHtml(raw);
        htmlContent = htmlContent.split(`{{${key}}}`).join(value);
      });

      // Limpar variáveis não usadas
      htmlContent = htmlContent.replace(/{{.*?}}/g, '');

      return this.generatePdfFromHtml(htmlContent, options);
    } catch (error) {
      console.error('Erro ao gerar PDF a partir de template:', error);
      throw new InternalServerErrorException(
        'Falha ao processar template',
      );
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }
}
