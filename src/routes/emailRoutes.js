
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  sendEmail,
  sendBulkEmail,
  getEmailLogs,
  getEmailLogById,
} from '../controllers/emailController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Send single email
router.post('/send', sendEmail);

// Send bulk emails
router.post('/send-bulk', sendBulkEmail);

// Get email logs
router.get('/logs', getEmailLogs);

// Get specific email log
router.get('/logs/:emailLogId', getEmailLogById);

export default router;
