import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/tenant.decorator';
import { pdfIssuedLine } from '../common/pdf-format';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from './pdf.service';

@ApiTags('PDF')
@Controller('pdf')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('render')
  @ApiOperation({ summary: 'Renderizar HTML em PDF com Puppeteer' })
  async render(
    @Body()
    body: {
      html: string;
      fileName?: string;
      landscape?: boolean;
      format?: string;
      // Título do documento, usado no rodapé ("Oficina · Título").
      title?: string;
      footerLabel?: string;
    },
    @CurrentUser() user: { userId?: string; tenantId?: string },
    @Res() res: any,
  ) {
    const fileName = String(body?.fileName || 'documento.pdf').replace(/[\/:*?"<>|]+/g, '_');

    // "Emitido em … por …" é carimbado aqui: hora do servidor no fuso de Brasília
    // e nome de quem está autenticado, não o que a tela mandar.
    const issuer = user?.userId
      ? await this.prisma.user.findUnique({
          where: { id: user.userId },
          select: { name: true, tenant: { select: { name: true, tradeName: true } } },
        })
      : null;
    const companyName = issuer?.tenant?.name || issuer?.tenant?.tradeName || '';
    const footerLabel =
      body?.footerLabel ?? [companyName, body?.title].filter(Boolean).join(' · ');

    const pdf = await this.pdfService.renderHtml(body?.html || '', {
      landscape: Boolean(body?.landscape),
      format: body?.format || 'A4',
      footerLabel,
      footerIssued: pdfIssuedLine(issuer?.name),
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`}"`,
      'Content-Length': pdf.length,
    });

    res.end(pdf);
  }
}
