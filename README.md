# CAI2RUS Business OS — Enterprise SaaS Platform

Full-stack enterprise system: CRM + Operations + Finance + Marketing + Procurement

##  Login Credentials

| Role            | Email              | Password      |
|-----------------|--------------------|---------------|
| Super Admin     | admin@crm.com      | Admin@123     |
| Sales Rep       | sales@crm.com      | Sales@123     |
| Project Manager | pm@crm.com         | PM@123        |
| Engineer        | eng@crm.com        | Eng@123       |
| Finance Manager | finance@crm.com    | Finance@123   |

##  Quick Start

```bash
# Database
mysql -u root -p -e "CREATE DATABASE crm_saas;"

# Backend
cd backend
cp .env.example .env    # Set DATABASE_URL and JWT_SECRET
npm install
npx prisma generate
npx prisma db push
node src/lib/seed.js
npm run dev             # → http://localhost:5000

# Frontend
cd frontend
cp .env.local.example .env.local
npm install
npm run dev             # → http://localhost:3000
```

##  10 Modules

| # | Module       | Routes                          |
|---|--------------|---------------------------------|
| 1 | Auth         | /auth                           |
| 2 | CRM          | /leads /deals /clients          |
| 3 | Projects     | /projects /milestones           |
| 4 | Tasks        | /tasks                          |
| 5 | Team         | /team /users                    |
| 6 | Finance      | /invoices /payments /expenses /finance |
| 7 | Payroll      | /payroll                        |
| 8 | Marketing    | /campaigns                      |
| 9 | Procurement  | /procurement/vendors /rfqs /quotations /orders |
| 10| System       | /notifications /activity-log /dashboard/ceo |

##  Automation Engine

| Trigger         | Action                                      |
|-----------------|---------------------------------------------|
| Deal WON        | Auto-create Client + Project + Notify PMs   |
| Payment received| Log revenue + Notify Finance team           |
| Task assigned   | Push notification to assignee               |
| Expense added   | Log activity + Update profit snapshot       |

##  Design System

- Primary Blue: `#004AFF`
- Accent Green: `#C9FC0D` (CTA only)
- Background:   `#0D0E1A`
- Surface:      `#1A2035`
- Border:       `#334155`
