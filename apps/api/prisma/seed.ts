import {
  PrismaClient,
  OrganizationType,
  OrganizationStatus,
  UserRole,
  UserStatus,
  ProductStatus,
  ShipmentStatus,
  QualityCheckResult,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data in reverse order of foreign keys
  await prisma.auditLog.deleteMany();
  await prisma.blockchainTransaction.deleteMany();
  await prisma.qualityCheck.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Organizations
  console.log('Creating organizations...');
  const manufacturerOrg = await prisma.organization.create({
    data: {
      name: 'Apex Tech Manufacturing',
      code: 'ORG-MFG-001',
      type: OrganizationType.MANUFACTURER,
      address: '88 Industrial Park Road, Bangkok, Thailand',
      contactEmail: 'contact@apextech.com',
      phone: '+66 2 123 4567',
      walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      status: OrganizationStatus.ACTIVE,
    },
  });

  const distributorOrg = await prisma.organization.create({
    data: {
      name: 'Global Express Distribution',
      code: 'ORG-DST-001',
      type: OrganizationType.DISTRIBUTOR,
      address: '102 Logistics Boulevard, Samut Prakan, Thailand',
      contactEmail: 'ops@globalexpress.com',
      phone: '+66 2 765 4321',
      walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      status: OrganizationStatus.ACTIVE,
    },
  });

  const warehouseOrg = await prisma.organization.create({
    data: {
      name: 'SafeHub Logistics & Storage',
      code: 'ORG-WRH-001',
      type: OrganizationType.WAREHOUSE,
      address: '45 Warehouse District, Chonburi, Thailand',
      contactEmail: 'support@safehub.com',
      phone: '+66 38 123 999',
      walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      status: OrganizationStatus.ACTIVE,
    },
  });

  const retailerOrg = await prisma.organization.create({
    data: {
      name: 'Prime Retail Store',
      code: 'ORG-RTL-001',
      type: OrganizationType.RETAILER,
      address: '999 Sukhumvit Road, Bangkok, Thailand',
      contactEmail: 'store@primeretail.com',
      phone: '+66 2 999 8888',
      walletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      status: OrganizationStatus.ACTIVE,
    },
  });

  const auditorOrg = await prisma.organization.create({
    data: {
      name: 'ChainAudit Global',
      code: 'ORG-AUD-001',
      type: OrganizationType.AUDITOR,
      address: '1 Financial Tower, Sathorn, Bangkok, Thailand',
      contactEmail: 'audit@chainaudit.com',
      phone: '+66 2 555 1212',
      walletAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
      status: OrganizationStatus.ACTIVE,
    },
  });

  // 2. Users
  console.log('Creating users...');
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@bmost.io',
      passwordHash: defaultPassword,
      firstName: 'Admin',
      lastName: 'Platform',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const orgAdmin = await prisma.user.create({
    data: {
      email: 'orgadmin@bmost.io',
      passwordHash: defaultPassword,
      firstName: 'Thana',
      lastName: 'Manager',
      role: UserRole.ORG_ADMIN,
      organizationId: manufacturerOrg.id,
      status: UserStatus.ACTIVE,
    },
  });

  const mfgUser = await prisma.user.create({
    data: {
      email: 'manufacturer@bmost.io',
      passwordHash: defaultPassword,
      firstName: 'Somchai',
      lastName: 'Maker',
      role: UserRole.MANUFACTURER,
      organizationId: manufacturerOrg.id,
      status: UserStatus.ACTIVE,
    },
  });

  const dstUser = await prisma.user.create({
    data: {
      email: 'distributor@bmost.io',
      passwordHash: defaultPassword,
      firstName: 'Wichai',
      lastName: 'Logistics',
      role: UserRole.DISTRIBUTOR,
      organizationId: distributorOrg.id,
      status: UserStatus.ACTIVE,
    },
  });

  const wrhUser = await prisma.user.create({
    data: {
      email: 'warehouse@bmost.io',
      passwordHash: defaultPassword,
      firstName: 'Anan',
      lastName: 'Storage',
      role: UserRole.WAREHOUSE,
      organizationId: warehouseOrg.id,
      status: UserStatus.ACTIVE,
    },
  });

  const rtlUser = await prisma.user.create({
    data: {
      email: 'retailer@bmost.io',
      passwordHash: defaultPassword,
      firstName: 'Kanya',
      lastName: 'Merchant',
      role: UserRole.RETAILER,
      organizationId: retailerOrg.id,
      status: UserStatus.ACTIVE,
    },
  });

  const audUser = await prisma.user.create({
    data: {
      email: 'auditor@bmost.io',
      passwordHash: defaultPassword,
      firstName: 'Piti',
      lastName: 'Inspector',
      role: UserRole.AUDITOR,
      organizationId: auditorOrg.id,
      status: UserStatus.ACTIVE,
    },
  });

  // 3. Products
  console.log('Creating products...');
  const product1 = await prisma.product.create({
    data: {
      productCode: 'PROD-2026-001',
      serialNumber: 'SN-APEX-9001',
      name: 'B-MOST IoT Secure Sensor Node v1',
      description: 'Industrial IoT environmental monitoring node with cryptographic tamper detection',
      category: 'Electronics',
      manufacturerId: manufacturerOrg.id,
      currentOwnerId: manufacturerOrg.id,
      blockchainProductId: '1',
      productHash: '0x4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
      blockchainTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      status: ProductStatus.QUALITY_CHECKED,
    },
  });

  // 4. Quality Checks
  console.log('Creating quality check...');
  await prisma.qualityCheck.create({
    data: {
      productId: product1.id,
      organizationId: manufacturerOrg.id,
      inspectorName: 'Somchai Maker',
      result: QualityCheckResult.PASSED,
      notes: 'Calibrated sensors; cryptographic hardware verified with zero error tolerances.',
      blockchainTxHash: '0x2234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
  });

  // 5. Shipments
  console.log('Creating shipment...');
  await prisma.shipment.create({
    data: {
      shipmentCode: 'SHIP-2026-0001',
      productId: product1.id,
      senderOrganizationId: manufacturerOrg.id,
      receiverOrganizationId: distributorOrg.id,
      carrierOrganizationId: distributorOrg.id,
      origin: 'Apex Tech Factory #1, Bangkok',
      destination: 'Global Express Hub #2, Samut Prakan',
      status: ShipmentStatus.PENDING,
      blockchainShipmentId: '1',
      blockchainTxHash: '0x3234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
  });

  // 6. Audit Logs
  console.log('Creating initial audit logs...');
  await prisma.auditLog.create({
    data: {
      userId: superAdmin.id,
      action: 'SYSTEM_INITIALIZED',
      entityType: 'System',
      entityId: 'ROOT',
      metadata: { initializedBy: 'superadmin@bmost.io', version: '1.0.0' },
      ipAddress: '127.0.0.1',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: mfgUser.id,
      organizationId: manufacturerOrg.id,
      action: 'PRODUCT_REGISTERED',
      entityType: 'Product',
      entityId: product1.id,
      metadata: { productCode: product1.productCode, serialNumber: product1.serialNumber },
      ipAddress: '127.0.0.1',
    },
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
