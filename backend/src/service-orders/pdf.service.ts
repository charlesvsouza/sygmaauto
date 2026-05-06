import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

interface PDFGenerationOptions {
  format?: string;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
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

      // Fazer replace de variáveis simples
      Object.keys(data).forEach((key) => {
        const value = data[key] || '';
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlContent = htmlContent.replace(regex, String(value));
      });

      // Substituir variáveis de linhas (servicesRows, productsRows)
      if (data.servicesRows) {
        htmlContent = htmlContent.replace(
          '{{servicesRows}}',
          data.servicesRows,
        );
      } else {
        htmlContent = htmlContent.replace('{{servicesRows}}', '');
      }

      if (data.productsRows) {
        htmlContent = htmlContent.replace(
          '{{productsRows}}',
          data.productsRows,
        );
      } else {
        htmlContent = htmlContent.replace('{{productsRows}}', '');
      }

      // Limpar variáveis não usadas
      htmlContent = htmlContent.replace(/{{.*?}}/g, '');
      htmlContent = htmlContent.replace(/{{#if.*?}}.*?{{\/if}}/gs, '');

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
