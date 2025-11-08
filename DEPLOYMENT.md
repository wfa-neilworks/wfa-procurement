# Deployment Guide: WFA Procurement React App

This guide walks you through deploying the WFA Procurement React application to Vercel with Supabase as the database.

## Prerequisites

- GitHub account
- Vercel account (free tier)
- Supabase account (free tier)
- Git installed locally

---

## Step 1: Set Up Supabase Project

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: WFA Procurement
   - **Database Password**: (generate a strong password and save it)
   - **Region**: Choose closest to your location
4. Wait for project to be created (~2 minutes)

### 1.2 Run Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase-schema.sql` from this project
3. Copy the entire SQL content
4. Paste it into the SQL Editor
5. Click **Run** to execute the migration
6. Verify tables were created in **Table Editor**

You should see these tables:
- `products`
- `suppliers`
- `stock_movements`
- `order_forms`
- `purchase_orders`
- `sds_chemicals`
- `pallet_unloads`

### 1.3 Get API Credentials

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 1.4 Set Up Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider (it's on by default)
3. Optional: Configure email templates
4. Go to **Authentication** → **URL Configuration**
5. Add your Vercel domain (you'll get this after deploying):
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

### 1.5 Set Up Storage (for PDFs)

1. Go to **Storage**
2. Create two buckets:
   - **Name**: `certificates` (for supplier certificates)
   - **Name**: `sds-pdfs` (for SDS documents)
3. For each bucket, set policies:
   - **Public access**: Enable for read
   - **Authenticated access**: Enable for upload/update/delete

**Storage policies to add**:

```sql
-- Allow public to read certificates
CREATE POLICY "Public can read certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificates');

-- Allow authenticated users to upload certificates
CREATE POLICY "Authenticated users can upload certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificates');

-- Repeat for sds-pdfs bucket
CREATE POLICY "Public can read SDS PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'sds-pdfs');

CREATE POLICY "Authenticated users can upload SDS PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sds-pdfs');
```

---

## Step 2: Push to GitHub

### 2.1 Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click **New Repository**
3. Fill in:
   - **Name**: `wfa-procurement-react`
   - **Description**: WFA Procurement Management System
   - **Visibility**: Private (recommended)
4. **Don't** initialize with README (we already have one)
5. Click **Create Repository**

### 2.2 Push Local Code

```bash
cd wfa-procurement-react

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/wfa-procurement-react.git

# Push code
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### 3.1 Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New...** → **Project**
3. Import your GitHub repository:
   - Click **Import** next to `wfa-procurement-react`
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.2 Add Environment Variables

In the Vercel project setup, add these environment variables:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

**Important**: Use the exact names with `VITE_` prefix!

### 3.3 Deploy

1. Click **Deploy**
2. Wait for build to complete (~2-3 minutes)
3. Your app will be live at `https://your-app.vercel.app`

### 3.4 Update Supabase Authentication URLs

1. Go back to Supabase dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Update:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: Add `https://your-app.vercel.app/**`

---

## Step 4: Create First User

### Option A: Via Supabase Dashboard

1. Go to Supabase → **Authentication** → **Users**
2. Click **Add User**
3. Fill in:
   - **Email**: your@email.com
   - **Password**: (choose a strong password)
4. Click **Create User**

### Option B: Via Sign Up (if enabled)

1. Go to your deployed app
2. Click **Sign In**
3. Use the sign-up functionality (if implemented)

---

## Step 5: Verify Deployment

### 5.1 Test Application

1. Open your Vercel URL: `https://your-app.vercel.app`
2. Verify:
   - ✅ App loads without errors
   - ✅ Sidebar navigation works
   - ✅ All routes are accessible
   - ✅ Sign in functionality works
   - ✅ Can access authenticated features

### 5.2 Test Database Connection

1. Sign in to the app
2. Navigate to any feature (e.g., Suppliers)
3. Try to create a test record
4. Check if it appears in Supabase **Table Editor**

---

## Step 6: Configure Custom Domain (Optional)

### 6.1 Add Domain in Vercel

1. In Vercel project, go to **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `procurement.yourcompany.com`)
4. Follow DNS configuration instructions

### 6.2 Update Supabase URLs

After adding custom domain:

1. Go to Supabase → **Authentication** → **URL Configuration**
2. Update Site URL and Redirect URLs with your custom domain

---

## Continuous Deployment

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Add new feature"
git push origin main

# Vercel will automatically build and deploy
```

---

## Environment Variables Reference

### Local Development (.env)

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Vercel Production

Set these in Vercel dashboard under **Settings** → **Environment Variables**

---

## Troubleshooting

### App shows "Missing Supabase environment variables"

**Solution**: Check that environment variables are set correctly in Vercel with `VITE_` prefix.

### Authentication doesn't work

**Solution**:
1. Verify Supabase Site URL matches your Vercel URL
2. Check redirect URLs include your domain
3. Ensure email provider is enabled in Supabase

### 404 errors on page refresh

**Solution**: Vercel should automatically handle SPA routing. If not:
1. Ensure `vercel.json` has correct rewrite rules
2. Redeploy the app

### Database queries fail

**Solution**:
1. Check RLS policies are set up correctly
2. Verify user is authenticated
3. Check browser console for specific errors

---

## Monitoring & Maintenance

### View Logs

- **Vercel**: Dashboard → Your Project → Deployments → (Select deployment) → Function Logs
- **Supabase**: Dashboard → Logs → (Select log type)

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update packages
npm update

# Commit and push
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### Database Backups

Supabase automatically backs up your database daily (free tier: 7 days retention).

To manually backup:
1. Go to Supabase → **Database** → **Backups**
2. Click **Download** for the backup you want

---

## Cost Estimates

### Free Tier Limits

**Vercel**:
- 100GB bandwidth/month
- Unlimited deployments
- Preview deployments
- Function execution: 100 GB-hrs/month

**Supabase**:
- 500MB database storage
- 1GB file storage
- 50,000 monthly active users
- 500,000 row reads/month
- 7-day log retention

### When to Upgrade

Upgrade when you exceed:
- Database storage > 500MB → **Supabase Pro** ($25/month)
- Bandwidth > 100GB → **Vercel Pro** ($20/month)

---

## Next Steps

After successful deployment:

1. ✅ Migrate data from Firebase (see `MIGRATION.md`)
2. ✅ Upload existing PDFs to Supabase Storage
3. ✅ Implement remaining features (Home, Inventory, etc.)
4. ✅ Set up monitoring and alerts
5. ✅ Train users on new interface

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **React Router**: https://reactrouter.com
- **TanStack Query**: https://tanstack.com/query

For issues specific to this app, check the `README.md` and `MIGRATION.md` files.
