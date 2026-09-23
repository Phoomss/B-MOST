import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRelations() {
  console.log('🔍 Testing database relations...');

  // 1. Organization -> Users, Products, Shipments
  const org = await prisma.organization.findUniqueOrThrow({
    where: { code: 'ORG-MFG-001' },
    include: {
      users: true,
      productsManufactured: true,
      productsOwned: true,
      shipmentsSent: true,
      qualityChecks: true,
    },
  });

  if (org.users.length === 0) throw new Error('Org relation to Users failed');
  if (org.productsManufactured.length === 0) throw new Error('Org relation to ProductsManufactured failed');
  if (org.shipmentsSent.length === 0) throw new Error('Org relation to ShipmentsSent failed');
  if (org.qualityChecks.length === 0) throw new Error('Org relation to QualityChecks failed');
  console.log(`✓ Organization relations verified (Org: ${org.name}, Users: ${org.users.length}, Products: ${org.productsManufactured.length})`);

  // 2. Product -> Manufacturer, Owner, QualityChecks, Shipments
  const product = await prisma.product.findUniqueOrThrow({
    where: { productCode: 'PROD-2026-001' },
    include: {
      manufacturer: true,
      currentOwner: true,
      qualityChecks: true,
      shipments: true,
    },
  });

  if (!product.manufacturer) throw new Error('Product relation to Manufacturer failed');
  if (!product.currentOwner) throw new Error('Product relation to Owner failed');
  if (product.qualityChecks.length === 0) throw new Error('Product relation to QualityChecks failed');
  if (product.shipments.length === 0) throw new Error('Product relation to Shipments failed');
  console.log(`✓ Product relations verified (Product: ${product.name}, Checks: ${product.qualityChecks.length}, Shipments: ${product.shipments.length})`);

  // 3. Shipment -> Product, Sender, Receiver
  const shipment = await prisma.shipment.findUniqueOrThrow({
    where: { shipmentCode: 'SHIP-2026-0001' },
    include: {
      product: true,
      sender: true,
      receiver: true,
    },
  });

  if (!shipment.product) throw new Error('Shipment relation to Product failed');
  if (!shipment.sender) throw new Error('Shipment relation to Sender failed');
  if (!shipment.receiver) throw new Error('Shipment relation to Receiver failed');
  console.log(`✓ Shipment relations verified (Shipment: ${shipment.shipmentCode}, From: ${shipment.sender.name}, To: ${shipment.receiver.name})`);

  // 4. User -> Organization & Audit Logs
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: 'manufacturer@bmost.io' },
    include: {
      organization: true,
      auditLogs: true,
    },
  });

  if (!user.organization) throw new Error('User relation to Organization failed');
  if (user.auditLogs.length === 0) throw new Error('User relation to AuditLogs failed');
  console.log(`✓ User relations verified (User: ${user.email}, Org: ${user.organization.name}, Logs: ${user.auditLogs.length})`);

  // 5. QualityCheck -> Product, Organization
  const qc = await prisma.qualityCheck.findFirstOrThrow({
    include: {
      product: true,
      organization: true,
    },
  });

  if (!qc.product) throw new Error('QualityCheck relation to Product failed');
  if (!qc.organization) throw new Error('QualityCheck relation to Organization failed');
  console.log(`✓ QualityCheck relations verified (Inspector: ${qc.inspectorName}, Result: ${qc.result})`);

  console.log('\n🎉 ALL DATABASE RELATIONS WORK AS EXPECTED!');
}

testRelations()
  .catch((e) => {
    console.error('❌ Relation test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
