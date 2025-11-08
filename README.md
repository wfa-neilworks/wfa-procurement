# WFA Procurement - React Application

Modern procurement management system built with React, TypeScript, and Supabase.

## Overview

This is the React/TypeScript reimplementation of the WFA Procurement system, replacing the vanilla JavaScript + Firebase version. The new stack provides better maintainability, type safety, and scalability.

### Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Custom components (shadcn/ui style)
- **Routing**: React Router v6
- **State Management**: TanStack Query + Zustand
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Deployment**: Vercel

### Features

- **Inventory Management**: Track stock levels across 6 categories
- **Stock Movements**: Audit trail for all stock changes
- **Saved Forms**: Pre-configured deduction forms
- **Suppliers**: Manage supplier information and certificates
- **Purchase Orders**: Track PO status and backorders
- **SDS Registry**: Chemical safety data sheets
- **Pallet Monitoring**: Container unloading logs
- **Authentication**: Secure email/password login

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- Supabase account (free tier works)

### Local Development

1. **Clone the repository**:
   \`\`\`bash
   git clone https://github.com/YOUR_USERNAME/wfa-procurement-react.git
   cd wfa-procurement-react
   \`\`\`

2. **Install dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables**:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

   Edit `.env` and add your Supabase credentials:
   \`\`\`bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   \`\`\`

4. **Set up Supabase database**:
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Go to SQL Editor in your Supabase dashboard
   - Copy contents of `supabase-schema.sql`
   - Paste and run in SQL Editor

5. **Start development server**:
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Open in browser**:
   - Navigate to [http://localhost:5173](http://localhost:5173)

### Create First User

In Supabase Dashboard:
1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Enter email and password
4. Use these credentials to sign in

---

## Project Structure

\`\`\`
wfa-procurement-react/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx          # Main layout with auth
│   │   │   └── Sidebar.tsx         # Navigation sidebar
│   │   └── ui/                     # Reusable UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       └── table.tsx
│   ├── features/                   # Feature modules
│   │   ├── home/
│   │   │   └── HomePage.tsx
│   │   ├── inventory/
│   │   │   └── InventoryPage.tsx
│   │   ├── suppliers/
│   │   │   └── SuppliersPage.tsx
│   │   ├── sds/
│   │   │   └── SDSPage.tsx
│   │   ├── pallets/
│   │   │   └── PalletsPage.tsx
│   │   ├── purchase-orders/
│   │   │   └── PurchaseOrdersPage.tsx
│   │   ├── reports/
│   │   │   └── ReportsPage.tsx
│   │   └── settings/
│   │       └── SettingsPage.tsx
│   ├── hooks/
│   │   └── useAuth.tsx             # Authentication hook
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client
│   │   └── utils.ts                # Utility functions
│   ├── types/
│   │   ├── database.ts             # Supabase types
│   │   └── index.ts                # App types
│   ├── App.tsx                     # Root component
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Global styles
├── supabase-schema.sql             # Database schema
├── DEPLOYMENT.md                   # Deployment guide
├── MIGRATION.md                    # Migration guide
├── vercel.json                     # Vercel config
└── package.json
\`\`\`

---

## Development

### Available Scripts

\`\`\`bash
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check
npm run type-check
\`\`\`

### Adding a New Feature

1. Create feature folder in `src/features/feature-name/`
2. Create page component: `FeaturePage.tsx`
3. Create hooks for data fetching in `src/hooks/useFeature.ts`
4. Add route in `src/App.tsx`
5. Add navigation link in `src/components/layout/Sidebar.tsx`

Example hook pattern:

\`\`\`typescript
// src/hooks/useSuppliers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    }
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (supplier) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplier)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    }
  })
}
\`\`\`

### Code Style

- Use TypeScript for all new code
- Use functional components with hooks
- Follow existing component patterns
- Use Tailwind utility classes for styling
- Keep components focused and single-purpose

---

## Database

### Schema Overview

The Supabase schema includes:

- **products**: Inventory items with stock levels
- **stock_movements**: Audit log for stock changes (append-only)
- **order_forms**: Saved deduction forms
- **suppliers**: Supplier information and certificates
- **purchase_orders**: PO tracking with status
- **sds_chemicals**: Chemical registry with PDF links
- **pallet_unloads**: Container logs

See `supabase-schema.sql` for complete schema with indexes and RLS policies.

### Row Level Security (RLS)

- Most tables: Public read, authenticated write
- Purchase orders: Authenticated only for all operations
- Stock movements: Append-only (no updates/deletes)

### Making Database Changes

1. Update `supabase-schema.sql` with new migration
2. Run migration in Supabase SQL Editor
3. Update TypeScript types in `src/types/database.ts`
4. Optional: Generate types automatically:
   \`\`\`bash
   npx supabase gen types typescript --project-id your-project-id > src/types/database.ts
   \`\`\`

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

### Quick Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/wfa-procurement-react)

---

## Migration

Migrating from the old Firebase app? See [MIGRATION.md](./MIGRATION.md) for step-by-step instructions.

**Migration checklist**:
- [ ] Set up Supabase project
- [ ] Run database migration
- [ ] Implement features
- [ ] Export Firebase data
- [ ] Transform data to Supabase format
- [ ] Import data
- [ ] Migrate PDFs to Supabase Storage
- [ ] Test thoroughly
- [ ] Deploy and cutover

---

## Common Tasks

### Adding a New UI Component

Use the shadcn/ui pattern:

\`\`\`typescript
// src/components/ui/badge.tsx
import { cn } from '../../lib/utils'

export function Badge({ className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        className
      )}
      {...props}
    />
  )
}
\`\`\`

### CSV Export

Use the utility function:

\`\`\`typescript
import { downloadCsv } from '../lib/utils'

function exportSuppliers(suppliers) {
  const data = [
    ['Name', 'Contact', 'Email', 'Phone'],
    ...suppliers.map(s => [s.name, s.contact, s.email, s.phone])
  ]
  downloadCsv('suppliers.csv', data)
}
\`\`\`

### Dark Mode

The app includes dark mode support via Tailwind CSS. To implement a theme toggle:

\`\`\`typescript
function ThemeToggle() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Toggle Theme
    </button>
  )
}
\`\`\`

---

## Troubleshooting

### App doesn't start

**Error**: "Missing Supabase environment variables"
- Check `.env` file exists
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart dev server after changing `.env`

### Database queries fail

**Error**: "permission denied for table"
- Check RLS policies in Supabase dashboard
- Verify user is authenticated
- Check table policies allow the operation

### Build fails

**Error**: TypeScript errors
- Run `npm run type-check` to see all type errors
- Fix missing types or use `any` temporarily
- Regenerate database types if schema changed

---

## Contributing

### Reporting Issues

Open an issue with:
- Description of the problem
- Steps to reproduce
- Expected behavior
- Screenshots (if applicable)
- Browser/environment details

### Pull Requests

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes and commit: `git commit -m "Add my feature"`
4. Push to branch: `git push origin feature/my-feature`
5. Open pull request

---

## License

Proprietary - WFA Internal Use Only

---

## Support

- **Documentation**: See `DEPLOYMENT.md` and `MIGRATION.md`
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev

---

## Roadmap

### Phase 1: Foundation (DONE ✅)
- [x] React + TypeScript setup
- [x] Supabase schema
- [x] Authentication
- [x] Base components
- [x] Routing

### Phase 2: Features (IN PROGRESS 🚧)
- [ ] Implement Home (Saved Forms)
- [ ] Implement Inventory
- [ ] Implement Suppliers
- [ ] Implement SDS
- [ ] Implement Pallets
- [ ] Implement Purchase Orders

### Phase 3: Migration (TODO 📋)
- [ ] Data migration scripts
- [ ] PDF upload to Supabase Storage
- [ ] User migration
- [ ] Testing and cutover

### Phase 4: Enhancements (FUTURE 🔮)
- [ ] Reports and analytics
- [ ] Advanced search
- [ ] Bulk operations
- [ ] Mobile app
- [ ] API for integrations

---

Built with ❤️ for WFA Procurement
