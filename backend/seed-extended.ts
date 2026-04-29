import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const customers = [
  { name: 'Carlos Eduardo Mendes', document: '234.567.890-11', email: 'carlos.mendes@email.com', phone: '(11) 98888-1234', address: 'Rua Augusta, 200 - São Paulo, SP', cidade: 'São Paulo', estado: 'SP' },
  { name: 'Ana Paula Rodrigues', document: '345.678.901-22', email: 'ana.rodrigues@email.com', phone: '(11) 97777-2345', address: 'Av. Brasil, 450 - Campinas, SP', cidade: 'Campinas', estado: 'SP' },
  { name: 'Ricardo Souza Lima', document: '456.789.012-33', email: 'ricardo.lima@email.com', phone: '(11) 96666-3456', address: 'Rua das Acácias, 80 - Rio de Janeiro, RJ', cidade: 'Rio de Janeiro', estado: 'RJ' },
  { name: 'Fernanda Costa Oliveira', document: '567.890.123-44', email: 'fernanda.oliveira@email.com', phone: '(21) 95555-4567', address: 'Av. Atlântica, 1200 - Rio de Janeiro, RJ', cidade: 'Rio de Janeiro', estado: 'RJ' },
  { name: 'Paulo Henrique Santos', document: '678.901.234-55', email: 'paulo.santos@email.com', phone: '(31) 94444-5678', address: 'Rua Paraná, 350 - Belo Horizonte, MG', cidade: 'Belo Horizonte', estado: 'MG' },
  { name: 'Juliana Martins Ferreira', document: '789.012.345-66', email: 'juliana.ferreira@email.com', phone: '(41) 93333-6789', address: 'Av. Sete de Setembro, 2000 - Curitiba, PR', cidade: 'Curitiba', estado: 'PR' },
  { name: 'André Luis Barbosa', document: '890.123.456-77', email: 'andre.barbosa@email.com', phone: '(51) 92222-7890', address: 'Av. Ipiranga, 1500 - Porto Alegre, RS', cidade: 'Porto Alegre', estado: 'RS' },
  { name: 'Carla Beatriz Almeida', document: '901.234.567-88', email: 'carla.almeida@email.com', phone: '(62) 91111-8901', address: 'Av. Anhanguera, 800 - Goiânia, GO', cidade: 'Goiânia', estado: 'GO' },
  { name: 'Marcos Vinícius Pereira', document: '012.345.678-99', email: 'marcos.pereira@email.com', phone: '(71) 90000-9012', address: 'Av. ACM, 3000 - Salvador, BA', cidade: 'Salvador', estado: 'BA' },
  { name: 'Luciana Ferreira Nunes', document: '123.456.789-00', email: 'luciana.nunes@email.com', phone: '(11) 98888-0123', address: 'Rua Oscar Freire, 500 - São Paulo, SP', cidade: 'São Paulo', estado: 'SP' },
  { name: 'Diego Henrique Ramos', document: '234.567.890-01', email: 'diego.ramos@email.com', phone: '(11) 97777-1234', address: 'Av. Faria Lima, 1000 - São Paulo, SP', cidade: 'São Paulo', estado: 'SP' },
  { name: 'Renata Cristina Souza', document: '345.678.901-02', email: 'renata.souza@email.com', phone: '(19) 96666-2345', address: 'Rua Bento Carlos, 200 - Piracicaba, SP', cidade: 'Piracicaba', estado: 'SP' },
];

const vehicles = [
  { brand: 'Toyota', model: 'Corolla', year: 2023, color: 'Prata', plate: 'GHI-9012' },
  { brand: 'Honda', model: 'Civic', year: 2022, color: 'Preto', plate: 'JKL-3456' },
  { brand: 'Ford', model: 'Ranger', year: 2021, color: 'Branco', plate: 'MNO-7890' },
  { brand: 'Volkswagen', model: 'T-Cross', year: 2023, color: 'Azul', plate: 'PQR-1234' },
  { brand: 'Chevrolet', model: 'Tracker', year: 2022, color: 'Vermelho', plate: 'STU-5678' },
  { brand: 'Fiat', model: 'Pulse', year: 2023, color: 'Cinza', plate: 'VWX-9012' },
  { brand: 'Hyundai', model: 'Creta', year: 2021, color: 'Branco', plate: 'YZA-3456' },
  { brand: 'Renault', model: 'Duster', year: 2022, color: 'Laranja', plate: 'BCD-7890' },
  { brand: 'Nissan', model: 'Kicks', year: 2023, color: 'Preto', plate: 'EFG-1234' },
  { brand: 'Jeep', model: 'Renegade', year: 2022, color: 'Verde', plate: 'HIJ-5678' },
  { brand: 'BMW', model: '320i', year: 2023, color: 'Azul', plate: 'KLM-9012' },
  { brand: 'Mercedes-Benz', model: 'A200', year: 2022, color: 'Preto', plate: 'NOP-3456' },
  { brand: 'Audi', model: 'A3', year: 2023, color: 'Branco', plate: 'QRS-7890' },
  { brand: 'Volkswagen', model: 'Polo', year: 2022, color: 'Vermelho', plate: 'TUV-1234' },
  { brand: 'Chevrolet', model: 'S10', year: 2021, color: 'Preto', plate: 'WXY-5678' },
  { brand: 'Toyota', model: 'Hilux', year: 2023, color: 'Cinza', plate: 'ZAB-9012' },
];

const services = [
  { name: 'Revisão de 10.000 km', description: 'Revisão completa aos 10.000 km', basePrice: 280.00, category: 'Revisão', duration: 60 },
  { name: 'Revisão de 20.000 km', description: 'Revisão completa aos 20.000 km', basePrice: 420.00, category: 'Revisão', duration: 90 },
  { name: 'Revisão de 30.000 km', description: 'Revisão completa aos 30.000 km', basePrice: 550.00, category: 'Revisão', duration: 120 },
  { name: 'Revisão de 50.000 km', description: 'Revisão completa aos 50.000 km', basePrice: 680.00, category: 'Revisão', duration: 150 },
  { name: 'Troca de Correia Dentada', description: 'Troca da correia dentada e componentes', basePrice: 850.00, category: 'Motor', duration: 180 },
  { name: 'Troca de Embreagem', description: 'Troca completa do kit embreagem', basePrice: 1200.00, category: 'Transmissão', duration: 240 },
  { name: 'Suspensões Dianteiras', description: 'Troca de pivôs, terminais e barras', basePrice: 450.00, category: 'Suspensão', duration: 90 },
  { name: 'Suspensões Traseiras', description: 'Troca de pivôs e barras traseiras', basePrice: 380.00, category: 'Suspensão', duration: 75 },
  { name: 'Ar Condicionado', description: 'Carga de gás e limpeza do sistema', basePrice: 320.00, category: 'Climatização', duration: 60 },
  { name: 'Scanner Diagnóstico', description: 'Diagnóstico por computador', basePrice: 150.00, category: 'Elétrica', duration: 30 },
  { name: 'Geometria Computadorizada', description: 'Alinhamento 3D computado', basePrice: 180.00, category: 'Suspensão', duration: 45 },
  { name: 'Balanceamento', description: 'Balanceamento de 4 rodas', basePrice: 80.00, category: 'Suspensão', duration: 30 },
  { name: 'Troca de Óleo do Câmbio', description: 'Troca de óleo da caixa de câmbio', basePrice: 220.00, category: 'Transmissão', duration: 45 },
  { name: 'Sangria de Freios', description: 'Sangria completa do sistema de freios', basePrice: 100.00, category: 'Freios', duration: 30 },
  { name: 'Verificação de Vazamentos', description: 'Inspeção e teste de vazamentos', basePrice: 120.00, category: 'Motor', duration: 30 },
];

const parts = [
  { name: 'Óleo Mobil 5W30', sku: 'OLEO-002', description: 'Óleo Mobil Super Synthetic 5W30 - 4L', unitPrice: 185.00, unit: 'L', minStock: 8 },
  { name: 'Filtro de Ar', sku: 'FILTRO-002', description: 'Filtro de ar do motor universal', unitPrice: 65.00, unit: 'un', minStock: 5 },
  { name: 'Filtro de Combustível', sku: 'FILTRO-003', description: 'Filtro de combustível inline', unitPrice: 85.00, unit: 'un', minStock: 4 },
  { name: 'Filtro de Cabine', sku: 'FILTRO-004', description: 'Filtro de ar da cabine', unitPrice: 75.00, unit: 'un', minStock: 6 },
  { name: 'Velas de Ignição (jogo)', sku: 'VELA-001', description: 'Velas de ignição irídio NGK (jogo 4)', unitPrice: 240.00, unit: 'jg', minStock: 3 },
  { name: 'Correia Dentada', sku: 'CORREIA-001', description: 'Correia dentada Gates', unitPrice: 180.00, unit: 'un', minStock: 2 },
  { name: 'Tensionador da Correia', sku: 'CORREIA-002', description: 'Tensionador automático Gates', unitPrice: 220.00, unit: 'un', minStock: 2 },
  { name: 'Bomba d\'Água', sku: 'BOMBA-001', description: 'Bomba d\'água SKF', unitPrice: 350.00, unit: 'un', minStock: 2 },
  { name: 'Radiador', sku: 'RAD-001', description: 'Radiador de alumínio', unitPrice: 580.00, unit: 'un', minStock: 1 },
  { name: 'Termostato', sku: 'TERM-001', description: 'Termostato 82°C universal', unitPrice: 95.00, unit: 'un', minStock: 3 },
  { name: 'Bomba de Óleo', sku: 'BOMBA-002', description: 'Bomba de óleo do motor', unitPrice: 280.00, unit: 'un', minStock: 2 },
  { name: 'Junta do Cabeçote', sku: 'JUNTA-001', description: 'Junta de cabeçote viton', unitPrice: 180.00, unit: 'un', minStock: 2 },
  { name: 'Cabo de Vela (jogo)', sku: 'CABO-001', description: 'Cabos de vela bipolar (jogo)', unitPrice: 145.00, unit: 'jg', minStock: 3 },
  { name: 'Bobina de Ignição', sku: 'BOB-001', description: 'Bobina de ignição individual', unitPrice: 195.00, unit: 'un', minStock: 4 },
  { name: 'Sensor de Oxigênio', sku: 'SENS-001', description: 'Sensor O2 universal', unitPrice: 245.00, unit: 'un', minStock: 3 },
  { name: 'Sensor MAP', sku: 'SENS-002', description: 'Sensor de pressão absoluta', unitPrice: 175.00, unit: 'un', minStock: 3 },
  { name: 'Atuador de Marcha Lenta', sku: 'ACT-001', description: 'Atuador de marcha lenta', unitPrice: 135.00, unit: 'un', minStock: 3 },
  { name: 'Liquido de Arrefecimento', sku: 'LIQ-001', description: 'Líquido coolant concentrado 1L', unitPrice: 45.00, unit: 'L', minStock: 10 },
  { name: 'Aditivo para Radiador', sku: 'LIQ-002', description: 'Aditivo anticorrosivo para radiador', unitPrice: 35.00, unit: 'L', minStock: 8 },
  { name: 'Fluido de Freio DOT 4', sku: 'FREIO-002', description: 'Fluido de freio DOT 4 - 500ml', unitPrice: 28.00, unit: 'un', minStock: 10 },
  { name: 'Fluido de Embreagem', sku: 'FREIO-003', description: 'Fluido de embreagem DOT 4 - 500ml', unitPrice: 28.00, unit: 'un', minStock: 10 },
  { name: 'Graxa para Cubos', sku: 'GRAX-001', description: 'Graxa para cubos de roda 500g', unitPrice: 32.00, unit: 'un', minStock: 6 },
  { name: 'Óleo de Câmbio 75W90', sku: 'OLEO-003', description: 'Óleo câmbio 75W90 sintético 1L', unitPrice: 75.00, unit: 'L', minStock: 6 },
  { name: 'Óleo de Diferencial 80W90', sku: 'OLEO-004', description: 'Óleo diferencial 80W90 mineral 1L', unitPrice: 55.00, unit: 'L', minStock: 6 },
];

async function seed() {
  console.log('🌱 Starting additional seed data...\n');

  // Get existing tenant
  const tenant = await prisma.tenant.findFirst({
    include: { users: true }
  });

  if (!tenant) {
    console.error('❌ No tenant found. Run the main seed first.');
    process.exit(1);
  }

  console.log(`📍 Using tenant: ${tenant.name}\n`);

  let customersAdded = 0;
  let vehiclesAdded = 0;
  let servicesAdded = 0;
  let partsAdded = 0;

  // Add customers
  console.log('👥 Adding customers...');
  for (const customerData of customers) {
    try {
      const customer = await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          ...customerData,
        }
      });
      customersAdded++;
      console.log(`   ✅ ${customer.name}`);
    } catch (e) {
      console.log(`   ⚠️  ${customerData.name} (already exists or error)`);
    }
  }

  // Get all customers
  const allCustomers = await prisma.customer.findMany({
    where: { tenantId: tenant.id }
  });

  // Add vehicles
  console.log('\n🚗 Adding vehicles...');
  for (let i = 0; i < vehicles.length; i++) {
    const vehicleData = vehicles[i];
    const customerIndex = i % allCustomers.length;
    const customer = allCustomers[customerIndex];

    try {
      const vehicle = await prisma.vehicle.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          ...vehicleData,
          km: Math.floor(Math.random() * 80000) + 5000,
        }
      });
      vehiclesAdded++;
      console.log(`   ✅ ${vehicle.plate} - ${vehicle.model} (${customer.name})`);
    } catch (e) {
      console.log(`   ⚠️  ${vehicleData.plate} (already exists or error)`);
    }
  }

  // Add services
  console.log('\n🔧 Adding services...');
  for (const serviceData of services) {
    try {
      const service = await prisma.service.create({
        data: {
          tenantId: tenant.id,
          ...serviceData,
        }
      });
      servicesAdded++;
      console.log(`   ✅ ${service.name}`);
    } catch (e) {
      console.log(`   ⚠️  ${serviceData.name} (already exists or error)`);
    }
  }

  // Add parts
  console.log('\n🔩 Adding parts...');
  for (const partData of parts) {
    try {
      const part = await prisma.part.create({
        data: {
          tenantId: tenant.id,
          ...partData,
        }
      });
      partsAdded++;
      console.log(`   ✅ ${part.name}`);
    } catch (e) {
      console.log(`   ⚠️  ${partData.name} (already exists or error)`);
    }
  }

  // Add inventory movements for parts with initial stock
  console.log('\n📦 Adding inventory movements...');
  const allParts = await prisma.part.findMany({
    where: { tenantId: tenant.id }
  });

  for (const part of allParts.slice(partsAdded > 0 ? -partsAdded : -parts.length)) {
    try {
      await prisma.inventoryMovement.create({
        data: {
          tenantId: tenant.id,
          partId: part.id,
          type: 'INPUT',
          quantity: part.minStock + Math.floor(Math.random() * 10) + 5,
          note: 'Estoque inicial',
        }
      });
    } catch (e) {
      // Ignore duplicates
    }
  }

  console.log(`
╔══════════════════════════════════════════════════════════╗
║               🎉 SEED ADICIONAL COMPLETO 🎉        ║
╠══════════════════════════════════════════════════════════╣
║  Resultados:                                       ║
║  • Clientes adicionados: ${String(customersAdded).padEnd(27)}║
║  • Veículos adicionados: ${String(vehiclesAdded).padEnd(27)}║
║  • Serviços adicionados: ${String(servicesAdded).padEnd(26)}║
║  • Peças adicionadas: ${String(partsAdded).padEnd(28)}║
╚══════════════════════════════════════════════════════════╝
  `);

  // Verify totals
  const totalCustomers = await prisma.customer.count({ where: { tenantId: tenant.id } });
  const totalVehicles = await prisma.vehicle.count({ where: { tenantId: tenant.id } });
  const totalServices = await prisma.service.count({ where: { tenantId: tenant.id } });
  const totalParts = await prisma.part.count({ where: { tenantId: tenant.id } });

  console.log('📊 Totais no banco:');
  console.log(`   Total de clientes: ${totalCustomers}`);
  console.log(`   Total de veículos: ${totalVehicles}`);
  console.log(`   Total de serviços: ${totalServices}`);
  console.log(`   Total de peças: ${totalParts}`);
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });