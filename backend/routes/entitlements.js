import express from 'express';

export function registerEntitlementRoutes(app, { db }) {
  const router = express.Router();

  // Check entitlement by userId (called by extension background)
  router.post('/entitlements/check', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
      }

      const entitlement = await db.getEntitlementByUserId(userId);

      // If we found one, return it.
      if (entitlement && entitlement.status === 'active') {
        return res.json({
          isPremium: true,
          purchasedAt: entitlement.purchasedAt,
          source: entitlement.source
        });
      }

      return res.json({ isPremium: false });
    } catch (err) {
      console.error('Check Entitlement Error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.use('/api', router);
}
