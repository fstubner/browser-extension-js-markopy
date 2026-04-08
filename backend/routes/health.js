export function registerHealthRoutes(app, deps) {
  app.get('/api/health', async (_req, res) => {
    const timestamp = new Date().toISOString();
    const db = deps?.db;

    let dbStatus = { ok: true };
    if (db?.checkHealth) {
      try {
        dbStatus = await db.checkHealth();
      } catch (e) {
        dbStatus = { ok: false, error: e instanceof Error ? e.message : 'DB health check failed' };
      }
    }

    res.json({
      status: 'ok',
      timestamp,
      db: dbStatus,
    });
  });
}
