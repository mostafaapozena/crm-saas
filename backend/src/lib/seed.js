require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const seedRoles = require('./seedRoles');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Role catalogue (must run before user creation) ────────────────────────
  await seedRoles(prisma);

  // Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@crm.com',
      password: await bcrypt.hash('Admin@123', 12),
      role: 'SUPER_ADMIN',
    },
  });

  // Create Sales User
  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@crm.com' },
    update: {},
    create: {
      name: 'Sales Rep',
      email: 'sales@crm.com',
      password: await bcrypt.hash('Sales@123', 12),
      role: 'SALES',
    },
  });

  console.log('✅ Users created:', { superAdmin: superAdmin.email, salesUser: salesUser.email });

  // Create sample leads
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        phone: '+1-555-0100',
        source: 'Website',
        stage: 'QUALIFIED',
        deal_value: 25000,
        probability: 60,
        created_by: superAdmin.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: 'TechStart Inc',
        email: 'hello@techstart.io',
        phone: '+1-555-0101',
        source: 'Referral',
        stage: 'PROPOSAL_SENT',
        deal_value: 48000,
        probability: 75,
        created_by: salesUser.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: 'Global Ventures',
        email: 'info@globalventures.com',
        phone: '+1-555-0102',
        source: 'LinkedIn',
        stage: 'NEGOTIATION',
        deal_value: 120000,
        probability: 85,
        created_by: superAdmin.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: 'Bright Ideas LLC',
        email: 'team@brightideas.co',
        phone: '+1-555-0103',
        source: 'Cold Call',
        stage: 'WON',
        deal_value: 35000,
        probability: 100,
        created_by: salesUser.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: 'DataFlow Systems',
        email: 'contact@dataflow.net',
        phone: '+1-555-0104',
        source: 'Event',
        stage: 'LEAD',
        deal_value: 15000,
        probability: 20,
        created_by: salesUser.id,
      },
    }),
  ]);

  console.log(`✅ Created ${leads.length} sample leads`);

  // Create sample clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'Sarah Johnson',
        company: 'Bright Ideas LLC',
        email: 'sarah@brightideas.co',
        phone: '+1-555-0200',
      },
    }),
    prisma.client.create({
      data: {
        name: 'Michael Chen',
        company: 'Acme Corporation',
        email: 'mchen@acme.com',
        phone: '+1-555-0201',
      },
    }),
  ]);

  console.log(`✅ Created ${clients.length} sample clients`);

  // Create sample deals
  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        lead_id: leads[3].id,
        client_id: clients[0].id,
        value: 35000,
        status: 'WON',
        expected_close_date: new Date('2024-03-31'),
      },
    }),
    prisma.deal.create({
      data: {
        lead_id: leads[2].id,
        client_id: clients[1].id,
        value: 120000,
        status: 'ACTIVE',
        expected_close_date: new Date('2024-05-15'),
      },
    }),
    prisma.deal.create({
      data: {
        lead_id: leads[1].id,
        value: 48000,
        status: 'ACTIVE',
        expected_close_date: new Date('2024-04-30'),
      },
    }),
  ]);

  console.log(`✅ Created ${deals.length} sample deals`);
  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Super Admin: admin@crm.com / Admin@123');
  console.log('   Sales Rep:   sales@crm.com / Sales@123');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

// ─── PHASE 2 SEED ────────────────────────────────────────────────────────────
async function seedPhase2() {
  const prisma2 = new (require('@prisma/client').PrismaClient)();

  // Create project manager user
  const pm = await prisma2.user.upsert({
    where: { email: 'pm@crm.com' },
    update: {},
    create: {
      name: 'Project Manager',
      email: 'pm@crm.com',
      password: await require('bcryptjs').hash('PM@123', 12),
      role: 'PROJECT_MANAGER',
      department: 'Operations',
    },
  });

  const engineer = await prisma2.user.upsert({
    where: { email: 'eng@crm.com' },
    update: {},
    create: {
      name: 'Lead Engineer',
      email: 'eng@crm.com',
      password: await require('bcryptjs').hash('Eng@123', 12),
      role: 'ENGINEER',
      department: 'Engineering',
    },
  });

  // Grab first client
  const client = await prisma2.client.findFirst();

  // Create sample projects
  const proj1 = await prisma2.project.create({
    data: {
      title: 'CRM Platform Upgrade',
      description: 'Full upgrade of client CRM platform to latest stack.',
      client_id: client?.id || null,
      type: 'ICT',
      status: 'IN_PROGRESS',
      budget: 85000,
      progress_percentage: 45,
      start_date: new Date('2024-01-15'),
      end_date: new Date('2024-06-30'),
    },
  });

  const proj2 = await prisma2.project.create({
    data: {
      title: 'Q2 Marketing Campaign',
      description: 'Digital marketing push for Q2 product launch.',
      client_id: client?.id || null,
      type: 'MARKETING_CAMPAIGN',
      status: 'PLANNING',
      budget: 25000,
      progress_percentage: 10,
      start_date: new Date('2024-04-01'),
      end_date: new Date('2024-05-31'),
    },
  });

  const proj3 = await prisma2.project.create({
    data: {
      title: 'ERP System Integration',
      description: 'Hybrid integration project connecting ERP with CRM.',
      type: 'HYBRID',
      status: 'REVIEW',
      budget: 150000,
      progress_percentage: 80,
      start_date: new Date('2023-10-01'),
      end_date: new Date('2024-03-31'),
    },
  });

  // Create tasks
  const tasks = [
    { title: 'Set up CI/CD pipeline', project_id: proj1.id, assigned_to: engineer.id, status: 'DONE', priority: 'HIGH' },
    { title: 'Database schema migration', project_id: proj1.id, assigned_to: engineer.id, status: 'IN_PROGRESS', priority: 'HIGH' },
    { title: 'API endpoint redesign', project_id: proj1.id, assigned_to: engineer.id, status: 'TODO', priority: 'MEDIUM' },
    { title: 'Frontend component library', project_id: proj1.id, status: 'TODO', priority: 'MEDIUM' },
    { title: 'Define campaign goals', project_id: proj2.id, assigned_to: pm.id, status: 'DONE', priority: 'HIGH' },
    { title: 'Content calendar creation', project_id: proj2.id, status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { title: 'Social media assets', project_id: proj2.id, status: 'TODO', priority: 'LOW' },
    { title: 'ERP API documentation review', project_id: proj3.id, assigned_to: engineer.id, status: 'DONE', priority: 'HIGH' },
    { title: 'Integration testing', project_id: proj3.id, assigned_to: engineer.id, status: 'IN_REVIEW', priority: 'HIGH' },
    { title: 'UAT sign-off', project_id: proj3.id, assigned_to: pm.id, status: 'TODO', priority: 'HIGH', due_date: new Date('2024-03-20') },
  ];

  const superAdmin = await prisma2.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  for (const t of tasks) {
    await prisma2.task.create({ data: { ...t, created_by: superAdmin?.id || pm.id } });
  }

  console.log('✅ Phase 2 seed: 3 projects, 10 tasks, 2 new team members');
  console.log('   PM: pm@crm.com / PM@123');
  console.log('   Engineer: eng@crm.com / Eng@123');

  await prisma2.$disconnect();
}

// Run phase 2 seed if called standalone
if (require.main === module) {
  const bcrypt = require('bcryptjs');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  main().then(() => seedPhase2()).catch(console.error).finally(() => prisma.$disconnect());
} else {
  module.exports.seedPhase2 = seedPhase2;
}

// ─── PHASE 3 SEED ────────────────────────────────────────────────────────────
async function seedPhase3() {
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();

  // Finance manager user
  const bcrypt = require('bcryptjs');
  const fm = await db.user.upsert({
    where: { email: 'finance@crm.com' },
    update: {},
    create: {
      name: 'Finance Manager',
      email: 'finance@crm.com',
      password: await bcrypt.hash('Finance@123', 12),
      role: 'FINANCE_MANAGER',
      department: 'Finance',
    },
  });

  const client = await db.client.findFirst();
  const project = await db.project.findFirst();
  const deal = await db.deal.findFirst({ where: { status: 'WON' } });

  if (client) {
    // Sample invoice
    const invoice = await db.invoice.create({
      data: {
        client_id: client.id,
        project_id: project?.id || null,
        deal_id: deal?.id || null,
        invoice_number: `INV-${new Date().getFullYear()}-0001`,
        amount: 25000,
        tax: 15,
        total_amount: 28750,
        status: 'SENT',
        issued_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        created_by: fm.id,
      },
    });

    // Sample payment
    await db.payment.create({
      data: {
        invoice_id: invoice.id,
        amount_paid: 14375,
        payment_method: 'BANK_TRANSFER',
        payment_date: new Date(),
        reference_number: 'TXN-2024-001',
      },
    });
  }

  // Sample expenses
  const admin = await db.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  const expenses = [
    { title: 'Google Ads Q1', category: 'ADS', amount: 3200, project_id: project?.id },
    { title: 'AWS Infrastructure', category: 'TOOLS', amount: 1800, project_id: project?.id },
    { title: 'Developer Salary — March', category: 'SALARY', amount: 8500 },
    { title: 'Office Utilities', category: 'UTILITIES', amount: 420 },
    { title: 'Vendor API License', category: 'VENDOR', amount: 950, project_id: project?.id },
  ];
  for (const e of expenses) {
    await db.expense.create({ data: { ...e, created_by: fm.id, date: new Date() } });
  }

  console.log('\n✅ Phase 3 seed complete:');
  console.log('   Finance Manager: finance@crm.com / Finance@123');
  console.log('   1 invoice, 1 partial payment, 5 expenses added');

  await db.$disconnect();
}

if (require.main === module) {
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  main()
    .then(() => { if (typeof seedPhase2 === 'function') return seedPhase2() })
    .then(() => seedPhase3())
    .catch(console.error)
    .finally(() => p.$disconnect());
}
