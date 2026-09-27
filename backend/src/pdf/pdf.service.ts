import { Injectable, InternalServerErrorException, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import { escapeHtml, pdfFooterTemplate, PDF_EMPTY_HEADER } from '../common/pdf-format';

export interface RenderOptions {
  format?: string;
  landscape?: boolean;
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  // Rodapé de toda folha: "<footerLabel> · <footerIssued> · Página X de Y".
  footerLabel?: string;
  footerIssued?: string;
}

// Campos do template que já chegam como HTML montado (com o texto escapado na origem).
const RAW_HTML_KEYS = new Set(['servicesRows', 'productsRows']);

// Serviço único de PDF do sistema: um só navegador Puppeteer, mesmas margens e o
// mesmo rodapé paginado para O.S., relatórios e documentos.
@Injectable()
export class PdfService implements OnModuleDestroy {
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

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser || !this.browser.connected) {
      const executablePath = this.resolveExecutablePath();
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    }
    return this.browser;
  }

  private ensureHtmlDocument(html: string): string {
    const normalized = String(html || '').trim();
    if (!normalized) {
      return '<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body></body></html>';
    }
    if (/<!doctype html>|<html[\s>]/i.test(normalized)) {
      return normalized;
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${normalized}</body></html>`;
  }

  async renderHtml(html: string, options: RenderOptions = {}): Promise<Buffer> {
    let page: puppeteer.Page | null = null;
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.setContent(this.ensureHtmlDocument(html), { waitUntil: 'networkidle2' });

      // Imagens em data: URI (ex.: logo da empresa) não geram requisição de rede,
      // então 'networkidle2' pode resolver antes delas terminarem de decodificar.
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

      const pdfBuffer = await page.pdf({
        format: (options.format || 'A4') as any,
        landscape: Boolean(options.landscape),
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: PDF_EMPTY_HEADER,
        footerTemplate: pdfFooterTemplate(options.footerLabel, options.footerIssued),
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
          ...options.margin,
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('Erro ao renderizar PDF:', error);
      throw new InternalServerErrorException('Falha ao renderizar PDF');
    } finally {
      await page?.close().catch(() => undefined);
    }
  }

  // Preenche um template HTML com {{campo}} e {{#if campo}}...{{/if}} e renderiza.
  async renderTemplate(
    templatePath: string,
    data: Record<string, any>,
    options?: RenderOptions,
  ): Promise<Buffer> {
    let htmlContent: string;
    try {
      htmlContent = fs.readFileSync(templatePath, 'utf-8');
    } catch (error) {
      console.error('Erro ao ler template de PDF:', error);
      throw new InternalServerErrorException('Falha ao processar template');
    }

    // Condicionais antes das substituições
    htmlContent = htmlContent.replace(
      /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g,
      (_match, key, inner) => (data[key] ? inner : ''),
    );

    // O valor é escapado (texto do cliente pode ter <, & ou ") e a troca usa
    // split/join, que não interpreta $&, $1 etc. no valor.
    Object.keys(data).forEach((key) => {
      const raw = data[key] ?? '';
      const value = RAW_HTML_KEYS.has(key) ? String(raw) : escapeHtml(raw);
      htmlContent = htmlContent.split(`{{${key}}}`).join(value);
    });

    // Limpar variáveis não usadas
    htmlContent = htmlContent.replace(/{{.*?}}/g, '');

    return this.renderHtml(htmlContent, options);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
