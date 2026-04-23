/**
 * seedRoles — idempotent role catalogue seed.
 * Run standalone:  node src/lib/seedRoles.js
 * Or imported:     require('./seedRoles')(prisma)
 *
 * key   = the string stored in User.role + used as RBAC_MATRIX lookup
 * label = human-readable display name shown in the UI dropdown
 */

require('dotenv').config({ path: '../../.env' });
const { PrismaClient } = require('@prisma/client');

const ROLES = [
  { key: 'SUPER_ADMIN',       label: 'Super Admin' },
  { key: 'FOUNDER_CEO',       label: 'Founder / CEO' },
  { key: 'SALES_MANAGER',     label: 'Sales Manager' },
  { key: 'SALES_EXECUTIVE',   label: 'Sales Executive' },
  { key: 'MARKETING_MANAGER', label: 'Marketing Manager' },
  { key: 'MEDIA_BUYER',       label: 'Media Buyer' },
  { key: 'DESIGNER',          label: 'Designer' },
  { key: 'PROJECT_MANAGER',   label: 'Project Manager' },
  { key: 'ENGINEER',          label: 'Engineer (ICT)' },
  { key: 'FINANCE_MANAGER',   label: 'Finance Manager' },
  { key: 'ACCOUNTANT',        label: 'Accountant' },
  { key: 'CASHIER',           label: 'Cashier' },
  { key: 'WAREHOUSE_STAFF',   label: 'Warehouse Staff' },
  { key: 'DELIVERY_DRIVER',   label: 'Delivery Driver' },
  { key: 'PROCUREMENT',       label: 'Procurement Officer' },
];

async function seedRoles(prismaInstance) {
  const db = prismaInstance || new PrismaClient();
  let created = 0;
  let skipped = 0;

  for (const role of ROLES) {
    const existing = await db.role.findUnique({ where: { key: role.key } });
    if (existing) {
      skipped++;
      continue;
    }
    await db.role.create({ data: role });
    created++;
  }

  console.log(`✅ Roles seeded — created: ${created}, already existed: ${skipped}`);

  if (!prismaInstance) await db.$disconnect();
  return { created, skipped };
}

// Standalone execution
if (require.main === module) {
  seedRoles()
    .then(() => console.log('Role catalogue ready.'))
    .catch((e) => { console.error('❌ Role seed failed:', e); process.exit(1); });
}

module.exports = seedRoles;
