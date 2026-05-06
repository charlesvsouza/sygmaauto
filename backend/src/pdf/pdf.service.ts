import { Injectable, InternalServerErrorException, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

interface RenderOptions {
  format?: string;
  landscape?: boolean;
}

@Injectable()
export class PdfService implements OnModuleDestroy {
  private browser: puppeteer.Browser | null = null;

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
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
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.setContent(this.ensureHtmlDocument(html), { waitUntil: 'networkidle2' });

      const pdfBuffer = await page.pdf({
        format: (options.format || 'A4') as any,
        landscape: Boolean(options.landscape),
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
      });

      await page.close();
      return pdfBuffer;
    } catch (error) {
      console.error('Erro ao renderizar PDF:', error);
      throw new InternalServerErrorException('Falha ao renderizar PDF');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
