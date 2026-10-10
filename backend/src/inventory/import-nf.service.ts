import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { XMLParser } from 'fast-xml-parser';
import { ConfirmNFImportDto, NFImportItemDto } from './dto/inventory.dto';

type NFPreview = {
  sourceType: 'XML' | 'PDF';
  invoice: {
    number?: string;
    issueDate?: string;
    accessKey?: string;
  };
  supplier: {
    name?: string;
    document?: string;
    phone?: string;
    email?: string;
  };
  items: NFImportItemDto[];
  warnings?: string[];
};

@Injectable()
export class ImportNfService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const key =
      this.configService.get<string>('GOOGLE_API_KEY') ||
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY');

    if (key) {
      this.genAI = new GoogleGenerativeAI(key);
    }
  }

  private normalizeText(value?: string) {
    const t = value?.trim();
    return t || undefined;
  }

  private toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string') {
      const normalized = value.replace(/\./g, '').replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }

  private normalizeUnit(value?: string) {
    const unit = (value || '').trim().toLowerCase();
    if (!unit) return 'un';
    if (unit === 'pc' || unit === 'pcs') return 'un';
    return unit;
  }

  private normalizeCategory(type?: string, ncm?: string) {
    const source = `${type || ''} ${ncm || ''}`.toUpperCase();
    if (source.includes('FRE')) return 'FRE';
    if (source.includes('MOT') || source.includes('OLEO')) return 'MOT';
    if (source.includes('SUS')) return 'SUS';
    if (source.includes('ELE')) return 'ELE';
    if (source.includes('SEN')) return 'SEN';
    if (source.includes('TRA')) return 'TRA';
    return 'OUT';
  }

  private buildMetaDescription(item: NFImportItemDto) {
    const chunks: string[] = [];
    if (item.ncm) chunks.push(`NCM: ${item.ncm}`);
    if (item.origin) chunks.push(`Origem: ${item.origin}`);
    if (item.type) chunks.push(`Tipo: ${item.type}`);
    return chunks.length ? chunks.join(' | ') : '';
  }

  private parseXmlNf(xml: string): NFPreview {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseTagValue: false,
      trimValues: true,
    });

    const parsed = parser.parse(xml);
    const root = parsed?.nfeProc?.NFe || parsed?.NFe;
    const infNFe = root?.infNFe;

    if (!infNFe) {
      throw new BadRequestException('XML de NF-e inválido: bloco infNFe não encontrado.');
    }

    const ide = infNFe.ide || {};
    const emit = infNFe.emit || {};
    const detRaw = infNFe.det ? (Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det]) : [];

    const items: NFImportItemDto[] = detRaw.map((det: any) => {
      const prod = det?.prod || {};
      const icms =
        det?.imposto?.ICMS?.ICMS00 ||
        det?.imposto?.ICMS?.ICMS10 ||
        det?.imposto?.ICMS?.ICMS20 ||
        det?.imposto?.ICMS?.ICMSSN102 ||
        det?.imposto?.ICMS?.ICMSSN500 ||
        {};

      const originCode = icms?.orig;
      const originMap: Record<string, string> = {
        '0': 'Nacional',
        '1': 'Estrangeira - Importação direta',
        '2': 'Estrangeira - Mercado interno',
        '3': 'Nacional com conteúdo importado > 40%',
        '4': 'Nacional produção conforme PPB',
        '5': 'Nacional com conteúdo importado <= 40%',
        '6': 'Estrangeira - importação direta sem similar',
        '7': 'Estrangeira - mercado interno sem similar',
        '8': 'Nacional com conteúdo importado > 70%',
      };

      return {
        originalCode: this.normalizeText(prod.cProd),
        description: this.normalizeText(prod.xProd) || 'Item sem descrição',
        quantity: this.toNumber(prod.qCom, 0),
        unitPrice: this.toNumber(prod.vUnCom, 0),
        unit: this.normalizeUnit(prod.uCom),
        type: this.normalizeText(prod.CFOP),
        ncm: this.normalizeText(prod.NCM),
        origin: originMap[String(originCode)] || this.normalizeText(String(originCode || '')),
      };
    }).filter((item) => item.quantity > 0 && item.unitPrice >= 0);

    return {
      sourceType: 'XML',
      invoice: {
        number: this.normalizeText(ide.nNF),
        issueDate: this.normalizeText(ide.dhEmi || ide.dEmi),
        accessKey: this.normalizeText(String(infNFe.Id || '').replace(/^NFe/, '')),
      },
      supplier: {
        name: this.normalizeText(emit.xNome),
        document: this.normalizeText(emit.CNPJ || emit.CPF),
        phone: this.normalizeText(emit.fone),
        email: this.normalizeText(emit.email),
      },
      items,
    };
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

    throw new Error('Leitor PDF não suportado na versão atual do ambiente');
  }

  private parseModelJson(rawText: string): any {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return JSON.parse(cleaned.slice(start, end + 1));
      }
      throw new BadRequestException('Resposta inválida da IA para importação de PDF');
    }
  }

  private normalizePreviewFromAI(input: any): NFPreview {
    const safe = input && typeof input === 'object' ? input : {};
    const supplier = safe.supplier && typeof safe.supplier === 'object' ? safe.supplier : {};
    const invoice = safe.invoice && typeof safe.invoice === 'object' ? safe.invoice : {};
    const itemsRaw = Array.isArray(safe.items) ? safe.items : [];

    const items: NFImportItemDto[] = itemsRaw
      .map((item: any) => ({
        originalCode: this.normalizeText(item?.originalCode),
        description: this.normalizeText(item?.description) || 'Item sem descrição',
        quantity: this.toNumber(item?.quantity, 0),
        unitPrice: this.toNumber(item?.unitPrice, 0),
        unit: this.normalizeUnit(item?.unit),
        type: this.normalizeText(item?.type),
        ncm: this.normalizeText(item?.ncm),
        origin: this.normalizeText(item?.origin),
      }))
      .filter((item) => item.quantity > 0 && item.unitPrice >= 0);

    return {
      sourceType: 'PDF',
      supplier: {
        name: this.normalizeText(supplier.name),
        document: this.normalizeText(supplier.document),
        phone: this.normalizeText(supplier.phone),
        email: this.normalizeText(supplier.email),
      },
      invoice: {
        number: this.normalizeText(invoice.number),
        issueDate: this.normalizeText(invoice.issueDate),
        accessKey: this.normalizeText(invoice.accessKey),
      },
      items,
      warnings: Array.isArray(safe.warnings) ? safe.warnings : undefined,
    };
  }

  private async parsePdfNf(fileBuffer: Buffer): Promise<NFPreview> {
    if (!this.genAI) {
      throw new BadRequestException('Importação de PDF requer GOOGLE_API_KEY (ou GEMINI_API_KEY) no backend.');
    }

    const text = await this.extractTextFromPdf(fileBuffer);
    if (!text.trim()) {
      throw new BadRequestException('Não foi possível extrair texto do PDF para importação de NF.');
    }

    const model = this.genAI.getGenerativeModel({
      model: this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.8-flash',
    });
    const prompt = `
Voce recebe o texto de uma nota fiscal de entrada de pecas e deve responder SOMENTE com JSON valido no formato:
{
  "supplier": {"name":"", "document":"", "phone":"", "email":""},
  "invoice": {"number":"", "issueDate":"", "accessKey":""},
  "items": [
    {
      "originalCode":"",
      "description":"",
      "quantity": 0,
      "unitPrice": 0,
      "unit":"un",
      "type":"",
      "ncm":"",
      "origin":""
    }
  ],
  "warnings": []
}
Regras:
- quantity e unitPrice devem ser numericos.
- description obrigatoria em cada item.
- Se faltar dado, use string vazia ou 0.
- Nao inclua markdown.

Texto da nota fiscal:
${text}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return this.normalizePreviewFromAI(this.parseModelJson(response.text()));
  }

  async previewImport(file: Express.Multer.File): Promise<NFPreview> {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }

    const filename = (file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    if (filename.endsWith('.xml') || mime.includes('xml') || mime.includes('text/plain')) {
      return this.parseXmlNf(file.buffer.toString('utf-8'));
    }

    if (filename.endsWith('.pdf') || mime.includes('pdf')) {
      return this.parsePdfNf(file.buffer);
    }

    throw new BadRequestException('Formato não suportado. Envie um arquivo .xml ou .pdf');
  }

  async confirmImport(tenantId: string, dto: ConfirmNFImportDto) {
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('Nenhum item informado para importar');
    }

    let supplierId: string | undefined;
    const supplierName = this.normalizeText(dto.supplier?.name);
    const supplierDocument = this.normalizeText(dto.supplier?.document);

    if (supplierName || supplierDocument) {
      const existingSupplier = await this.prisma.supplier.findFirst({
        where: {
          tenantId,
          OR: [
            ...(supplierDocument ? [{ document: supplierDocument }] : []),
            ...(supplierName ? [{ name: supplierName }] : []),
          ],
        },
      });

      if (existingSupplier) {
        supplierId = existingSupplier.id;
      } else {
        const createdSupplier = await this.prisma.supplier.create({
          data: {
            tenantId,
            name: supplierName || 'Fornecedor NF Importada',
            document: supplierDocument,
            phone: this.normalizeText(dto.supplier?.phone),
            email: this.normalizeText(dto.supplier?.email),
            notes: 'Criado automaticamente via importação de NF',
          },
        });
        supplierId = createdSupplier.id;
      }
    }

    const invoiceNumber = this.normalizeText(dto.invoice?.number) || 's/n';
    const accessKey = this.normalizeText(dto.invoice?.accessKey);

    let created = 0;
    let updated = 0;
    let totalQuantity = 0;
    let totalAmount = 0;

    for (const rawItem of dto.items) {
      const item: NFImportItemDto = {
        originalCode: this.normalizeText(rawItem.originalCode),
        description: this.normalizeText(rawItem.description) || 'Item sem descrição',
        quantity: this.toNumber(rawItem.quantity, 0),
        unitPrice: this.toNumber(rawItem.unitPrice, 0),
        unit: this.normalizeUnit(rawItem.unit),
        type: this.normalizeText(rawItem.type),
        ncm: this.normalizeText(rawItem.ncm),
        origin: this.normalizeText(rawItem.origin),
      };

      if (item.quantity <= 0) {
        continue;
      }

      const code = this.normalizeText(item.originalCode);
      const existing = code
        ? await this.prisma.part.findFirst({
            where: {
              tenantId,
              OR: [{ sku: code }, { internalCode: code }],
            },
          })
        : await this.prisma.part.findFirst({
            where: { tenantId, name: item.description },
          });

      const noteParts = [
        `Entrada por NF ${invoiceNumber}`,
        accessKey ? `Chave ${accessKey}` : undefined,
        code ? `Codigo ${code}` : undefined,
      ].filter(Boolean);

      const note = noteParts.join(' | ');

      if (existing) {
        await this.prisma.$transaction([
          this.prisma.part.update({
            where: { id: existing.id },
            data: {
              supplierId: supplierId || existing.supplierId,
              costPrice: item.unitPrice > 0 ? item.unitPrice : existing.costPrice,
              unitPrice: existing.unitPrice > 0 ? existing.unitPrice : item.unitPrice,
              sku: existing.sku || code,
              internalCode: existing.internalCode || code,
              unit: existing.unit || item.unit,
              currentStock: (existing.currentStock || 0) + item.quantity,
              category: existing.category || this.normalizeCategory(item.type, item.ncm),
            },
          }),
          this.prisma.inventoryMovement.create({
            data: {
              tenantId,
              partId: existing.id,
              type: 'ENTRY',
              quantity: item.quantity,
              note,
            },
          }),
        ]);

        updated += 1;
      } else {
        const details = this.buildMetaDescription(item);
        const createdPart = await this.prisma.part.create({
          data: {
            tenantId,
            name: item.description,
            internalCode: code,
            sku: code,
            category: this.normalizeCategory(item.type, item.ncm),
            description: details || undefined,
            unitPrice: item.unitPrice,
            costPrice: item.unitPrice,
            unit: item.unit || 'un',
            minStock: 0,
            currentStock: item.quantity,
            supplierId,
            isActive: true,
          },
        });

        await this.prisma.inventoryMovement.create({
          data: {
            tenantId,
            partId: createdPart.id,
            type: 'ENTRY',
            quantity: item.quantity,
            note,
          },
        });

        created += 1;
      }

      totalQuantity += item.quantity;
      totalAmount += item.quantity * item.unitPrice;
    }

    return {
      message: 'Importação de NF concluída com sucesso',
      summary: {
        created,
        updated,
        totalItems: created + updated,
        totalQuantity,
        totalAmount,
      },
    };
  }
}
