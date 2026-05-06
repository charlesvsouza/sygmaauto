import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PdfService } from './pdf.service';

@ApiTags('PDF')
@Controller('pdf')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('render')
  @ApiOperation({ summary: 'Renderizar HTML em PDF com Puppeteer' })
  async render(
    @Body()
    body: {
      html: string;
      fileName?: string;
      landscape?: boolean;
      format?: string;
    },
    @Res() res: any,
  ) {
    const fileName = String(body?.fileName || 'documento.pdf').replace(/[\\/:*?"<>|]+/g, '_');
    const pdf = await this.pdfService.renderHtml(body?.html || '', {
      landscape: Boolean(body?.landscape),
      format: body?.format || 'A4',
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`}"`,
      'Content-Length': pdf.length,
    });

    res.end(pdf);
  }
}
