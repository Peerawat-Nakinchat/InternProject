// src/routes/securityRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getSecurityMetrics, SecurityEventTypes } from '../middleware/securityMonitoring.js';
import { RefreshTokenModel } from '../models/TokenModel.js';

const router = express.Router();

/**
 * @swagger
 * /security/metrics:
 *   get:
 *     summary: Get security metrics dashboard data
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security metrics data
 */
router.get('/metrics', protect, async (req, res) => {
  try {
    // ตรวจสอบว่าเป็น admin หรือไม่ (ถ้ามีระบบ role)
    // if (req.user.role_id !== 1) {
    //   return res.status(403).json({ success: false, error: 'Access denied' });
    // }

    const metrics = getSecurityMetrics();
    
    // เพิ่ม token statistics
    let tokenStats = { total: 0, active: 0, expired: 0 };
    try {
      tokenStats = await RefreshTokenModel.getTokenStats();
    } catch (e) {
      console.error('Error getting token stats:', e);
    }

    res.json({
      success: true,
      metrics: {
        ...metrics,
        tokenStats,
        eventTypes: SecurityEventTypes,
      },
    });
  } catch (error) {
    console.error('Error fetching security metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch security metrics' });
  }
});

/**
 * @swagger
 * /security/alerts:
 *   get:
 *     summary: Get active security alerts
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active security alerts
 */
router.get('/alerts', protect, async (req, res) => {
  try {
    const metrics = getSecurityMetrics();
    
    res.json({
      success: true,
      alerts: metrics.activeAlerts,
    });
  } catch (error) {
    console.error('Error fetching security alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch security alerts' });
  }
});

/**
 * @swagger
 * /security/alerts/{index}/acknowledge:
 *   post:
 *     summary: Acknowledge a security alert
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: index
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alert acknowledged
 */
router.post('/alerts/:index/acknowledge', protect, async (req, res) => {
  try {
    const metrics = getSecurityMetrics();
    const index = parseInt(req.params.index, 10);
    
    if (index >= 0 && index < metrics.activeAlerts.length) {
      metrics.activeAlerts[index].acknowledged = true;
      metrics.activeAlerts[index].acknowledgedBy = req.user.user_id;
      metrics.activeAlerts[index].acknowledgedAt = new Date().toISOString();
      
      res.json({ success: true, message: 'Alert acknowledged' });
    } else {
      res.status(404).json({ success: false, error: 'Alert not found' });
    }
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
});

/**
 * @swagger
 * /security/tokens/stats:
 *   get:
 *     summary: Get token statistics
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token statistics
 */
router.get('/tokens/stats', protect, async (req, res) => {
  try {
    const stats = await RefreshTokenModel.getTokenStats();
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching token stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch token stats' });
  }
});

/**
 * @swagger
 * /security/tokens/cleanup:
 *   post:
 *     summary: Cleanup expired tokens
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup result
 */
router.post('/tokens/cleanup', protect, async (req, res) => {
  try {
    const deleted = await RefreshTokenModel.cleanupExpiredTokens();
    
    res.json({
      success: true,
      message: `Cleaned up ${deleted} expired tokens`,
      deletedCount: deleted,
    });
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
    res.status(500).json({ success: false, error: 'Failed to cleanup tokens' });
  }
});

/**
 * @swagger
 * /security/user/{userId}/sessions:
 *   get:
 *     summary: Get user's active sessions
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User's active sessions
 */
router.get('/user/:userId/sessions', protect, async (req, res) => {
  try {
    // Users can only view their own sessions unless admin
    const requestedUserId = req.params.userId;
    
    if (req.user.user_id !== requestedUserId /* && req.user.role_id !== 1 */) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const sessions = await RefreshTokenModel.getUserActiveTokens(requestedUserId);
    
    res.json({
      success: true,
      sessions: sessions.map(s => ({
        tokenId: s.token_id,
        createdAt: s.created_at,
        expiresAt: s.expires_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user sessions' });
  }
});

/**
 * @swagger
 * /security/user/{userId}/sessions/{tokenId}:
 *   delete:
 *     summary: Revoke a specific session
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked
 */
router.delete('/user/:userId/sessions/:tokenId', protect, async (req, res) => {
  try {
    const { userId, tokenId } = req.params;
    
    // Users can only revoke their own sessions unless admin
    if (req.user.user_id !== userId /* && req.user.role_id !== 1 */) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const revoked = await RefreshTokenModel.revokeTokenById(tokenId, userId);
    
    if (revoked) {
      res.json({ success: true, message: 'Session revoked' });
    } else {
      res.status(404).json({ success: false, error: 'Session not found' });
    }
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke session' });
  }
});

export default router;
