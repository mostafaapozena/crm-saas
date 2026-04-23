CAI2RUS Business OS — Enterprise SaaS Platform

Full-stack enterprise system: CRM + Operations + Finance + Marketing + Procurement

------------------------------------------------------------

LOGIN CREDENTIALS

Role: Super Admin
Email: admin@crm.com
Password: Admin@123

Role: Sales Rep
Email: sales@crm.com
Password: Sales@123

Role: Project Manager
Email: pm@crm.com
Password: PM@123

Role: Engineer
Email: eng@crm.com
Password: Eng@123

Role: Finance Manager
Email: finance@crm.com
Password: Finance@123

------------------------------------------------------------

QUICK START

# Database
mysql -u root -p -e "CREATE DATABASE crm_saas;"

# Backend
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
node src/lib/seed.js
npm run dev

Backend runs on: http://localhost:5000

# Frontend
cd frontend
cp .env.local.example .env.local
npm install
npm run dev

Frontend runs on: http://localhost:3000

------------------------------------------------------------

10 MODULES

1. Auth
/auth

2. CRM
/leads
/deals
/clients

3. Projects
/projects
/milestones

4. Tasks
/tasks

5. Team
/team
/users

6. Finance
/invoices
/payments
/expenses
/finance

7. Payroll
/payroll

8. Marketing
/campaigns

9. Procurement
/procurement/vendors
/rfqs
/quotations
/orders

10. System
/notifications
/activity-log
/dashboard/ceo

------------------------------------------------------------

AUTOMATION ENGINE

Trigger: Deal WON
Action: Auto-create Client + Project + Notify PMs

Trigger: Payment received
Action: Log revenue + Notify Finance team

Trigger: Task assigned
Action: Push notification to assignee

Trigger: Expense added
Action: Log activity + Update profit snapshot

------------------------------------------------------------

DESIGN SYSTEM

Primary Blue: #004AFF
Accent Green: #C9FC0D (CTA only)
Background: #0D0E1A
Surface: #1A2035
Border: #334155