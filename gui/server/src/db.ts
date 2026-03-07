import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/auto_shop_gui',
});

export default pool;

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      repo TEXT NOT NULL,
      local_path TEXT,
      default_branch TEXT NOT NULL DEFAULT 'main',
      feature_target TEXT NOT NULL DEFAULT 'main',
      promotion_path TEXT[] NOT NULL DEFAULT '{}',
      scope_template TEXT,
      synced_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS packages (
      id SERIAL PRIMARY KEY,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      repo TEXT NOT NULL,
      path TEXT NOT NULL,
      feature_target TEXT,
      scope_overrides JSONB,
      UNIQUE (project_id, name)
    );

    CREATE TABLE IF NOT EXISTS cells (
      id SERIAL PRIMARY KEY,
      feature TEXT NOT NULL,
      project TEXT NOT NULL,
      branch TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'active', 'blocked', 'awaiting-review', 'merged')),
      scope JSONB,
      blocker TEXT,
      handoff TEXT,
      github_issue_url TEXT,
      github_pr_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cell_status_history (
      id SERIAL PRIMARY KEY,
      cell_id INTEGER REFERENCES cells(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      changed_at TIMESTAMPTZ DEFAULT NOW(),
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS merge_queue (
      id SERIAL PRIMARY KEY,
      cell_id INTEGER REFERENCES cells(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      depends_on INTEGER[],
      added_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}
