# Railway Setup Guide

Configure Railway to support automatic preview environments for feature branches.

**Prerequisites:** Railway account with admin access to your projects

---

## Step 1: Enable Preview Environments

For each Railway project (nodots-backgammon, project-emerald, a2z-freight-claims):

1. Go to **Settings** (gear icon) in the Railway dashboard
2. Find **Preview Deployments** section
3. Toggle: **Create preview deployments from pull requests** → ON
4. Set trigger to: **Pull Request opened**
5. Save

**What this does:** Whenever you push a PR to GitHub, Railway automatically creates a preview environment (separate database, separate deployment).

---

## Step 2: Configure Feature Environment Variables

Each preview environment needs to know its own feature name so it can provision the correct database schema.

### Option A: Use Railway's Branch Name Variable (Recommended)

Railway provides environment variable: `RAILWAY_GIT_BRANCH`

**Add to your deployment script:**

In your `provision-feature-env.sh` or deployment hook:

```bash
#!/bin/bash
# Extract feature name from branch
# feat/my-feature → my-feature
BRANCH=${RAILWAY_GIT_BRANCH}  # e.g., "feat/my-feature"
FEATURE_SLUG=$(echo $BRANCH | sed 's/feat\///' | tr '-' '_')

# Now provision with this slug
psql $DATABASE_URL -c "CREATE SCHEMA feat_${FEATURE_SLUG};"
```

### Option B: Set Feature Slug Manually in Railway

If you prefer explicit control:

1. In Railway project settings, add custom variable:
   - Key: `FEATURE_SLUG`
   - Value: `[feature-name]` (filled in per environment)

2. On main/production deployment, set:
   - Key: `FEATURE_SLUG`
   - Value: `main` (or empty, to skip provisioning)

---

## Step 3: Create Deploy Hooks

Deploy hooks execute custom scripts during the deployment lifecycle.

### Create Provisioning Hook

1. In Railway project → **Settings** → **Deploy Hooks**
2. Create new hook:
   - **Name:** Provision Feature Schema
   - **Trigger:** After successful deployment
   - **Command:**
     ```bash
     #!/bin/bash
     # Only run on preview deployments (not on main)
     if [ "$RAILWAY_GIT_BRANCH" != "main" ]; then
       export FEATURE_SLUG=$(echo $RAILWAY_GIT_BRANCH | sed 's/feat\///')
       psql $DATABASE_URL -c "CREATE SCHEMA IF NOT EXISTS feat_${FEATURE_SLUG};"
       psql $DATABASE_URL -f scripts/provision-feature-env.sql || true
     fi
     ```

### Create Teardown Hook

Unfortunately, Railway doesn't have built-in "on destruction" hooks. You must manually teardown:

```bash
# Run when preview environment is destroyed
psql $DATABASE_URL -c "DROP SCHEMA IF EXISTS feat_${FEATURE_SLUG} CASCADE;"
```

Or create a cleanup script that runs periodically to remove orphaned schemas:

```bash
#!/bin/bash
# Remove feature schemas older than 7 days
psql $DATABASE_URL << 'SQL'
SELECT schema_name FROM information_schema.schemata
WHERE schema_name LIKE 'feat_%'
  AND schema_name NOT IN (
    SELECT DISTINCT FEATURE_SLUG FROM current_features
  )
ORDER BY schema_name DESC;
SQL
```

---

## Step 4: Configure Database Connection

Railway provides a database connection string via `DATABASE_URL` environment variable.

**Verify it's set:**

1. In Railway → Select project → PostgreSQL plugin
2. Click plugin → **Variables** tab
3. Should see `DATABASE_URL` (automatically set)
4. Copy this and add to your `.env.local` for local development

**In your app:**

```javascript
// Use DATABASE_URL environment variable
const db = process.env.DATABASE_URL;
// Schema is automatically appended by provisioning script
```

---

## Step 5: Test Preview Environment Creation

**Create a test PR:**

```bash
git checkout -b feat/test-preview
echo "Test file" > test-preview.txt
git add test-preview.txt
git commit -m "Test preview environment"
git push -u origin feat/test-preview
```

**On GitHub:** Create a pull request for this branch

**On Railway:** Watch the deployment
1. Click into the deployment log
2. You should see the provisioning hook execute
3. Check that schema `feat_test_preview` was created:
   ```bash
   psql $DATABASE_URL -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'feat_%';"
   ```

**Cleanup:**
```bash
psql $DATABASE_URL -c "DROP SCHEMA feat_test_preview CASCADE;"
```

---

## Step 6: Configure Automatic Cleanup (Optional)

To automatically clean up old preview environments:

**Option A: Nightly Cleanup Job**

Create a GitHub Actions workflow (`.github/workflows/cleanup-previews.yml`):

```yaml
name: Cleanup Old Preview Schemas

on:
  schedule:
    - cron: '0 2 * * *'  # Run at 2 AM UTC daily

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Connect to Railway database
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          psql "$DATABASE_URL" << 'SQL'
          -- Delete schemas that are >7 days old and no longer have open PRs
          SELECT COUNT(*) FROM information_schema.schemata
          WHERE schema_name LIKE 'feat_%'
            AND modified_date < NOW() - INTERVAL '7 days';
          SQL
```

**Option B: Manual Monthly Cleanup**

Once a month, in your coordinator evening session:

```bash
# List old preview schemas
psql $DATABASE_URL -c "
SELECT schema_name FROM information_schema.schemata
WHERE schema_name LIKE 'feat_%'
ORDER BY schema_name;"

# Check which PRs are still open
gh pr list --state open

# Manually drop schemas for closed PRs
psql $DATABASE_URL -c "DROP SCHEMA feat_old_feature_1 CASCADE;"
psql $DATABASE_URL -c "DROP SCHEMA feat_old_feature_2 CASCADE;"
```

---

## Troubleshooting

### "Preview environment didn't create"

1. Check Railway deployment log for errors
2. Verify provisioning hook is configured
3. Check that `DATABASE_URL` is set in Railway environment
4. Try running provisioning script manually:
   ```bash
   psql $DATABASE_URL -c "CREATE SCHEMA feat_test;"
   ```

### "Database provisioning hook is failing"

Check the hook output in Railway logs:
1. Railway dashboard → Select deployment → **Logs** tab
2. Look for provisioning hook output
3. Common issues:
   - `psql` command not found (add `apt-get install postgresql-client`)
   - `$DATABASE_URL` not set (Railway should set it automatically)
   - Schema creation failing (permissions issue)

### "Old preview schemas not cleaning up"

1. Railway doesn't auto-destroy preview environments immediately
2. Environments stick around for a few days after PR closes
3. Manually clean up with:
   ```bash
   gh pr list --state closed --limit 100 | grep feat/ | awk '{print $1}' | \
   while read pr; do
     feature=$(gh pr view $pr --json headRefName -q .headRefName)
     slug=$(echo $feature | sed 's/feat\///')
     psql $DATABASE_URL -c "DROP SCHEMA IF EXISTS feat_${slug} CASCADE;" || true
   done
   ```

### "Can't connect to database from preview"

1. Verify `DATABASE_URL` is set in Railway environment
2. Check that PostgreSQL is running in Railway
3. Verify credentials/permissions
4. Test manually:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

---

## Example: Complete Railway Flow

**Setup (one-time):**
```
1. Enable preview deployments in Railway Settings
2. Create provisioning deploy hook (scripts/provision-preview.sh)
3. Set DATABASE_URL environment variable
4. Test with test PR
```

**Per feature branch:**
```
1. Create feat/feature-name branch locally
2. Push to GitHub
3. Open PR (or just push)
4. Railway automatically:
   a. Detects PR
   b. Creates preview environment
   c. Runs deployment
   d. Runs provisioning hook
   e. Creates schema feat_feature_name
5. Feature branch has isolated preview environment ✓
6. Close PR or merge
7. Railway destroys preview environment
8. Manually run cleanup script to drop schema
```

---

## Integration with auto-shop Workflow

**Morning session (coordinator):**
- No special Railway steps needed
- Just start feature branch as normal
- Provisioning happens automatically

**Evening session (coordinator):**
- When merging: teardown happens automatically via script
- Or: manually run cleanup if needed

**Agent session:**
- Use Railway preview environment URL instead of localhost
- Database schema `feat_feature_name` is automatically ready
- No manual environment setup needed

---

## Next Steps

1. Configure Railway as above for all projects
2. Create test PR to verify provisioning works
3. Document any project-specific setup needed
4. Update agent-prompt.template.md with Railway preview URL

---

## References

- [Railway Docs: Preview Environments](https://docs.railway.app/guides/preview-environments)
- [Railway Docs: Deploy Hooks](https://docs.railway.app/guides/deployhooks)
- [Railway Docs: Environment Variables](https://docs.railway.app/guides/variables)

---

**Last updated:** 2026-02-23
