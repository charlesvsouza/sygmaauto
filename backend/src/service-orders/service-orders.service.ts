import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceOrderDto, CreateOrcamentoDto, UpdateOrcamentoDto, UpdateStatusDto, AprovarOrcamentoDto, FinalizeOrderDto, CreateOrUpdateItemDto, UpdateServiceOrderItemDto, SaveMetrologyDto } from './dto/service-order.dto';
import { v4 as uuidv4 } from 'uuid';
import { WhatsappService } from '../notifications/whatsapp.service';
import { CommissionsService } from '../commissions/commissions.service';
import { formatOrderCode, nextOrderNumber } from '../common/order-number';
import { resolveDocumentSettings } from '../common/document-settings';
import { canMoveToStatus } from '../common/roles';

// Status em que o orçamento espera a resposta do cliente (oficina e retífica).
const AWAITING_APPROVAL = ['AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO_RETIFICA'];

@Injectable()
export class ServiceOrdersService {
  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService,
    private commissions: CommissionsService,
  ) {}

  // Fluxo de status da O.S.: ABERTA → diagnóstico → orçamento → aprovação → execução → entrega
  private readonly STATUS_FLOW: Record<string, string[]> = {
    ABERTA:               ['EM_DIAGNOSTICO', 'CANCELADO'],
    EM_DIAGNOSTICO:       ['ORCAMENTO_PRONTO', 'CANCELADO'],
    ORCAMENTO_PRONTO:     ['AGUARDANDO_APROVACAO', 'CANCELADO'],
    AGUARDANDO_APROVACAO: ['APROVADO', 'REPROVADO', 'CANCELADO'],
    APROVADO:             ['AGUARDANDO_PECAS', 'EM_EXECUCAO', 'CANCELADO'],
    REPROVADO:            ['CANCELADO'],
    AGUARDANDO_PECAS:     ['EM_EXECUCAO', 'CANCELADO'],
    EM_EXECUCAO:          ['PRONTO_ENTREGA', 'CANCELADO'],
    PRONTO_ENTREGA:       ['FATURADO', 'CANCELADO'],
    FATURADO:             ['ENTREGUE'],
    ENTREGUE:             [],
    CANCELADO:            [],
    // Compatibilidade retroativa: registros antigos com status ORCAMENTO
    ORCAMENTO:            ['EM_DIAGNOSTICO', 'ORCAMENTO_PRONTO', 'AGUARDANDO_APROVACAO', 'CANCELADO'],
  };

  private readonly RETIFICA_STATUS_FLOW: Record<string, string[]> = {
    ABERTA:                        ['DESMONTAGEM', 'CANCELADO'],
    DESMONTAGEM:                   ['METROLOGIA', 'CANCELADO'],
    METROLOGIA:                    ['ORCAMENTO_RETIFICA', 'CANCELADO'],
    ORCAMENTO_RETIFICA:            ['AGUARDANDO_APROVACAO_RETIFICA', 'CANCELADO'],
    AGUARDANDO_APROVACAO_RETIFICA: ['APROVADO', 'REPROVADO', 'CANCELADO'],
    APROVADO:                      ['EM_RETIFICA', 'MONTAGEM', 'CANCELADO'],
    REPROVADO:                     ['CANCELADO'],
    EM_RETIFICA:                   ['MONTAGEM', 'CANCELADO'],
    MONTAGEM:                      ['TESTE_FINAL', 'CANCELADO'],
    TESTE_FINAL:                   ['PRONTO_ENTREGA', 'CANCELADO'],
    PRONTO_ENTREGA:                ['FATURADO', 'CANCELADO'],
    FATURADO:                      ['ENTREGUE'],
    ENTREGUE:                      [],
    CANCELADO:                     [],
  };

  private getStatusFlow(orderType?: string | null) {
    return orderType === 'RETIFICA_MOTOR' ? this.RETIFICA_STATUS_FLOW : this.STATUS_FLOW;
  }

  private toStockQuantity(value: number) {
    const parsed = Math.trunc(Number(value));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException('Quantidade de peça inválida para movimentação de estoque');
    }
    return parsed;
  }

  private async ensureStockPrivilege(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (!['MASTER', 'ADMIN', 'MECANICO', 'PRODUTIVO'].includes(user.role)) {
      throw new ForbiddenException('Somente MASTER, ADMIN e MECANICO podem alterar estoque');
    }
  }

  private async ensureDiscountWithinLimit(
    tenantId: string,
    userId: string,
    itemType: 'service' | 'part' | 'labor',
    unitPrice: number,
    quantity: number,
    discount: number,
  ) {
    if (!discount || discount <= 0) return;

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Somente GERENTE tem teto de desconto; MASTER, ADMIN e demais roles com acesso a itens não têm limite
    if (user.role !== 'GERENTE') return;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { maxDiscountPercentParts: true, maxDiscountPercentServices: true },
    });

    const base = unitPrice * quantity;
    const limit = itemType === 'part'
      ? (tenant?.maxDiscountPercentParts ?? 0)
      : (tenant?.maxDiscountPercentServices ?? 0); // 'service' e 'labor' usam o mesmo teto

    if (base <= 0) {
      throw new ForbiddenException('Não é possível aplicar desconto sem um valor unitário/quantidade válidos.');
    }

    const discountPercent = (discount / base) * 100;
    if (discountPercent > limit + 1e-6) {
      const label = itemType === 'part' ? 'peças' : 'serviços';
      throw new ForbiddenException(
        `Desconto de ${discountPercent.toFixed(2)}% excede o limite de ${limit}% permitido para o seu perfil em ${label}.`,
      );
    }
  }

  private async applyStockMovement(
    tenantId: string,
    partId: string,
    type: 'ENTRY' | 'EXIT',
    quantity: number,
    note?: string,
  ) {
    const safeQty = this.toStockQuantity(quantity);

    await this.prisma.$transaction(async (tx) => {
      const part = await tx.part.findFirst({
        where: { id: partId, tenantId, isActive: true },
        select: { id: true, currentStock: true },
      });

      if (!part) {
        throw new NotFoundException('Peça não encontrada');
      }

      const delta = type === 'ENTRY' ? safeQty : -safeQty;
      const nextStock = (part.currentStock ?? 0) + delta;

      if (nextStock < 0) {
        throw new BadRequestException('Estoque insuficiente para esta operação');
      }

      await tx.inventoryMovement.create({
        data: {
          tenantId,
          partId,
          type,
          quantity: safeQty,
          note,
        },
      });

      await tx.part.update({
        where: { id: partId },
        data: { currentStock: nextStock },
      });
    });
  }


  async findAll(tenantId: string, status?: string, orderType?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;

    return this.prisma.serviceOrder.findMany({
      where,
      include: {
        customer: true,
        vehicle: true,
        items: {
          include: {
            service: true,
            part: true,
            assignedUser: { select: { id: true, name: true, role: true } },
          },
        },
        metrology: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        vehicle: true,
        items: {
          include: {
            service: true,
            part: true,
            assignedUser: { select: { id: true, name: true, role: true } },
          },
        },
        timeline: { orderBy: { createdAt: 'desc' } },
        metrology: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Ordem não encontrada');
    }

    return order;
  }

  async getMetrology(tenantId: string, id: string) {
    await this.findById(tenantId, id); // valida que a OS pertence ao tenant
    return this.prisma.engineMetrology.findUnique({ where: { serviceOrderId: id } });
  }

  async saveMetrology(tenantId: string, id: string, dto: SaveMetrologyDto) {
    await this.findById(tenantId, id); // valida que a OS pertence ao tenant

    const data: any = {
      empenamentoCabecote: dto.empenamentoCabecote,
      empenamentoBloco: dto.empenamentoBloco,
      numeroCilindros: dto.numeroCilindros ?? 0,
      cilindros: dto.cilindros ?? [],
      numeroMunhoes: dto.numeroMunhoes ?? 0,
      munhoes: dto.munhoes ?? [],
      numeroMoentes: dto.numeroMoentes ?? 0,
      moentes: dto.moentes ?? [],
      numeroMancais: dto.numeroMancais ?? 0,
      mancaisBloco: dto.mancaisBloco ?? [],
      numeroBielas: dto.numeroBielas ?? 0,
      bielas: dto.bielas ?? [],
      observacoes: dto.observacoes,
      tecnico: dto.tecnico,
      dataLeitura: dto.dataLeitura,
    };

    return this.prisma.engineMetrology.upsert({
      where: { serviceOrderId: id },
      update: data,
      create: { ...data, tenantId, serviceOrderId: id },
    });
  }

  async createOrcamento(tenantId: string, dto: CreateOrcamentoDto, userId: string) {
    // Valida cliente e, quando informado, o veículo
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, tenantId } });
      if (!vehicle) throw new NotFoundException('Veículo não encontrado');
    }

    const requestedOrderType = (dto as CreateServiceOrderDto).orderType;
    if (requestedOrderType === 'RETIFICA_MOTOR' && !dto.vehicleId) {
      const hasMotorIdentification = Boolean(dto.equipmentBrand || dto.equipmentModel || dto.serialNumber || dto.complaint);
      if (!hasMotorIdentification) {
        throw new BadRequestException('Para retífica com motor avulso, informe ao menos marca/modelo, número de série ou descrição do problema');
      }
    }

    const approvalToken = uuidv4();
    const approvalTokenExpires = new Date();
    approvalTokenExpires.setDate(approvalTokenExpires.getDate() + 7);

    // Processa itens
    let totalParts = 0, totalServices = 0, totalLabor = 0;
    const itemsData: any[] = [];
    for (const item of dto.items || []) {
      const qty = item.quantity || 1;
      const unitPrice = item.unitPrice || 0;
      const discount = item.discount || 0;
      const total = (unitPrice * qty) - discount;

      if (item.type === 'part') totalParts += total;
      else if (item.type === 'service') totalServices += total;
      else totalLabor += total;

      itemsData.push({
        serviceId: item.serviceId,
        partId: item.partId,
        description: item.description,
        quantity: qty,
        unitPrice,
        discount,
        totalPrice: total,
        type: item.type,
        applied: false,
      });
    }

    const order = await this.prisma.$transaction(async (tx) => tx.serviceOrder.create({
      data: {
        tenantId,
        number: await nextOrderNumber(tx, tenantId),
        customerId: dto.customerId,
        vehicleId: dto.vehicleId || undefined,
        orderType: requestedOrderType === 'RETIFICA_MOTOR' ? 'RETIFICA_MOTOR' : 'ORCAMENTO',
        status: 'ABERTA',
        statusChangedAt: new Date(),
        notes: dto.notes,
        observations: dto.observations,
        complaint: dto.complaint,
        equipmentBrand: dto.equipmentBrand,
        equipmentModel: dto.equipmentModel,
        serialNumber: dto.serialNumber,
        reserveStock: Boolean(dto.reserveStock),
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,

        totalParts,
        totalServices,
        totalLabor,
        totalCost: totalParts + totalServices + totalLabor,
        items: { create: itemsData },
      },
      include: {
        customer: true,
        vehicle: true,
        items: true,
      },
    }));

    await this.createTimeline(order.id, 'ABERTA', 'O.S. aberta', userId);

    return order;
  }

  async createServiceOrder(tenantId: string, dto: CreateServiceOrderDto, userId: string) {
    // Sempre cria como ABERTA — o tipo (ORCAMENTO/ORDEM_SERVICO) define a natureza do documento,
    // mas o fluxo de status começa sempre em ABERTA para seguir as etapas normalmente.
    const baseOrder = await this.createOrcamento(tenantId, dto, userId);

    if (dto.orderType === 'ORDEM_SERVICO' || dto.orderType === 'RETIFICA_MOTOR') {
      return this.prisma.serviceOrder.update({
        where: { id: baseOrder.id },
        data: {
          orderType: dto.orderType,
          // status permanece ABERTA — segue o fluxo normal de aprovação e execução
        },
        include: {
          customer: true,
          vehicle: true,
          items: true,
        },
      });
    }

    return baseOrder;
  }

  async updateOrcamento(tenantId: string, id: string, dto: UpdateOrcamentoDto, userId: string) {
    const order = await this.findById(tenantId, id);

    if (['ENTREGUE', 'CANCELADO'].includes(order.status)) {
      throw new BadRequestException('Não é possível editar uma OS finalizada ou cancelada');
    }

    const effectivePaymentMethod = dto.paymentMethod !== undefined ? dto.paymentMethod : order.paymentMethod;
    const finalDiscountPartsPercent = dto.discountPartsPercent !== undefined ? dto.discountPartsPercent : (order.discountPartsPercent || 0);
    const finalDiscountServicesPercent = dto.discountServicesPercent !== undefined ? dto.discountServicesPercent : (order.discountServicesPercent || 0);
    // Só considera "tocado" se o valor enviado realmente difere do que já está salvo — evita
    // que um simples "Salvar alterações" (que sempre envia esses 2 campos do form) dispare a
    // validação de permissão de desconto para quem só está editando outros campos da O.S.
    const discountFieldsTouched =
      (dto.discountPartsPercent !== undefined && dto.discountPartsPercent !== (order.discountPartsPercent || 0)) ||
      (dto.discountServicesPercent !== undefined && dto.discountServicesPercent !== (order.discountServicesPercent || 0));

    if ((finalDiscountPartsPercent > 0 || finalDiscountServicesPercent > 0) && effectivePaymentMethod === 'A Prazo / Parcelado') {
      throw new BadRequestException('Desconto não é válido para pagamento a prazo parcelado.');
    }

    if (discountFieldsTouched) {
      await this.ensureCanGrantOrderDiscount(tenantId, userId, finalDiscountPartsPercent, finalDiscountServicesPercent);
    }

    const updateData: any = {
      complaint: dto.complaint,
      diagnosis: dto.diagnosis,
      technicalReport: dto.technicalReport,
      observations: dto.observations,
      equipmentBrand: dto.equipmentBrand,
      equipmentModel: dto.equipmentModel,
      serialNumber: dto.serialNumber,
      notes: dto.notes,
      paymentMethod: dto.paymentMethod,
    };

    if (typeof dto.reserveStock === 'boolean') {
      updateData.reserveStock = dto.reserveStock;
    }

    if (dto.scheduledDate !== undefined) {
      updateData.scheduledDate = dto.scheduledDate ? new Date(dto.scheduledDate) : null;
    }

    if (discountFieldsTouched) {
      updateData.discountPartsPercent = finalDiscountPartsPercent;
      updateData.discountServicesPercent = finalDiscountServicesPercent;

      // Preserva qualquer desconto pré-existente que não venha do % (ex.: crédito de diagnóstico na aprovação)
      const oldPartsDiscount = order.totalParts * ((order.discountPartsPercent || 0) / 100);
      const oldServicesDiscount = (order.totalServices + order.totalLabor) * ((order.discountServicesPercent || 0) / 100);
      const otherDiscount = Math.max(0, order.totalDiscount - oldPartsDiscount - oldServicesDiscount);

      const newPartsDiscount = order.totalParts * (finalDiscountPartsPercent / 100);
      const newServicesDiscount = (order.totalServices + order.totalLabor) * (finalDiscountServicesPercent / 100);

      updateData.totalDiscount = otherDiscount + newPartsDiscount + newServicesDiscount;
      updateData.totalCost = (order.totalParts + order.totalServices + order.totalLabor) - updateData.totalDiscount;
    }

    return this.prisma.serviceOrder.update({
      where: { id },
      data: updateData,

      include: {
        customer: true,
        vehicle: true,
        items: {
          include: {
          },
        },
      },
    });
  }

  private async ensureCanGrantOrderDiscount(
    tenantId: string,
    userId: string,
    partsPercent: number,
    servicesPercent: number,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (!['MASTER', 'ADMIN', 'GERENTE'].includes(user.role)) {
      throw new ForbiddenException('Seu perfil não pode conceder desconto nesta O.S.');
    }

    // MASTER e ADMIN não têm teto; só GERENTE é limitado pela configuração do tenant
    if (user.role !== 'GERENTE') return;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { maxDiscountPercentParts: true, maxDiscountPercentServices: true },
    });

    const limitParts = tenant?.maxDiscountPercentParts ?? 0;
    const limitServices = tenant?.maxDiscountPercentServices ?? 0;

    if (partsPercent > limitParts + 1e-6) {
      throw new ForbiddenException(
        `Desconto de ${partsPercent}% em peças excede o limite de ${limitParts}% permitido para o seu perfil.`,
      );
    }
    if (servicesPercent > limitServices + 1e-6) {
      throw new ForbiddenException(
        `Desconto de ${servicesPercent}% em serviços excede o limite de ${limitServices}% permitido para o seu perfil.`,
      );
    }
  }

  async requestApproval(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);

    if (!['ABERTA', 'EM_DIAGNOSTICO', 'ORCAMENTO', 'ORCAMENTO_PRONTO', 'AGUARDANDO_APROVACAO'].includes(order.status)) {
      throw new BadRequestException('Não é possível solicitar aprovação neste status');
    }

    const newToken = uuidv4();
    // O link de aprovação vale pelo prazo de validade do orçamento da oficina.
    const tenantDocs = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { budgetValidityDays: true } });
    const expires = new Date();
    expires.setDate(expires.getDate() + resolveDocumentSettings(tenantDocs).budgetValidityDays);

    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        approvalToken: newToken,
        approvalTokenExpires: expires,
        status: 'AGUARDANDO_APROVACAO',
      },
    });

    await this.createTimeline(id, 'AGUARDANDO_APROVACAO', 'Aprovação solicitada', undefined);

    return {
      orderId: id,
      token: newToken,
      url: `/approval/${newToken}`,
    };
  }

  // Resumo público do orçamento para a página de aprovação (sem dados internos).
  async getApprovalSummary(approvalToken: string) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { approvalToken },
      include: {
        tenant: { select: { name: true, tradeName: true, logo: true, phone: true, email: true } },
        customer: { select: { name: true } },
        vehicle: { select: { brand: true, model: true, plate: true, year: true } },
        items: { select: { description: true, type: true, quantity: true, unitPrice: true, discount: true, totalPrice: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Orçamento não encontrado');

    const expired = Boolean(order.approvalTokenExpires && new Date() > order.approvalTokenExpires);
    const state = order.approvalStatus === 'APPROVED' ? 'APPROVED'
      : order.approvalStatus === 'REJECTED' ? 'REJECTED'
      : !AWAITING_APPROVAL.includes(order.status) ? 'CLOSED'
      : expired ? 'EXPIRED' : 'PENDING';

    return {
      state,
      code: formatOrderCode(order),
      workshop: {
        name: order.tenant.name || order.tenant.tradeName,
        logo: order.tenant.logo,
        phone: order.tenant.phone,
        email: order.tenant.email,
      },
      customerName: order.customer.name,
      vehicle: order.vehicle,
      equipment: [order.equipmentBrand, order.equipmentModel].filter(Boolean).join(' ') || null,
      complaint: order.complaint,
      diagnosis: order.diagnosis,
      items: order.items,
      totals: {
        services: order.totalServices + order.totalLabor,
        parts: order.totalParts,
        discount: order.totalDiscount,
        total: order.totalCost,
      },
      validUntil: order.approvalTokenExpires,
      approvedAt: order.approvedAt,
    };
  }

  // Resposta do cliente pelo link. Usa exatamente a mesma transição do balcão
  // (updateStatus): conversão em O.S., baixa de estoque, notificações e financeiro
  // são iguais qualquer que seja o canal da aprovação.
  async approveOrcamento(approvalToken: string, dto: AprovarOrcamentoDto) {
    const order = await this.prisma.serviceOrder.findFirst({ where: { approvalToken } });

    if (!order) {
      throw new NotFoundException('Orçamento não encontrado');
    }

    if (order.approvalTokenExpires && new Date() > order.approvalTokenExpires) {
      throw new BadRequestException('Token expirado');
    }

    // O link só decide uma vez, e não decide se a oficina já mudou a fase no balcão.
    if (order.approvalStatus || !AWAITING_APPROVAL.includes(order.status)) {
      throw new BadRequestException('Este orçamento já foi respondido ou não está aguardando aprovação');
    }

    const note = dto.notes?.trim();
    const updated = await this.updateStatus(
      order.tenantId,
      order.id,
      {
        status: dto.approved ? 'APROVADO' : 'REPROVADO',
        notes: `${dto.approved ? 'Orçamento aprovado' : 'Orçamento recusado'} pelo cliente (link)${note ? `: ${note}` : ''}`,
      } as UpdateStatusDto,
      undefined,
      { approvedBy: 'Cliente (link de aprovação)' },
    );

    return dto.approved
      ? { success: true, order: updated }
      : { success: false, message: 'Orçamento reprovado' };
  }

  // Única porta de transição de status: balcão, link de aprovação e faturamento passam
  // por aqui, então o efeito de cada fase (estoque, financeiro, datas) é sempre o mesmo.
  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateStatusDto,
    userId?: string,
    origin: { approvedBy?: string } = {},
  ) {
    const order = await this.findById(tenantId, id);
    const currentStatus = order.status;
    const newStatus = dto.status;

    // Valida transição (ADMIN/MASTER podem fazer override do fluxo)
    const allowed = this.getStatusFlow(order.orderType)[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      if (dto.adminOverride) {
        const actor = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;
        if (!actor || !['MASTER', 'ADMIN'].includes(actor.role)) {
          throw new BadRequestException('Permissão insuficiente para sobrescrever o fluxo de status');
        }
      } else {
        throw new BadRequestException(
          `Não é possível alterar de ${currentStatus} para ${newStatus}. Status permitidos: ${allowed.join(', ')}`
        );
      }
    }

    // Permissão por destino: cada perfil só move a O.S. para as fases que lhe cabem
    // (common/roles.ts). A resposta do cliente pelo link não tem usuário e já foi validada.
    if (userId) {
      const actor = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!canMoveToStatus(actor?.role, newStatus)) {
        throw new ForbiddenException('Seu perfil de acesso não pode levar a O.S. para esta etapa');
      }
    }

    const updateData: any = { status: newStatus, statusChangedAt: new Date() };

    // Valida metrologia obrigatória antes de avançar para orçamento técnico
    if (order.orderType === 'RETIFICA_MOTOR' && currentStatus === 'METROLOGIA' && newStatus === 'ORCAMENTO_RETIFICA') {
      const metrology = await this.prisma.engineMetrology.findUnique({ where: { serviceOrderId: id } });
      if (!metrology) {
        throw new BadRequestException('Ficha de metrologia obrigatória antes de avançar para Orçamento Técnico');
      }
    }

    // Reprovado (balcão ou link): devolve ao estoque as peças já baixadas.
    if (newStatus === 'REPROVADO') {
      updateData.approvalStatus = 'REJECTED';
      const orderWithItems = await this.prisma.serviceOrder.findUnique({
        where: { id },
        include: { items: true },
      });
      if (orderWithItems) await this.reverseStockIfApplied(orderWithItems);
    }

    // Eventos de transição
    // Aguardando aprovação: garante um link de aprovação válido (WhatsApp e QR code do PDF).
    if (AWAITING_APPROVAL.includes(newStatus) && !order.approvalStatus
      && (!order.approvalToken || (order.approvalTokenExpires && order.approvalTokenExpires < new Date()))) {
      const tenantDocs = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { budgetValidityDays: true } });
      const expires = new Date();
      expires.setDate(expires.getDate() + resolveDocumentSettings(tenantDocs).budgetValidityDays);
      updateData.approvalToken = uuidv4();
      updateData.approvalTokenExpires = expires;
    }

    // Aprovado (balcão ou link): o orçamento vira O.S. com o mesmo número. As peças
    // pendentes são baixadas do estoque logo após a gravação. Não lança receita: a receita
    // da O.S. entra uma única vez, no faturamento.
    if (newStatus === 'APROVADO') {
      if (order.orderType === 'ORCAMENTO') updateData.orderType = 'ORDEM_SERVICO';
      updateData.approvedAt = order.approvedAt ?? new Date();
      updateData.approvalStatus = 'APPROVED';
      if (origin.approvedBy) {
        updateData.approvedBy = origin.approvedBy;
      } else {
        const actor = userId ? await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }) : null;
        updateData.approvedBy = actor?.name ? `${actor.name} (balcão)` : 'Balcão';
      }
      // Custo de diagnóstico vira desconto quando o orçamento é aprovado.
      if (order.diagnosticCost > 0 && !order.approvalStatus) {
        updateData.totalDiscount = order.totalDiscount + order.diagnosticCost;
        updateData.totalCost = order.totalParts + order.totalServices + order.totalLabor - updateData.totalDiscount;
      }
    }

    if (newStatus === 'EM_EXECUCAO' && !order.startedAt) {
      updateData.startedAt = new Date();
    }

    if (newStatus === 'PRONTO_ENTREGA') {
      updateData.completedAt = new Date();

      if (dto.kmSaida) {
        updateData.kmSaida = dto.kmSaida;
        if (dto.testeRodagem && order.kmEntrada) {
          updateData.testeRodagem = true;
          updateData.kmDiferenca = dto.kmSaida - order.kmEntrada;
        } else {
          updateData.testeRodagem = false;
          updateData.kmDiferenca = 0;
        }
      }
    }

    if (newStatus === 'FATURADO') {
      updateData.paidAt = new Date();
      this.commissions.generateForOrder(tenantId, id).catch(() => {});
    }

    if (newStatus === 'ENTREGUE') {
      updateData.deliveredAt = new Date();
    }

    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        vehicle: true,
        items: {
          include: {
          },
        },
        metrology: true,
      },
    });

    await this.createTimeline(id, newStatus, dto.notes || `Status alterado para ${newStatus}`, userId);

    if (newStatus === 'APROVADO') {
      await this.applyPendingParts(order, `OS ${formatOrderCode(order)} aprovada`);
    }

    if (newStatus === 'FATURADO') {
      await this.recordOrderRevenue(updated);
    }

    if (newStatus === 'ENTREGUE') {
    }

    this.notifyStatusChange(tenantId, updated, newStatus);

    return updated;
  }

  // Desfaz uma aprovação (balcão ou link) para o cliente aprovar de novo: volta a ser
  // orçamento aguardando aprovação, com o MESMO número e um link novo. Inverso exato da
  // aprovação: devolve ao estoque as peças baixadas nela e limpa quem/quando aprovou.
  // Só antes de a execução começar (depois disso há trabalho feito e peças aplicadas).
  async revokeApproval(tenantId: string, id: string, userId: string, reason?: string) {
    const order = await this.findById(tenantId, id);

    if (order.approvalStatus !== 'APPROVED' || !['APROVADO', 'AGUARDANDO_PECAS'].includes(order.status)) {
      throw new BadRequestException('Só é possível revogar uma aprovação antes do início da execução');
    }

    // Peças: em orçamento com reserva de estoque, a baixa aconteceu na aprovação (ou na
    // reserva, que também é posterior a ela) e é desfeita. Sem reserva, as peças já
    // saíam do estoque ao serem lançadas no orçamento, então continuam como estavam.
    let returned = 0;
    if (order.reserveStock) {
      const applied = (order.items as any[]).filter((i) => i.type === 'part' && i.partId && i.applied);
      for (const item of applied) {
        await this.applyStockMovement(
          tenantId,
          item.partId,
          'ENTRY',
          item.quantity,
          `Aprovação revogada OS ${formatOrderCode(order)}`,
        );
        await this.prisma.serviceOrderItem.update({ where: { id: item.id }, data: { applied: false } });
      }
      returned = applied.length;
    }

    const tenantDocs = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { budgetValidityDays: true } });
    const expires = new Date();
    expires.setDate(expires.getDate() + resolveDocumentSettings(tenantDocs).budgetValidityDays);
    const isRetifica = order.orderType === 'RETIFICA_MOTOR';
    const newStatus = isRetifica ? 'AGUARDANDO_APROVACAO_RETIFICA' : 'AGUARDANDO_APROVACAO';

    const data: any = {
      orderType: isRetifica ? 'RETIFICA_MOTOR' : 'ORCAMENTO',
      status: newStatus,
      statusChangedAt: new Date(),
      approvalStatus: null,
      approvedAt: null,
      approvedBy: null,
      approvalToken: uuidv4(),
      approvalTokenExpires: expires,
    };
    if (order.reserveStock) {
      Object.assign(data, { partsReserved: false, partsCheckedAt: null, expectedPartsDate: null, purchaseOrderNumber: null });
    }
    // A aprovação transforma o custo de diagnóstico em desconto; desfaz.
    if (order.diagnosticCost > 0) {
      data.totalDiscount = Math.max(0, order.totalDiscount - order.diagnosticCost);
      data.totalCost = order.totalParts + order.totalServices + order.totalLabor - data.totalDiscount;
    }

    const updated = await this.prisma.serviceOrder.update({
      where: { id },
      data,
      include: { customer: true, vehicle: true },
    });

    const actor = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const note = reason?.trim();
    await this.createTimeline(
      id,
      newStatus,
      `Aprovação revogada por ${actor?.name ?? 'usuário'}${note ? `: ${note}` : ''}. `
        + `Novo link de aprovação gerado${returned ? `; ${returned} peça(s) devolvida(s) ao estoque` : ''}.`,
      userId,
    );
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ServiceOrder',
        entityId: id,
        action: 'REVOKE_APPROVAL',
        changes: JSON.stringify({
          osNumber: formatOrderCode(order),
          reason: note ?? null,
          previous: { status: order.status, approvedAt: order.approvedAt, approvedBy: order.approvedBy },
          partsReturned: returned,
        }),
      },
    });

    // Envia o novo link ao cliente (mesma mensagem de orçamento pronto).
    this.notifyStatusChange(tenantId, updated, 'AGUARDANDO_APROVACAO');

    return { success: true, status: newStatus, partsReturned: returned };
  }

  async applyStockAndFinancial(tenantId: string, id: string, userId: string) {
    const order = await this.findById(tenantId, id);

    if (!['APROVADO', 'EM_EXECUCAO', 'PRONTO_ENTREGA', 'FATURADO'].includes(order.status)) {
      throw new BadRequestException('Não é possível aplicar estoque neste status');
    }

    // Só baixa estoque. Não lança despesa: o custo das peças (CMV) entra na DRE a partir
    // das O.S. faturadas; um lançamento aqui contaria o mesmo custo duas vezes.
    const itemsApplied = await this.applyPendingParts(order, `OS ${formatOrderCode(order)}`);

    await this.createTimeline(id, 'STOCK_APPLIED', 'Estoque baixado', userId);

    return { success: true, itemsApplied };
  }

  // Faturamento pela API: mesmo efeito de mudar o status para FATURADO na tela
  // (uma única receita, pelo total da O.S.).
  async receivePayment(tenantId: string, id: string, dto: FinalizeOrderDto, userId: string) {
    const order = await this.findById(tenantId, id);

    if (order.status !== 'PRONTO_ENTREGA') {
      throw new BadRequestException('OS deve estar em PRONTO_ENTREGA para registrar pagamento');
    }

    if (dto.paymentMethod) {
      await this.prisma.serviceOrder.update({ where: { id }, data: { paymentMethod: dto.paymentMethod } });
    }

    const updated = await this.updateStatus(tenantId, id, { status: 'FATURADO' } as UpdateStatusDto, userId);
    return { success: true, amountPaid: Number(updated.totalCost), status: 'FATURADO' };
  }

  async delete(tenantId: string, id: string, userId?: string, reason?: string) {
    const order = await this.findById(tenantId, id);

    // Registra auditoria antes de deletar
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? null,
        entityType: 'ServiceOrder',
        entityId: id,
        action: 'DELETE',
        changes: JSON.stringify({
          osNumber: formatOrderCode(order),
          status: order.status,
          orderType: order.orderType,
          customerId: order.customerId,
          vehicleId: order.vehicleId,
          totalCost: order.totalCost,
          createdAt: order.createdAt,
          reason: reason || 'Não informado',
        }),
      },
    });

    // Remove registros filhos em ordem para respeitar FK constraints
    await this.prisma.$transaction(async (tx) => {
      // 1. Comissões referenciam serviceOrder e serviceOrderItem
      await tx.commission.deleteMany({ where: { serviceOrderId: id } });
      // 2. Itens da O.S.
      await tx.serviceOrderItem.deleteMany({ where: { serviceOrderId: id } });
      // 3. Linha do tempo
      await tx.serviceOrderTimeline.deleteMany({ where: { serviceOrderId: id } });
      // 4. Checklists (itens e fotos cascadeiam via schema)
      await tx.vehicleChecklist.deleteMany({ where: { serviceOrderId: id } });
      // 5. Por fim, a O.S.
      await tx.serviceOrder.delete({ where: { id } });
    });

    return { success: true, id };
  }

  async createDiagnosticOrder(tenantId: string, sourceOrderId: string, userId: string) {
    const source = await this.prisma.serviceOrder.findFirst({
      where: { id: sourceOrderId, tenantId },
    });
    if (!source) throw new NotFoundException('OS de origem não encontrada');
    if (source.status !== 'REPROVADO') {
      throw new BadRequestException('Apenas OSs reprovadas podem gerar OS de diagnóstico');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const hours = tenant?.diagnosticHours ?? 0.5;
    const hourlyRate = tenant?.laborHourlyRate ?? 120;

    return this.createOrcamento(
      tenantId,
      {
        customerId: source.customerId,
        vehicleId: source.vehicleId,
        orderType: 'ORDEM_SERVICO',
        complaint: `Taxa de Diagnóstico — referente ao orçamento #${formatOrderCode(source)} reprovado`,
        observations: `Gerado automaticamente a partir da OS ${formatOrderCode(source)}`,
        kmEntrada: source.kmEntrada ?? 0,
        reserveStock: false,
        items: [
          {
            type: 'service',
            description: `Diagnóstico (${hours}h × R$ ${hourlyRate.toLocaleString('pt-BR')}/h)`,
            quantity: hours,
            unitPrice: hourlyRate,
          } as any,
        ],
      } as any,
      userId,
    );
  }

  async addItem(tenantId: string, orderId: string, dto: CreateOrUpdateItemDto, userId: string) {
    const order = await this.findById(tenantId, orderId);

    const CLOSED = ['FATURADO', 'ENTREGUE', 'CANCELADO', 'REPROVADO'];
    if (CLOSED.includes(order.status)) {
      throw new BadRequestException(`Não é possível adicionar itens a uma OS com status ${order.status}`);
    }

    if (dto.type === 'part') {
      await this.ensureStockPrivilege(tenantId, userId);
    }

  let qty = dto.quantity || 1;
    let unitPrice = dto.unitPrice || 0;
    let description = dto.description;

    // Se for serviço e tiver ID, busca TMO e VH
    if (dto.type === 'service' && dto.serviceId) {
      const catalogService = await this.prisma.service.findUnique({
        where: { id: dto.serviceId },
      });

      if (catalogService && catalogService.hourlyRate && catalogService.tmo) {
        unitPrice = catalogService.hourlyRate;
        qty = catalogService.tmo;
        description = `${catalogService.name} (TMO: ${catalogService.tmo}h x R$ ${catalogService.hourlyRate}/h)`;
      }
    }

    const discount = dto.discount || 0;
    await this.ensureDiscountWithinLimit(tenantId, userId, dto.type, unitPrice, qty, discount);
    const totalPrice = (unitPrice * qty) - discount;

    let finalPartId = dto.partId;

    // Se for peça e não existir ID (Quick Add), cria a peça e inicializa estoque
    if (dto.type === 'part' && !finalPartId) {
      const newPart = await this.prisma.part.create({
        data: {
          tenantId,
          name: description,
          internalCode: dto.internalCode,
          unitPrice: unitPrice,
          isActive: true,
        },
      });
      finalPartId = newPart.id;

      // Inicializa o estoque com a quantidade que está sendo lançada (para não ficar negativo)
      await this.applyStockMovement(
        tenantId,
        finalPartId,
        'ENTRY',
        qty,
        `Entrada automática via Quick Add na OS ${formatOrderCode(order)}`,
      );
    }

    const item = await this.prisma.serviceOrderItem.create({
      data: {
        serviceOrderId: orderId,
        serviceId: dto.serviceId,
        partId: finalPartId,
        assignedUserId: dto.assignedUserId,
        description,
        quantity: qty,
        unitPrice,
        discount,
        totalPrice,
        type: dto.type,
      },
    });

    if (dto.type === 'part' && finalPartId) {
      const shouldDebitNow = order.orderType === 'ORDEM_SERVICO' || (order.orderType === 'ORCAMENTO' && !order.reserveStock);

      if (shouldDebitNow) {
        await this.applyStockMovement(
          tenantId,
          finalPartId,
          'EXIT',
          qty,
          `Saída OS ${formatOrderCode(order)}`,
        );

        await this.prisma.serviceOrderItem.update({
          where: { id: item.id },
          data: { applied: true },
        });
      }
    }

    await this.recalculateTotals(orderId);
    await this.createTimeline(orderId, 'ITEM_ADDED', `Adicionado: ${description}`, userId);

    return item;
  }


  async removeItem(tenantId: string, orderId: string, itemId: string, userId: string) {
    const order = await this.findById(tenantId, orderId);
    
    const item = await this.prisma.serviceOrderItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.serviceOrderId !== orderId) {
      throw new NotFoundException('Item não encontrado na ordem');
    }

    if (item.type === 'part') {
      await this.ensureStockPrivilege(tenantId, userId);
    }

    // Se for peça, devolve ao estoque
    if (item.type === 'part' && item.partId && item.applied) {
      await this.applyStockMovement(
        tenantId,
        item.partId,
        'ENTRY',
        item.quantity,
        `Estorno (Item removido da OS ${formatOrderCode(order)})`,
      );
    }

    await this.prisma.serviceOrderItem.delete({
      where: { id: itemId },
    });

    await this.recalculateTotals(orderId);
    await this.createTimeline(orderId, 'ITEM_REMOVED', `Removido: ${item.description}`, userId);

    return { success: true };
  }

  async updateItem(tenantId: string, orderId: string, itemId: string, dto: UpdateServiceOrderItemDto, userId: string) {
    const order = await this.findById(tenantId, orderId);
    
    const oldItem = await this.prisma.serviceOrderItem.findUnique({
      where: { id: itemId },
    });

    if (!oldItem || oldItem.serviceOrderId !== orderId) {
      throw new NotFoundException('Item não encontrado na ordem');
    }

    if (oldItem.type === 'part') {
      await this.ensureStockPrivilege(tenantId, userId);
    }

    const qty = dto.quantity !== undefined ? dto.quantity : oldItem.quantity;
    const unitPrice = dto.unitPrice !== undefined ? dto.unitPrice : oldItem.unitPrice;
    const discount = dto.discount !== undefined ? dto.discount : oldItem.discount;
    const itemType = (dto.type ?? oldItem.type) as 'service' | 'part' | 'labor';
    await this.ensureDiscountWithinLimit(tenantId, userId, itemType, unitPrice, qty, discount);
    const totalPrice = (unitPrice * qty) - discount;

    // Atualiza estoque se a quantidade mudou e for peça
    if (oldItem.type === 'part' && oldItem.partId && oldItem.applied) {
      const diff = qty - oldItem.quantity;
      if (diff > 0) {
        await this.applyStockMovement(
          tenantId,
          oldItem.partId,
          'EXIT',
          diff,
          `Ajuste Qtd OS ${formatOrderCode(order)}`,
        );
      } else if (diff < 0) {
        await this.applyStockMovement(
          tenantId,
          oldItem.partId,
          'ENTRY',
          Math.abs(diff),
          `Estorno Ajuste Qtd OS ${formatOrderCode(order)}`,
        );
      }
    }

    const updated = await this.prisma.serviceOrderItem.update({
      where: { id: itemId },
      data: {
        description: dto.description || oldItem.description,
        quantity: qty,
        unitPrice,
        discount,
        totalPrice,
        ...(dto.assignedUserId !== undefined && { assignedUserId: dto.assignedUserId }),
      },
    });


    await this.recalculateTotals(orderId);
    await this.createTimeline(orderId, 'ITEM_UPDATED', `Editado: ${updated.description}`, userId);

    return updated;
  }

  private async recalculateTotals(orderId: string) {

    const items = await this.prisma.serviceOrderItem.findMany({
      where: { serviceOrderId: orderId },
    });

    let totalParts = 0;
    let totalServices = 0;
    let totalLabor = 0;

    items.forEach((item) => {
      if (item.type === 'part') totalParts += Number(item.totalPrice);
      else if (item.type === 'service') totalServices += Number(item.totalPrice);
      else totalLabor += Number(item.totalPrice);
    });

    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      select: {
        totalParts: true,
        totalServices: true,
        totalLabor: true,
        totalDiscount: true,
        discountPartsPercent: true,
        discountServicesPercent: true,
      },
    });

    // Reaplica o % de desconto já concedido na O.S. sobre a nova base de peças/serviços,
    // preservando qualquer outro valor que componha o totalDiscount (ex.: crédito de diagnóstico).
    const discountPartsPercent = order?.discountPartsPercent || 0;
    const discountServicesPercent = order?.discountServicesPercent || 0;

    const oldPartsDiscount = (order?.totalParts || 0) * (discountPartsPercent / 100);
    const oldServicesDiscount = ((order?.totalServices || 0) + (order?.totalLabor || 0)) * (discountServicesPercent / 100);
    const otherDiscount = Math.max(0, (order?.totalDiscount || 0) - oldPartsDiscount - oldServicesDiscount);

    const newPartsDiscount = totalParts * (discountPartsPercent / 100);
    const newServicesDiscount = (totalServices + totalLabor) * (discountServicesPercent / 100);
    const totalDiscount = otherDiscount + newPartsDiscount + newServicesDiscount;

    await this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: {
        totalParts,
        totalServices,
        totalLabor,
        totalDiscount,
        totalCost: (totalParts + totalServices + totalLabor) - totalDiscount,
      },
    });

  }

  async syncPrices(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);

    if (['ENTREGUE', 'CANCELADO'].includes(order.status)) {
      throw new BadRequestException('Não é possível sincronizar uma OS finalizada ou cancelada');
    }

    const updates: Promise<any>[] = [];

    for (const item of order.items as any[]) {
      let newUnitPrice: number = Number(item.unitPrice);
      let newDescription: string = item.description;

      if (item.type === 'part' && item.partId) {
        const part = await this.prisma.part.findFirst({
          where: { id: item.partId, tenantId, isActive: true },
          select: { unitPrice: true, name: true },
        });
        if (part) {
          newUnitPrice = Number(part.unitPrice);
        }
      } else if (item.type === 'service' && item.serviceId) {
        const svc = await this.prisma.service.findFirst({
          where: { id: item.serviceId, tenantId },
          select: { hourlyRate: true, name: true, tmo: true },
        });
        if (svc && svc.hourlyRate) {
          newUnitPrice = Number(svc.hourlyRate);
          if (svc.tmo) {
            newDescription = `${svc.name} (TMO: ${svc.tmo}h x R$ ${svc.hourlyRate}/h)`;
          }
        }
      }

      const newTotal = newUnitPrice * Number(item.quantity) - Number(item.discount);
      updates.push(
        this.prisma.serviceOrderItem.update({
          where: { id: item.id },
          data: { unitPrice: newUnitPrice, totalPrice: newTotal, description: newDescription },
        }),
      );
    }

    await Promise.all(updates);
    await this.recalculateTotals(id);
    await this.createTimeline(id, 'SYNC_PRICES', 'Preços sincronizados com catálogo atual', undefined);

    return this.findById(tenantId, id);
  }

  async getApprovalPage(token: string) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { approvalToken: token },
      include: {
        customer: true,
        vehicle: true,
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Orçamento não encontrado');
    }

    return order;
  }

  // ─── Reserva de Peças ──────────────────────────────────────────────────────

  async checkAndReserveParts(tenantId: string, id: string, expectedPartsDate: string | null, userId: string) {
    const order = await this.findById(tenantId, id);

    if (!['APROVADO', 'AGUARDANDO_PECAS'].includes(order.status)) {
      throw new BadRequestException('Reserva de peças só pode ser feita em OS APROVADA ou AGUARDANDO_PECAS');
    }

    // Peças do tipo 'part' ainda não aplicadas ao estoque
    const partItems = (order.items as any[]).filter(
      (item: any) => item.type === 'part' && item.partId,
    );

    if (partItems.length === 0) {
      throw new BadRequestException('Esta OS não possui peças para reservar');
    }

    // Verifica disponibilidade de cada peça
    const available: any[] = [];
    const missing: any[] = [];

    for (const item of partItems) {
      const part = await this.prisma.part.findFirst({
        where: { id: item.partId, tenantId },
        select: {
          id: true, name: true, internalCode: true, sku: true,
          currentStock: true, unitPrice: true, costPrice: true,
          supplier: { select: { name: true } },
        },
      });

      const needed = Math.ceil(Number(item.quantity));
      const inStock = part?.currentStock ?? 0;

      if (inStock >= needed) {
        available.push({ item, part, needed });
      } else {
        missing.push({ item, part, needed, inStock, lacking: needed - inStock });
      }
    }

    // Reserva as disponíveis imediatamente (debita estoque)
    for (const { item, needed } of available) {
      if (!item.applied) {
        await this.applyStockMovement(
          tenantId,
          item.partId,
          'EXIT',
          needed,
          `Reserva OS ${formatOrderCode(order)}`,
        );
        await this.prisma.serviceOrderItem.update({
          where: { id: item.id },
          data: { applied: true },
        });
      }
    }

    // Atualiza OS com dados de reserva
    const hasMissing = missing.length > 0;
    const newStatus = hasMissing ? 'AGUARDANDO_PECAS' : order.status;
    const now = new Date();

    // Gera número sequencial de pedido de compra: PC-YYYYMMDD-XXXX
    const seq = Math.floor(1000 + Math.random() * 9000);
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const purchaseOrderNumber = hasMissing ? `PC-${dateStr}-${seq}` : null;

    await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        partsReserved: true,
        partsCheckedAt: now,
        ...(hasMissing && {
          status: 'AGUARDANDO_PECAS',
          statusChangedAt: now,
          expectedPartsDate: expectedPartsDate ? new Date(expectedPartsDate) : null,
          purchaseOrderNumber,
        }),
      },
    });

    await this.createTimeline(
      id,
      hasMissing ? 'AGUARDANDO_PECAS' : 'PARTS_RESERVED',
      hasMissing
        ? `${available.length} peça(s) reservada(s). ${missing.length} peça(s) em pedido de compra ${purchaseOrderNumber}.`
        : `Todas as ${available.length} peça(s) reservadas com sucesso.`,
      userId,
    );

    // Busca tenant para dados do PDF
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, document: true, phone: true, email: true, address: true },
    });

    return {
      success: true,
      reserved: available.length,
      missing: missing.length,
      status: newStatus,
      purchaseOrderNumber,
      tenant,
      order: { id: order.id, vehicle: order.vehicle, customer: order.customer },
      availableItems: available.map(({ item, part, needed }) => ({
        itemId: item.id,
        description: item.description,
        internalCode: part?.internalCode,
        sku: part?.sku,
        needed,
        unitPrice: item.unitPrice,
      })),
      missingItems: missing.map(({ item, part, needed, inStock, lacking }) => ({
        itemId: item.id,
        description: item.description,
        internalCode: part?.internalCode,
        sku: part?.sku,
        needed,
        inStock,
        lacking,
        unitPrice: item.unitPrice,
        costPrice: (part as any)?.costPrice,
        supplierName: (part as any)?.supplier?.name,
      })),
    };
  }

  async cancelPartsReservation(tenantId: string, id: string, userId: string) {
    const order = await this.findById(tenantId, id);

    if (!order.partsReserved) {
      throw new BadRequestException('Esta OS não possui peças reservadas');
    }

    // Devolve ao estoque todas as peças aplicadas pela reserva
    const appliedParts = (order.items as any[]).filter(
      (item: any) => item.type === 'part' && item.partId && item.applied,
    );

    for (const item of appliedParts) {
      await this.applyStockMovement(
        tenantId,
        item.partId,
        'ENTRY',
        Math.ceil(Number(item.quantity)),
        `Cancelamento de reserva OS ${formatOrderCode(order)}`,
      );
      await this.prisma.serviceOrderItem.update({
        where: { id: item.id },
        data: { applied: false },
      });
    }

    await this.prisma.serviceOrder.update({
      where: { id },
      data: {
        partsReserved: false,
        partsCheckedAt: null,
        expectedPartsDate: null,
        purchaseOrderNumber: null,
        status: 'APROVADO',
        statusChangedAt: new Date(),
      },
    });

    await this.createTimeline(
      id,
      'APROVADO',
      `Reserva de peças cancelada. ${appliedParts.length} peça(s) devolvida(s) ao estoque.`,
      userId,
    );

    return { success: true, returned: appliedParts.length };
  }

  // ─── Timeline ───────────────────────────────────────────────────────────────

  private async createTimeline(
    serviceOrderId: string,
    status: string,
    description?: string,
    createdBy?: string,
  ) {
    await this.prisma.serviceOrderTimeline.create({
      data: {
        serviceOrderId,
        status,
        eventType: 'status',
        description,
        createdBy,
      },
    });
  }

  // Notificações WhatsApp da mudança de fase (fire-and-forget).
  private notifyStatusChange(tenantId: string, updated: any, newStatus: string) {
    if (this.whatsapp.isConfigured()) {
      const c = updated.customer as any;
      const v = updated.vehicle as any;
      const phone: string = c?.phone ?? '';
      if (phone) {
        const payload = {
          tenantId,
          customerName: c.name ?? '',
          customerPhone: phone,
          orderNumber: formatOrderCode(updated),
          vehicleBrand: v?.brand ?? '',
          vehicleModel: v?.model ?? '',
          plate: v?.plate ?? '',
          approvalLink: (updated as any).approvalToken
            ? `${process.env.FRONTEND_URL ?? 'https://sigmaauto.com.br'}/aprovacao/${(updated as any).approvalToken}`
            : undefined,
          totalCost: (updated as any).totalCost,
        };
        if (newStatus === 'AGUARDANDO_APROVACAO') {
          this.whatsapp.notifyOrcamentoPronto(payload);
        } else if (newStatus === 'APROVADO') {
          this.whatsapp.notifyAprovado(payload);
        } else if (newStatus === 'PRONTO_ENTREGA') {
          this.whatsapp.notifyProntoEntrega(payload);
        } else if (newStatus === 'ENTREGUE') {
          this.whatsapp.notifyEntregue(payload);
        } else if (newStatus === 'CANCELADO') {
          this.whatsapp.notifyCancelado(payload);
        }
      }
    }
  }

  // Baixa do estoque as peças da O.S. ainda não aplicadas. Retorna quantas foram baixadas.
  private async applyPendingParts(order: any, reason: string): Promise<number> {
    const pending = (order.items ?? []).filter(
      (item: any) => item.type === 'part' && item.partId && !item.applied,
    );
    for (const item of pending) {
      await this.applyStockMovement(order.tenantId, item.partId, 'EXIT', item.quantity, reason);
      await this.prisma.serviceOrderItem.update({ where: { id: item.id }, data: { applied: true } });
    }
    return pending.length;
  }

  // Receita da O.S.: exatamente um lançamento, feito no faturamento, pelo total da O.S.
  // Se já houver um (ex.: o antigo lançamento feito na aprovação), ele é acertado para o
  // valor e a data do faturamento em vez de duplicar.
  private async recordOrderRevenue(order: any): Promise<void> {
    const amount = Number(order.totalCost || 0);
    const data = {
      amount,
      description: `Receita - OS ${formatOrderCode(order)}`,
      category: 'servicos',
      date: order.paidAt ?? new Date(),
    };
    const existing = await this.prisma.financialTransaction.findFirst({
      where: { tenantId: order.tenantId, referenceId: order.id, referenceType: 'service_order', type: 'INCOME' },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      await this.prisma.financialTransaction.update({ where: { id: existing.id }, data });
    } else if (amount > 0) {
      await this.prisma.financialTransaction.create({
        data: { ...data, tenantId: order.tenantId, type: 'INCOME', referenceId: order.id, referenceType: 'service_order' },
      });
    }
  }

  private async reverseStockIfApplied(order: any): Promise<void> {
    const appliedParts = (order.items ?? []).filter(
      (item: any) => item.type === 'part' && item.partId && item.applied,
    );
    for (const item of appliedParts) {
      await this.applyStockMovement(
        order.tenantId,
        item.partId,
        'ENTRY',
        item.quantity,
        `Estorno OS ${formatOrderCode(order)} — orçamento reprovado`,
      );
      await this.prisma.serviceOrderItem.update({
        where: { id: item.id },
        data: { applied: false },
      });
    }
  }
}
