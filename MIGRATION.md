# Migration Guide: Firebase → Supabase

This guide explains how to migrate your existing WFA Procurement app from Firebase/Netlify to React/Supabase/Vercel.

## Overview

### What's Changing

| Component | Old | New |
|-----------|-----|-----|
| **Frontend** | Vanilla JS | React + TypeScript |
| **Database** | Firebase Firestore | Supabase (PostgreSQL) |
| **Auth** | Firebase Auth | Supabase Auth |
| **Storage** | Project folder (PDFs) | Supabase Storage |
| **Hosting** | Netlify | Vercel |
| **Routing** | Hash-based (#/home) | Browser routing (/home) |

### Why Migrate?

✅ **Better maintainability**: React components vs 2,600-line monolith
✅ **Type safety**: TypeScript catches errors at compile time
✅ **Better performance**: Code splitting, lazy loading, optimized bundles
✅ **Relational data**: SQL joins instead of multiple Firestore queries
✅ **Cost savings**: Supabase is cheaper at scale than Firebase
✅ **Modern tooling**: Hot reload, React DevTools, better debugging

---

## Migration Phases

### Phase 1: Setup (DONE ✅)

- [x] Create React + TypeScript project
- [x] Design Supabase schema
- [x] Set up base components and routing
- [x] Create authentication system
- [x] Configure Vercel deployment

**You are here!** Ready to implement features and migrate data.

---

## Phase 2: Implement Features (TODO)

### Priority Order

Implement features from simplest to most complex:

1. **Pallets** (simplest - single table, CRUD)
2. **SDS Chemicals** (simple - single table with PDF links)
3. **Suppliers** (moderate - has JSON certificates field)
4. **Purchase Orders** (moderate - status management)
5. **Inventory** (complex - 6 categories, stock movements)
6. **Saved Forms** (complex - cross-table queries)

### Implementation Checklist Per Feature

For each feature, follow this pattern:

#### Example: Implementing Pallets Feature

**1. Create Supabase service hooks** (`src/hooks/usePallets.ts`):

\`\`\`typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PalletUnload } from '../types'

export function usePallets() {
  return useQuery({
    queryKey: ['pallets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pallet_unloads')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      return data as PalletUnload[]
    }
  })
}

export function useCreatePallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (pallet: Omit<PalletUnload, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('pallet_unloads')
        .insert(pallet)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pallets'] })
    }
  })
}
\`\`\`

**2. Update page component** (`src/features/pallets/PalletsPage.tsx`):

- Replace placeholder with actual implementation
- Use hooks for data fetching
- Add loading/error states
- Implement CRUD modals

**3. Test thoroughly**:
- Loading states work
- Error handling works
- CRUD operations work
- Data persists in Supabase

**4. Commit**:
\`\`\`bash
git add .
git commit -m "Implement Pallets feature"
git push
\`\`\`

---

## Phase 3: Data Migration

### Prerequisites

- Phase 2 complete (all features implemented)
- Supabase database set up
- Both old and new apps accessible

### Migration Strategy

**Option A: Manual Migration** (Recommended for small datasets)
- Export data from Firebase console
- Transform to match Supabase schema
- Import via Supabase SQL Editor

**Option B: Automated Script** (Recommended for large datasets)
- Write Node.js script using Firebase Admin SDK
- Connect to both Firebase and Supabase
- Migrate table by table

### Data Export from Firebase

#### 1. Export Firestore Collections

**Using Firebase Console**:
1. Go to Firebase Console → Firestore Database
2. Select collection
3. Click "..." → Export to GCS (requires Cloud Storage)
4. Download JSON file

**Using Firebase Admin SDK** (better for automation):

\`\`\`javascript
// export-firebase.js
const admin = require('firebase-admin')
const fs = require('fs')

admin.initializeApp({
  credential: admin.credential.cert('./firebase-admin-key.json')
})

const db = admin.firestore()

async function exportCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get()
  const data = []

  snapshot.forEach(doc => {
    data.push({
      id: doc.id,
      ...doc.data()
    })
  })

  fs.writeFileSync(
    \`./exports/\${collectionName}.json\`,
    JSON.stringify(data, null, 2)
  )

  console.log(\`Exported \${data.length} documents from \${collectionName}\`)
}

async function exportAll() {
  const collections = [
    'products',
    'stock_movements',
    'order_forms',
    'suppliers',
    'sdsChemicals',
    'pallet_unloads',
    'purchase_orders'
  ]

  for (const collection of collections) {
    await exportCollection(collection)
  }
}

exportAll().then(() => {
  console.log('Export complete!')
  process.exit(0)
})
\`\`\`

Run:
\`\`\`bash
node export-firebase.js
\`\`\`

#### 2. Export Firebase Auth Users

**Using Firebase Console**:
1. Go to Firebase Console → Authentication → Users
2. Click "..." → Download user list (CSV)

**Using Firebase Admin SDK**:
\`\`\`javascript
async function exportUsers() {
  let users = []
  let nextPageToken

  do {
    const result = await admin.auth().listUsers(1000, nextPageToken)
    users = users.concat(result.users)
    nextPageToken = result.pageToken
  } while (nextPageToken)

  fs.writeFileSync(
    './exports/users.json',
    JSON.stringify(users, null, 2)
  )

  console.log(\`Exported \${users.length} users\`)
}
\`\`\`

### Data Transformation

Transform Firebase data to match Supabase schema:

\`\`\`javascript
// transform.js
const fs = require('fs')

// Example: Transform products
function transformProducts(firebaseProducts) {
  return firebaseProducts.map(product => ({
    // Keep existing IDs or generate new UUIDs
    id: product.id, // or: crypto.randomUUID()
    code: product.code,
    description: product.description,
    category: product.category,
    soh: product.soh || 0,
    min_stock: product.min_stock || null,
    target_stock: product.target_stock || null,
    supplier_id: null, // Will link after suppliers are imported
    supplier_name: product.supplier || null,
    price: product.price || null,
    total_in: product.total_in || 0,
    total_out: product.total_out || 0,
    created_at: product.created_at?.toDate?.().toISOString() || new Date().toISOString(),
    updated_at: product.updated_at?.toDate?.().toISOString() || new Date().toISOString()
  }))
}

// Example: Transform stock movements
function transformStockMovements(firebaseMovements) {
  return firebaseMovements.map(movement => ({
    id: crypto.randomUUID(),
    product_id: movement.product_id,
    qty_delta: movement.qty_delta,
    note: movement.note || null,
    created_by: movement.created_by || null,
    created_at: movement.created_at?.toDate?.().toISOString() || new Date().toISOString()
  }))
}

// Run transformations
const firebaseProducts = JSON.parse(fs.readFileSync('./exports/products.json'))
const supabaseProducts = transformProducts(firebaseProducts)
fs.writeFileSync('./transformed/products.json', JSON.stringify(supabaseProducts, null, 2))
\`\`\`

### Import to Supabase

#### Option 1: SQL Import (Recommended for large datasets)

\`\`\`javascript
// generate-sql.js
const fs = require('fs')

function generateInsertSQL(tableName, records) {
  if (records.length === 0) return ''

  const columns = Object.keys(records[0])
  const values = records.map(record => {
    const vals = columns.map(col => {
      const val = record[col]
      if (val === null || val === undefined) return 'NULL'
      if (typeof val === 'string') return \`'\${val.replace(/'/g, "''")}\`
      if (typeof val === 'object') return \`'\${JSON.stringify(val).replace(/'/g, "''")}'::jsonb\`
      return val
    })
    return \`(\${vals.join(', ')})\`
  })

  return \`
INSERT INTO \${tableName} (\${columns.join(', ')})
VALUES
  \${values.join(',\\n  ')}
ON CONFLICT (id) DO NOTHING;
\`
}

// Generate SQL for all tables
const products = JSON.parse(fs.readFileSync('./transformed/products.json'))
const sql = generateInsertSQL('products', products)
fs.writeFileSync('./import/products.sql', sql)
\`\`\`

**Execute in Supabase**:
1. Go to Supabase Dashboard → SQL Editor
2. Paste generated SQL
3. Click Run

#### Option 2: Supabase JS Client (Good for small datasets)

\`\`\`javascript
// import-supabase.js
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key, not anon key
)

async function importProducts() {
  const products = JSON.parse(fs.readFileSync('./transformed/products.json'))

  // Import in batches of 100
  for (let i = 0; i < products.length; i += 100) {
    const batch = products.slice(i, i + 100)
    const { error } = await supabase
      .from('products')
      .insert(batch)

    if (error) {
      console.error(\`Error importing batch \${i/100 + 1}:\`, error)
    } else {
      console.log(\`Imported \${batch.length} products\`)
    }
  }
}

importProducts()
\`\`\`

### Import Order

Import in this order to respect foreign key constraints:

1. **suppliers** (no dependencies)
2. **products** (depends on suppliers)
3. **stock_movements** (depends on products)
4. **order_forms** (depends on products)
5. **purchase_orders** (no dependencies)
6. **sds_chemicals** (no dependencies)
7. **pallet_unloads** (no dependencies)

### Migrate Authentication

**Using Supabase Auth Admin API**:

\`\`\`javascript
async function migrateUsers() {
  const firebaseUsers = JSON.parse(fs.readFileSync('./exports/users.json'))

  for (const user of firebaseUsers) {
    // Create user in Supabase
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true, // Skip email verification
      user_metadata: {
        migrated_from_firebase: true,
        original_uid: user.uid
      }
    })

    if (error) {
      console.error(\`Error migrating user \${user.email}:\`, error)
    } else {
      console.log(\`Migrated user: \${user.email}\`)
    }
  }
}
\`\`\`

**Important**: Users will need to reset their passwords since Firebase passwords can't be exported.

### Migrate PDF Files

#### 1. Download PDFs from current project

\`\`\`bash
# Copy from old project
cp -r ../WFAPROCUREMENT/certs ./pdf-exports/certs
cp -r ../WFAPROCUREMENT/sds ./pdf-exports/sds
\`\`\`

#### 2. Upload to Supabase Storage

\`\`\`javascript
// upload-pdfs.js
const fs = require('fs')
const path = require('path')

async function uploadPDFs(folderPath, bucketName) {
  const files = fs.readdirSync(folderPath)

  for (const file of files) {
    if (!file.endsWith('.pdf')) continue

    const filePath = path.join(folderPath, file)
    const fileBuffer = fs.readFileSync(filePath)

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(file, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (error) {
      console.error(\`Error uploading \${file}:\`, error)
    } else {
      console.log(\`Uploaded: \${file}\`)
    }
  }
}

// Upload certificates
await uploadPDFs('./pdf-exports/certs', 'certificates')

// Upload SDS PDFs
await uploadPDFs('./pdf-exports/sds', 'sds-pdfs')
\`\`\`

#### 3. Update database records with new URLs

\`\`\`javascript
// Update SDS chemicals with new URLs
async function updateSDSUrls() {
  const { data: chemicals } = await supabase
    .from('sds_chemicals')
    .select('*')

  for (const chemical of chemicals) {
    if (!chemical.pdf_url) continue

    // Extract filename from old URL
    const filename = chemical.pdf_url.split('/').pop()

    // Get public URL from Supabase Storage
    const { data } = supabase.storage
      .from('sds-pdfs')
      .getPublicUrl(filename)

    // Update record
    await supabase
      .from('sds_chemicals')
      .update({ pdf_url: data.publicUrl })
      .eq('id', chemical.id)
  }
}
\`\`\`

---

## Phase 4: Testing

### Testing Checklist

#### Functional Testing

- [ ] All pages load without errors
- [ ] Authentication works (sign in/out)
- [ ] All CRUD operations work for each feature
- [ ] Stock movements create audit trail
- [ ] Purchase order status updates work
- [ ] CSV exports work for all features
- [ ] Search/filter functionality works
- [ ] PDF links open correctly

#### Data Integrity

- [ ] Record counts match Firebase export
- [ ] Stock levels are accurate
- [ ] Relationships are intact (foreign keys)
- [ ] Timestamps preserved correctly
- [ ] All PDFs accessible

#### Performance

- [ ] Pages load in < 2 seconds
- [ ] Large tables render smoothly
- [ ] No memory leaks (check DevTools)
- [ ] Mobile responsive

### Testing Tools

**Browser DevTools**:
- Console: Check for errors
- Network: Verify API calls
- Performance: Check load times

**Supabase Dashboard**:
- Table Editor: Verify data
- Logs: Check for errors

---

## Phase 5: Cutover

### Cutover Plan

**1. Communication** (1 week before):
- Notify all users of upcoming change
- Schedule downtime window
- Provide training on new interface

**2. Final Data Sync** (day before):
- Export latest Firebase data
- Run migration scripts
- Verify data integrity

**3. Go Live** (cutover day):
1. **12:00 PM**: Put old app in read-only mode
2. **12:30 PM**: Final data export from Firebase
3. **1:00 PM**: Import to Supabase
4. **1:30 PM**: Verify data
5. **2:00 PM**: Update DNS / share new URL
6. **2:30 PM**: Monitor for issues
7. **3:00 PM**: Decommission old app (or keep as backup)

**4. Post-Launch** (first week):
- Monitor error logs daily
- Respond to user feedback
- Fix critical bugs immediately

### Rollback Plan

If critical issues occur:

1. Redirect users back to old app
2. Identify and fix issues
3. Reschedule cutover

**Keep old app running for 2 weeks** as backup.

---

## Migration Scripts Reference

### Complete Migration Script

\`\`\`javascript
// migrate.js - Complete migration script
const admin = require('firebase-admin')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert('./firebase-admin-key.json')
})
const firestore = admin.firestore()

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function migrateCollection(collectionName, transformFn) {
  console.log(\`Migrating \${collectionName}...\`)

  // Export from Firebase
  const snapshot = await firestore.collection(collectionName).get()
  const firebaseData = []
  snapshot.forEach(doc => {
    firebaseData.push({ id: doc.id, ...doc.data() })
  })

  // Transform
  const supabaseData = transformFn(firebaseData)

  // Import to Supabase
  const { error } = await supabase
    .from(collectionName)
    .insert(supabaseData)

  if (error) throw error

  console.log(\`✓ Migrated \${supabaseData.length} records from \${collectionName}\`)
}

async function migrate() {
  try {
    await migrateCollection('suppliers', transformSuppliers)
    await migrateCollection('products', transformProducts)
    await migrateCollection('stock_movements', transformStockMovements)
    // ... more collections

    console.log('✓ Migration complete!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

migrate()
\`\`\`

---

## Troubleshooting

### Common Issues

**"Row violates foreign key constraint"**
- Ensure you migrate parent tables before child tables
- Check that referenced IDs exist

**"Duplicate key value violates unique constraint"**
- IDs already exist in database
- Use \`ON CONFLICT (id) DO NOTHING\` in SQL
- Or use \`upsert: true\` in Supabase client

**PDF links broken after migration**
- Ensure all PDFs uploaded to Supabase Storage
- Update database records with new URLs
- Check storage bucket policies allow public read

**Users can't sign in**
- Users need to reset passwords (can't migrate from Firebase)
- Send password reset emails to all users
- Or use Supabase Admin API to set temp passwords

---

## Rollback Instructions

If you need to roll back to the old system:

1. Keep old Firebase/Netlify app running during migration
2. If issues occur, simply redirect users back to old URL
3. Old app remains functional until you explicitly shut it down

**Firebase/Netlify costs during parallel operation**: ~$0-10/month for small usage

---

## Next Steps After Migration

1. ✅ Monitor for 1-2 weeks
2. ✅ Gather user feedback
3. ✅ Implement missing features (if any)
4. ✅ Decommission old Firebase project
5. ✅ Cancel Netlify if no longer needed
6. ✅ Set up database backups (Supabase does daily automatically)

---

## Support Resources

- **Firebase Export**: https://firebase.google.com/docs/firestore/manage-data/export-import
- **Supabase Migration**: https://supabase.com/docs/guides/migrations
- **Supabase Storage**: https://supabase.com/docs/guides/storage

For project-specific help, refer to \`README.md\` and \`DEPLOYMENT.md\`.
