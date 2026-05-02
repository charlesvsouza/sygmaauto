import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceOrderDto, CreateOrcamentoDto, UpdateOrcamentoDto, UpdateStatusDto, AprovarOrcamentoDto, FinalizeOrderDto, CreateOrUpdateItemDto, UpdateServiceOrderItemDto } from './dto/service-order.dto';
import { v4 as uuidv4 } from 'uuid';
import { WhatsappService } from '../notifications/whatsapp.service';

@Injectable()
export class ServiceOrdersService {
  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService,
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
        items: { include: { service: true, part: true } },
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
        items: { include: { service: true, part: true } },
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Ordem não encontrada');
    }

    return order;
  }

  async createOrcamento(tenantId: string, dto: CreateOrcamentoDto, userId: string) {
    // Valida cliente e veículo
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, tenantId } });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');

    const approvalToken = uuidv4();
    const approvalTokenExpires = new Date();
    approvalTokenExpires.setDate(approvalTokenExpires.getDate() + 7);

    // Processa itens
    let totalParts = 0, totalServices = 0, totalLabor = 0;
    const itemsData = dto.items?.map((item) => {
      const qty = item.quantity || 1;
      const unitPrice = item.unitPrice || 0;
      const discount = item.discount || 0;
      const total = (unitPrice * qty) - discount;

      if (item.type === 'part') totalParts += total;
      else if (item.type === 'service') totalServices += total;
      else totalLabor += total;

      return {
        serviceId: item.serviceId,
        partId: item.partId,
        description: item.description,
        quantity: qty,
        unitPrice,
        discount,
        totalPrice: total,
        type: item.type,
        applied: false,
      };
    }) || [];

    const order = await this.prisma.serviceOrder.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        orderType: 'ORCAMENTO',
        status: 'ABERTA',
        notes: dto.notes,
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
    });

    await this.createTimeline(order.id, 'ABERTA', 'O.S. aberta', userId);

    return order;
  }

  async createServiceOrder(tenantId: string, dto: CreateServiceOrderDto, userId: string) {
    // Sempre cria como ABERTA — o tipo (ORCAMENTO/ORDEM_SERVICO) define a natureza do documento,
    // mas o fluxo de status começa sempre em ABERTA para seguir as etapas normalmente.
    const baseOrder = await this.createOrcamento(tenantId, dto, userId);

    if (dto.orderType === 'ORDEM_SERVICO') {
      return this.prisma.serviceOrder.update({
        where: { id: baseOrder.id },
        data: {
          orderType: 'ORDEM_SERVICO',
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

    return this.prisma.serviceOrder.update({
      where: { id },
      data: updateData,

      include: {
        customer: true,
        vehicle: true,
        items: true,
      },
    });
  }

  async requestApproval(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);

    if (!['ABERTA', 'EM_DIAGNOSTICO', 'ORCAMENTO', 'ORCAMENTO_PRONTO', 'AGUARDANDO_APROVACAO'].includes(order.status)) {
      throw new BadRequestException('Não é possível solicitar aprovação neste status');
    }

    const newToken = uuidv4();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

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

  async approveOrcamento(approvalToken: string, dto: AprovarOrcamentoDto) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { approvalToken },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Orçamento não encontrado');
    }

    if (order.approvalTokenExpires && new Date() > order.approvalTokenExpires) {
      throw new BadRequestException('Token expirado');
    }

    if (!dto.approved) {
      await this.prisma.serviceOrder.update({
        where: { id: order.id },
        data: { status: 'REPROVADO' },
      });

      // Reverte estoque caso peças já tenham sido debitadas
      await this.reverseStockIfApplied(order);

      // Se não autorizado, cobra custo de diagnóstico se existir
      if (order.diagnosticCost > 0) {
        await this.prisma.financialTransaction.create({
          data: {
            tenantId: order.tenantId,
            type: 'INCOME',
            amount: order.diagnosticCost,
            description: `Custo de Diagnóstico (Orçamento Reprovado) - OS ${order.id.slice(0, 8)}`,
            category: 'servicos',
            referenceId: order.id,
            referenceType: 'service_order',
          },
        });
      }

      await this.createTimeline(order.id, 'REPROVADO', dto.notes || 'Orçamento reprovado pelo cliente', undefined);
      return { success: false, message: 'Orçamento reprovado' };
    }

    // Aprova - transita para OS
    let totalDiscount = order.totalDiscount;
    
    // Se autorizado, o custo de diagnóstico entra como desconto
    if (order.diagnosticCost > 0) {
      totalDiscount += order.diagnosticCost;
    }

    const updated = await this.prisma.serviceOrder.update({
      where: { id: order.id },
      data: {
        orderType: 'ORDEM_SERVICO',
        status: 'APROVADO',
        approvedAt: new Date(),
        approvalStatus: 'APPROVED',
        totalDiscount,
        totalCost: (order.totalParts + order.totalServices + order.totalLabor) - totalDiscount,
      },
    });

    // Lança débito no financeiro (Receita pendente)
    await this.prisma.financialTransaction.create({
      data: {
        tenantId: order.tenantId,
        type: 'INCOME',
        amount: updated.totalCost,
        description: `Serviços/Peças - OS ${order.id.slice(0, 8)}`,
        category: 'servicos',
        referenceId: order.id,
        referenceType: 'service_order',
      },
    });

    // Na autorização do orçamento, debita todas as peças pendentes do estoque.
    const parts = order.items.filter((item: any) => item.type === 'part' && !item.applied);
    for (const item of parts) {
      if (item.partId) {
        await this.applyStockMovement(
          order.tenantId,
          item.partId,
          'EXIT',
          item.quantity,
          `OS ${order.id.slice(0, 8)} aprovada`,
        );
        await this.prisma.serviceOrderItem.update({
          where: { id: item.id },
          data: { applied: true },
        });
      }
    }

    await this.createTimeline(order.id, 'APROVADO', 'Orçamento aprovado pelo cliente. Convertido em OS e gerado financeiro.', undefined);

    return { success: true, order: updated };
  }


  async updateStatus(tenantId: string, id: string, dto: UpdateStatusDto, userId: string) {
    const order = await this.findById(tenantId, id);
    const currentStatus = order.status;
    const newStatus = dto.status;

    // Valida transição (ADMIN/MASTER podem fazer override do fluxo)
    const allowed = this.STATUS_FLOW[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      if (dto.adminOverride) {
        const actor = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!actor || !['MASTER', 'ADMIN'].includes(actor.role)) {
          throw new BadRequestException('Permissão insuficiente para sobrescrever o fluxo de status');
        }
      } else {
        throw new BadRequestException(
          `Não é possível alterar de ${currentStatus} para ${newStatus}. Status permitidos: ${allowed.join(', ')}`
        );
      }
    }

    const updateData: any = { status: newStatus };

    // Reverte estoque ao reprovar via atualização manual de status
    if (newStatus === 'REPROVADO') {
      const orderWithItems = await this.prisma.serviceOrder.findUnique({
        where: { id },
        include: { items: true },
      });
      if (orderWithItems) await this.reverseStockIfApplied(orderWithItems);
    }

    // Eventos de transição
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
        items: true,
      },
    });

    await this.createTimeline(id, newStatus, dto.notes || `Status alterado para ${newStatus}`, userId);

    // Notificações WhatsApp (fire-and-forget)
    if (this.whatsapp.isConfigured()) {
      const c = updated.customer as any;
      const v = updated.vehicle as any;
      const phone: string = c?.phone ?? '';
      if (phone) {
        const payload = {
          customerName: c.name ?? '',
          customerPhone: phone,
          orderNumber: (updated as any).orderNumber ?? updated.id.slice(0, 8),
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

    return updated;
  }

  async applyStockAndFinancial(tenantId: string, id: string, userId: string) {
    const order = await this.findById(tenantId, id);

    if (!['APROVADO', 'EM_EXECUCAO', 'PRONTO_ENTREGA', 'FATURADO'].includes(order.status)) {
      throw new BadRequestException('Não é possível aplicar estoque neste status');
    }

    // Aplica baixa de estoque para itens não aplicados
    const items = order.items.filter((item: any) => item.type === 'part' && !item.applied);

    for (const item of items) {
      if (item.partId) {
        await this.applyStockMovement(
          tenantId,
          item.partId,
          'EXIT',
          item.quantity,
          `OS ${order.id.slice(0, 8)}`,
        );

        // Marca item como aplicado
        await this.prisma.serviceOrderItem.update({
          where: { id: item.id },
          data: { applied: true },
        });
      }
    }

    // Lança despesa no financeiro
    const totalPartsNum = Number(order.totalParts);
    if (totalPartsNum > 0) {
      await this.prisma.financialTransaction.create({
        data: {
          tenantId,
          type: 'EXPENSE',
          amount: totalPartsNum,
          description: `Peças - OS ${order.id.slice(0, 8)}`,
          category: 'pecas',
          referenceId: order.id,
          referenceType: 'service_order',
        },
      });
    }

    await this.createTimeline(id, 'STOCK_APPLIED', 'Estoque baixado', userId);

    return { success: true, itemsApplied: items.length };
  }

  async receivePayment(tenantId: string, id: string, dto: FinalizeOrderDto, userId: string) {
    const order = await this.findById(tenantId, id);

    if (order.status !== 'PRONTO_ENTREGA') {
      throw new BadRequestException('OS deve estar em PRONTO_ENTREGA para registrar pagamento');
    }

    const amountPaid = dto.amountPaid || Number(order.totalCost);

    await this.prisma.serviceOrder.update({
      where: { id },
      data: { status: 'FATURADO', paidAt: new Date() },
    });

    if (dto.createIncomeTransaction) {
      await this.prisma.financialTransaction.create({
        data: {
          tenantId,
          type: 'INCOME',
          amount: amountPaid,
          description: `Pagamento - OS ${order.id.slice(0, 8)}`,
          category: 'servicos',
          referenceId: order.id,
          referenceType: 'service_order',
        },
      });
    }

    await this.createTimeline(id, 'FATURADO', `Pagamento de R$ ${amountPaid.toFixed(2)} recebido`, userId);

    return { success: true, amountPaid, status: 'FATURADO' };
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
          osNumber: id.slice(0, 8).toUpperCase(),
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

    return this.prisma.serviceOrder.delete({ where: { id } });
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
        complaint: `Taxa de Diagnóstico — referente ao orçamento #${source.id.slice(0, 8).toUpperCase()} reprovado`,
        observations: `Gerado automaticamente a partir da OS ${source.id.slice(0, 8).toUpperCase()}`,
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
        `Entrada automática via Quick Add na OS ${order.id.slice(0, 8)}`,
      );
    }

    const item = await this.prisma.serviceOrderItem.create({
      data: {
        serviceOrderId: orderId,
        serviceId: dto.serviceId,
        partId: finalPartId,
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
          `Saída OS ${order.id.slice(0, 8)}`,
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
        `Estorno (Item removido da OS ${order.id.slice(0, 8)})`,
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
          `Ajuste Qtd OS ${order.id.slice(0, 8)}`,
        );
      } else if (diff < 0) {
        await this.applyStockMovement(
          tenantId,
          oldItem.partId,
          'ENTRY',
          Math.abs(diff),
          `Estorno Ajuste Qtd OS ${order.id.slice(0, 8)}`,
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
      select: { totalDiscount: true },
    });

    const totalDiscount = order?.totalDiscount || 0;

    await this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: {
        totalParts,
        totalServices,
        totalLabor,
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
        `Estorno OS ${order.id.slice(0, 8)} — orçamento reprovado`,
      );
      await this.prisma.serviceOrderItem.update({
        where: { id: item.id },
        data: { applied: false },
      });
    }
  }
}