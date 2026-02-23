# Railway Integration: Step-by-Step Implementation Guide

**Objective:** Configure Railway preview environments for automatic feature branch isolation

**Outcome:** Each feature branch gets its own preview environment with isolated database schema

---

## Prerequisites

- [ ] Railway account (https://railway.app) with admin access
- [ ] GitHub repo connected to Railway
- [ ] PostgreSQL database deployed in Railway
- [ ] Feature branch provisioning scripts in place (scripts/provision-feature-env.sh)

---

## Part 1: Enable Preview Deployments in Railway

### Step 1.1: Navigate to Railway Settings

1. Log in to Railway dashboard
2. Select the project you want to configure
3. Go to **Settings** (gear icon in top-right)
4. Look for **Preview Deployments** section

### Step 1.2: Enable Preview Deployments

In the **Preview Deployments** section:

1. Toggle: **Create preview deployments from pull requests** → **ON**
2. Trigger: **Pull Request opened**
3. Save settings

**What this does:**
- Automatically creates a preview environment when a PR is opened
- Automatically deletes the preview environment when the PR is closed
- Each preview gets a unique URL

### Step 1.3: Verify GitHub Connection

1. Confirm GitHub organization is connected
2. Verify Railway can access your GitHub repo
3. Check that Railway has webhook permissions

---

## Part 2: Configure Feature Environment Variables

### Step 2.1: Extract Feature Slug from Branch Name

Railway provides `RAILWAY_GIT_BRANCH` automatically. We'll use it to determine the feature name.

Example: `feat/my-feature` → `my_feature` (schema name)

### Step 2.2: Create a Deploy Hook for Feature Slug

In your Railway project, create a **Deploy Hook**:

**Location:** Project Settings → Deploy Hooks → Add New Hook

**Configuration:**

```
Name:        Extract Feature Slug
Trigger:     On Deployment
Environment: All (or specify preview-only)
Command:     (see below)
```

**Deploy Hook Script:**

Create file `scripts/railway-configure-env.sh`:

```bash
#!/bin/bash
set -e

# Extract feature slug from branch name
# Input: feat/my-feature → Output: my_feature
BRANCH="${RAILWAY_GIT_BRANCH}"
echo "Branch: $BRANCH"

# Skip for main/master (production)
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
    echo "Production branch, skipping feature configuration"
    exit 0
fi

# Extract feature slug: feat/my-feature → my-feature
if [[ "$BRANCH" == feat/* ]]; then
    FEATURE_NAME=$(echo "$BRANCH" | sed 's/^feat\///')
else
    FEATURE_NAME="$BRANCH"
fi

# Convert to schema-safe name: my-feature → my_feature
SCHEMA_NAME=$(echo "$FEATURE_NAME" | tr '-' '_')

echo "Feature: $FEATURE_NAME"
echo "Schema: feat_$SCHEMA_NAME"

# Set environment variable for use in subsequent scripts
export FEATURE_SLUG="$FEATURE_NAME"
export FEATURE_SCHEMA="feat_$SCHEMA_NAME"

# Log for debugging
echo "FEATURE_SLUG=$FEATURE_SLUG" >> /tmp/railway-env.log
echo "FEATURE_SCHEMA=$FEATURE_SCHEMA" >> /tmp/railway-env.log
```

### Step 2.3: Set Environment Variables in Railway

In Railway project settings, add these variables:

**For All Environments:**
```
DATABASE_URL=postgres://user:password@host:port/database
```

**For Preview Environments Only:**
```
ENVIRONMENT_TYPE=preview
FEATURE_SLUG=<extracted from branch>
```

(Railway will automatically interpolate these based on the branch)

---

## Part 3: Database Provisioning via Deploy Hooks

### Step 3.1: Create Provisioning Hook

**Location:** Project Settings → Deploy Hooks → Add New Hook

**Configuration:**

```
Name:        Provision Feature Schema
Trigger:     On Successful Deployment
Environment: Preview (only)
```

**Hook Script:**

```bash
#!/bin/bash
set -e

# Only run on preview deployments
if [[ "$RAILWAY_ENVIRONMENT_NAME" != "preview" ]]; then
    echo "Not a preview environment, skipping provisioning"
    exit 0
fi

# Get feature slug from branch
BRANCH="${RAILWAY_GIT_BRANCH}"

if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
    echo "Production branch, skipping"
    exit 0
fi

# Extract slug: feat/my-feature → my_feature
FEATURE_SLUG=$(echo "$BRANCH" | sed 's/^feat\///' | tr '-' '_')
SCHEMA_NAME="feat_${FEATURE_SLUG}"

echo "Provisioning schema: $SCHEMA_NAME"

# Create schema
psql "$DATABASE_URL" -c "CREATE SCHEMA IF NOT EXISTS $SCHEMA_NAME;"

echo "✓ Schema created: $SCHEMA_NAME"

# Run migrations (if you have them)
# psql "$DATABASE_URL" -c "SET search_path TO $SCHEMA_NAME; \i schema.sql;"

echo "✓ Provisioning complete"
```

### Step 3.2: Verify Hook Execution

After deploying a feature branch:

1. Go to Railway → Deployments
2. Click the latest deployment
3. Look at **Deploy Hooks** section
4. Verify provisioning hook ran successfully
5. Check logs for "Schema created"

---

## Part 4: Manual Teardown (Until Automation)

Railway destroys preview environments when PRs close, but you need to manually drop the database schema.

### Step 4.1: Create Cleanup Script

Create `scripts/railway-teardown-feature.sh`:

```bash
#!/bin/bash
set -e

FEATURE_SLUG=$1

if [[ -z "$FEATURE_SLUG" ]]; then
    echo "Usage: $0 <feature-slug>"
    exit 1
fi

SCHEMA_NAME="feat_${FEATURE_SLUG//-/_}"

echo "Dropping schema: $SCHEMA_NAME"

# Connect to production/main database and drop feature schema
psql "$DATABASE_URL" -c "DROP SCHEMA IF EXISTS $SCHEMA_NAME CASCADE;" || true

echo "✓ Schema dropped"
```

### Step 4.2: Manual Cleanup After Merge

After merging a feature branch to main:

```bash
./scripts/railway-teardown-feature.sh my-feature
```

---

## Part 5: Testing the Setup

### Step 5.1: Create a Test Feature Branch

```bash
git checkout -b feat/railway-test
echo "# Test feature" >> README.md
git add README.md
git commit -m "Test Railway preview"
git push -u origin feat/railway-test
```

### Step 5.2: Open a PR on GitHub

1. Go to GitHub repository
2. Create a pull request: `feat/railway-test` → `main`
3. Watch Railway automatically create a preview deployment

### Step 5.3: Verify Preview Environment

In Railway:

1. Go to your project
2. Look for a new environment: `main-feat-railway-test` or similar
3. Click into it → **Deployments**
4. Wait for deployment to complete
5. Verify deploy hooks ran (check logs)
6. Verify database schema was created:

```bash
psql "$DATABASE_URL" -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'feat_%';"
```

### Step 5.4: Access Preview URL

Railway provides a preview URL in the deployment. Your feature branch has a live environment!

### Step 5.5: Cleanup

1. Close the PR on GitHub
2. Railway automatically destroys the preview environment
3. Manually drop the schema:
   ```bash
   ./scripts/railway-teardown-feature.sh railway-test
   ```

---

## Part 6: Multiple Projects Setup

Repeat **Part 1–5** for each project:

1. **nodots-backgammon** ← Start here (primary pilot)
2. **project-emerald**
3. **a2z-freight-claims**

Each project gets:
- Preview deployments enabled
- Feature schema provisioning via deploy hook
- Manual teardown script

---

## Troubleshooting

### Preview Deployment Doesn't Create

**Check:**
1. Is preview deployments enabled in settings?
2. Is GitHub webhook connected?
3. Check Railway logs for webhook errors

**Fix:**
- Reconnect GitHub integration in Railway settings
- Verify Railway app has GitHub write permissions

### Deploy Hook Fails

**Symptoms:** Deployment succeeds but no schema created

**Check:**
1. Go to Deployments → Click deployment → scroll to **Deploy Hooks**
2. Look for error messages in hook logs
3. Verify psql command is correct

**Common Issues:**
- `psql` command not found → Install `postgresql-client` in your image
- `$DATABASE_URL` not set → Check environment variables are configured
- Permission denied → Verify database user has schema creation permissions

**Fix:**
```bash
# In your Railway app's Dockerfile or init script
RUN apt-get update && apt-get install -y postgresql-client

# Test the connection
psql "$DATABASE_URL" -c "SELECT 1;"
```

### Schema Not Dropped After Merge

**Reason:** Manual teardown needed (not yet automated)

**Fix:**
```bash
# List all feature schemas
psql "$DATABASE_URL" -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'feat_%';"

# Drop old schemas
psql "$DATABASE_URL" -c "DROP SCHEMA IF EXISTS feat_old_feature CASCADE;"
```

### Multiple Feature Branches, Same Feature Name

**Problem:** Two PRs from `feat/my-feature` would create the same schema

**Solution:** Use branch naming convention:
- `feat/my-feature-v1`
- `feat/my-feature-v2`
- `feat/my-feature-api-only`

Each gets unique schema: `feat_my_feature_v1`, `feat_my_feature_v2`, etc.

---

## Checklist: Railway Configuration Complete

- [ ] Preview deployments enabled for all 3 projects
- [ ] Deploy hook created for feature slug extraction
- [ ] Deploy hook created for schema provisioning
- [ ] Database URLs configured for each project
- [ ] Test feature branch created and PR opened
- [ ] Preview environment deployed successfully
- [ ] Database schema verified created
- [ ] Cleanup script tested
- [ ] Feature branches can be deleted/closed without manual intervention

---

## Next Steps (Issue #9)

After Railway is configured, we'll:
1. Create 2–3 concurrent feature branches
2. Verify each gets isolated database schemas
3. Verify scope enforcement works independently in each cell
4. Verify no merge conflicts or port conflicts
5. Document the concurrent cell workflow

---

## References

- Railway Docs: https://docs.railway.app
- Preview Environments: https://docs.railway.app/guides/preview-environments
- Deploy Hooks: https://docs.railway.app/guides/deployhooks
- Environment Variables: https://docs.railway.app/guides/variables

---

**Status:** Ready to configure ✓
**Estimated Time:** 15–30 minutes per project
**Complexity:** Medium (mostly configuration, few commands)
