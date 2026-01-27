# Supabase Setup Guide

This guide walks you through setting up Supabase for the n8n Workflow Analyzer.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js 18+ installed

## Step 1: Create a New Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in the project details:
   - **Name**: n8n-workflow-analyzer (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Free tier is sufficient for development

4. Click "Create new project" and wait for provisioning (2-3 minutes)

## Step 2: Run the Database Schema

1. In your Supabase project dashboard, navigate to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql` from this repository
4. Paste into the SQL editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Verify success - you should see "Success. No rows returned"

## Step 3: Configure Email Authentication

1. Navigate to **Authentication** > **Providers** in the Supabase dashboard
2. Ensure **Email** provider is enabled (it should be by default)
3. Configure email settings:
   - Go to **Authentication** > **Email Templates**
   - Customize templates if desired (optional):
     - Confirm signup
     - Magic Link
     - Reset password

## Step 4: Get Your API Keys

1. Navigate to **Settings** > **API** in the Supabase dashboard
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - **KEEP THIS SECRET!**

## Step 5: Configure Environment Variables

1. In your project root, create `.env.local` (if it doesn't exist):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-side Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_SECRET_KEY=your-64-character-hex-string-here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

2. Generate your encryption key:

```bash
openssl rand -hex 32
```

Copy the output and paste it as `ENCRYPTION_SECRET_KEY` in `.env.local`

3. **IMPORTANT**: Add `.env.local` to `.gitignore` (it should already be there)

## Step 6: Update .gitignore

Ensure `.env.local` is in your `.gitignore`:

```
.env.local
.env*.local
```

## Step 7: Verify Row-Level Security (RLS)

1. Navigate to **Database** > **Tables** in Supabase dashboard
2. Click on each table:
   - `n8n_connections`
   - `user_preferences`
   - `workflow_executions_cache`
   - `workflow_dependencies`

3. For each table, verify:
   - **RLS Enabled**: Yes (should show a green checkmark)
   - **Policies**: Should show 4 policies (view, insert, update, delete)

## Step 8: Test Database Access

1. Navigate to **SQL Editor** in Supabase
2. Run this test query:

```sql
SELECT * FROM n8n_connections LIMIT 1;
```

3. You should see "Success. No rows returned" (table is empty but accessible)

## Step 9: Configure Authentication Redirects (for Production)

When deploying to production:

1. Navigate to **Authentication** > **URL Configuration**
2. Add your production URL to:
   - **Site URL**: `https://your-production-domain.com`
   - **Redirect URLs**:
     - `https://your-production-domain.com/auth/callback`
     - `http://localhost:3000/auth/callback` (keep for local dev)

## Troubleshooting

### Issue: "relation does not exist" errors

**Solution**: Ensure you ran the `supabase-schema.sql` script completely. Check the SQL Editor for any error messages.

### Issue: RLS policies blocking access

**Solution**:
1. Verify the user is authenticated (check `auth.users` table)
2. Check that RLS policies are correctly set up
3. Test with service_role key temporarily (bypasses RLS) to isolate the issue

### Issue: CORS errors in local development

**Solution**:
1. Ensure `NEXT_PUBLIC_SUPABASE_URL` is correct in `.env.local`
2. Restart your Next.js dev server after changing environment variables

### Issue: Email confirmation not working

**Solution**:
1. In Supabase dashboard, go to **Authentication** > **Settings**
2. Disable "Enable email confirmations" during development (optional)
3. For production, configure SMTP settings or use Supabase's default email service

## Security Best Practices

1. **Never commit** `.env.local` or expose your `SUPABASE_SERVICE_ROLE_KEY`
2. **Rotate keys** if you suspect they've been compromised
3. **Use RLS policies** - never disable Row-Level Security in production
4. **Monitor usage** in Supabase dashboard to detect unusual activity
5. **Enable MFA** on your Supabase account

## Next Steps

After completing this setup:

1. Install dependencies: `npm install`
2. Run migrations (if using Supabase CLI): `npx supabase db push`
3. Start development server: `npm run dev`
4. Navigate to `http://localhost:3000/auth/login` to test authentication

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guides](https://supabase.com/docs/guides/auth)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
