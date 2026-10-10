import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.vehicle.findMany({
      where: { tenantId },
      include: { customer: true },
      orderBy: { plate: 'asc' },
    });
  }

  async findById(tenantId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId },
      include: {
        customer: true,
        serviceOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async create(tenantId: string, dto: CreateVehicleDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const existing = await this.prisma.vehicle.findFirst({
      where: { tenantId, plate: dto.plate },
    });

    if (existing) {
      throw new ConflictException('Vehicle with this plate already exists');
    }

    return this.prisma.vehicle.create({
      data: { tenantId, ...this.normalizeDates(dto) },
      include: { customer: true },
    });
  }

  async update(tenantId: string, vehicleId: string, dto: UpdateVehicleDto) {
    await this.findById(tenantId, vehicleId);

    if (dto.plate) {
      const existing = await this.prisma.vehicle.findFirst({
        where: { tenantId, plate: dto.plate, NOT: { id: vehicleId } },
      });

      if (existing) {
        throw new ConflictException('Vehicle with this plate already exists');
      }
    }

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: this.normalizeDates(dto),
      include: { customer: true },
    });
  }

  // O front envia "YYYY-MM-DD"; o Prisma exige DateTime ISO completo.
  private normalizeDates<T extends { lastMaintenanceDate?: string }>(dto: T) {
    const { lastMaintenanceDate, ...rest } = dto;
    if (lastMaintenanceDate === undefined) return rest;
    return {
      ...rest,
      lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : null,
    };
  }

  async delete(tenantId: string, vehicleId: string) {
    await this.findById(tenantId, vehicleId);
    return this.prisma.vehicle.delete({
      where: { id: vehicleId },
    });
  }

  async findByPlate(tenantId: string, plate: string) {
    return this.prisma.vehicle.findFirst({
      where: { tenantId, plate },
      include: { customer: true },
    });
  }
}