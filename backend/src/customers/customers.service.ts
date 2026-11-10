import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.customer.findMany({
      where: { tenantId },
      include: { _count: { select: { vehicles: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        vehicles: true,
        // Fio da meada: veículos que já estiveram (ou estão) no nome do cliente.
        vehicleOwnerships: {
          include: {
            vehicle: {
              select: { id: true, plate: true, brand: true, model: true, year: true },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
        _count: { select: { serviceOrders: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: { tenantId, ...dto },
    });
  }

  async update(tenantId: string, customerId: string, dto: UpdateCustomerDto) {
    await this.findById(tenantId, customerId);
    return this.prisma.customer.update({
      where: { id: customerId },
      data: dto,
    });
  }

  async delete(tenantId: string, customerId: string) {
    await this.findById(tenantId, customerId);
    return this.prisma.customer.delete({
      where: { id: customerId },
    });
  }
}