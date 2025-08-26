import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { billingService } from '../services/billingService.js';
import { tenantService } from '../services/tenantService.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Get current subscription details
 */
export const getSubscription = async (req, res) => {
  try {
    const { tenantId } = req.user;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionEndsAt: true,
        monthlyEmailLimit: true,
        customTemplateLimit: true,
        billingHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    // Get current month usage
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [monthlyEmailUsage, templateUsage] = await Promise.all([
      prisma.emailLog.count({
        where: {
          tenantId,
          createdAt: { gte: currentMonth },
        },
      }),
      prisma.template.count({
        where: {
          tenantId,
          type: 'CUSTOM',
        },
      }),
    ]);

    let stripeSubscription = null;
    if (tenant.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(
          tenant.stripeSubscriptionId
        );
      } catch (error) {
        logger.warn('Failed to retrieve Stripe subscription:', error);
      }
    }

    res.json({
      success: true,
      data: {
        subscription: {
          plan: tenant.subscriptionPlan,
          status: tenant.subscriptionStatus,
          endsAt: tenant.subscriptionEndsAt,
          stripeSubscription,
        },
        limits: {
          monthlyEmails: tenant.monthlyEmailLimit,
          customTemplates: tenant.customTemplateLimit,
        },
        usage: {
          monthlyEmails: monthlyEmailUsage,
          customTemplates: templateUsage,
        },
        utilization: {
          emails: (monthlyEmailUsage / tenant.monthlyEmailLimit) * 100,
          templates: (templateUsage / tenant.customTemplateLimit) * 100,
        },
        billingHistory: tenant.billingHistory,
      },
    });
  } catch (error) {
    logger.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription details',
    });
  }
};

/**
 * Get available subscription plans
 */
export const getPlans = async (req, res) => {
  try {
    const plans = [
      {
        id: 'STARTER',
        name: 'Starter',
        description: 'Perfect for small businesses and startups',
        price: 29,
        billing: 'monthly',
        features: {
          monthlyEmails: 10000,
          customTemplates: 10,
          applications: 5,
          identities: 5,
          support: 'email',
          analytics: 'basic',
        },
        stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
      },
      {
        id: 'PROFESSIONAL',
        name: 'Professional',
        description: 'Ideal for growing businesses',
        price: 79,
        billing: 'monthly',
        features: {
          monthlyEmails: 50000,
          customTemplates: 50,
          applications: 25,
          identities: 25,
          support: 'priority',
          analytics: 'advanced',
        },
        stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
      },
      {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        description: 'For large organizations with custom needs',
        price: 199,
        billing: 'monthly',
        features: {
          monthlyEmails: 250000,
          customTemplates: 200,
          applications: 100,
          identities: 100,
          support: 'dedicated',
          analytics: 'premium',
        },
        stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
      },
    ];

    res.json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    logger.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
    });
  }
};

/**
 * Create checkout session for subscription
 */
export const createCheckoutSession = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { planId } = req.body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    // Plan configuration
    const planConfig = {
      STARTER: {
        priceId: process.env.STRIPE_STARTER_PRICE_ID,
        monthlyEmailLimit: 10000,
        customTemplateLimit: 10,
      },
      PROFESSIONAL: {
        priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
        monthlyEmailLimit: 50000,
        customTemplateLimit: 50,
      },
      ENTERPRISE: {
        priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        monthlyEmailLimit: 250000,
        customTemplateLimit: 200,
      },
    };

    const plan = planConfig[planId];
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected',
      });
    }

    // Create or get Stripe customer
    let stripeCustomer;
    if (tenant.stripeCustomerId) {
      stripeCustomer = await stripe.customers.retrieve(tenant.stripeCustomerId);
    } else {
      stripeCustomer = await stripe.customers.create({
        email: req.user.email,
        name: tenant.organizationName,
        metadata: {
          tenantId: tenant.id,
        },
      });

      await prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: stripeCustomer.id },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        tenantId: tenant.id,
        planId,
      },
      success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing/plans`,
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    logger.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
    });
  }
};

/**
 * Create customer portal session
 */
export const createPortalSession = async (req, res) => {
  try {
    const { tenantId } = req.user;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { stripeCustomerId: true },
    });

    if (!tenant?.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found',
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/billing`,
    });

    res.json({
      success: true,
      data: {
        url: session.url,
      },
    });
  } catch (error) {
    logger.error('Create portal session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create billing portal session',
    });
  }
};

/**
 * Handle Stripe webhooks
 */
export const handleWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    logger.info('Stripe webhook received:', { type: event.type });

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        logger.info('Unhandled webhook event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handling error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};

/**
 * Get billing history
 */
export const getBillingHistory = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [billingHistory, total] = await Promise.all([
      prisma.billingHistory.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.billingHistory.count({
        where: { tenantId },
      }),
    ]);

    res.json({
      success: true,
      data: {
        billingHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get billing history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing history',
    });
  }
};

/**
 * Get usage analytics for billing
 */
export const getUsageAnalytics = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { period = 'current_month' } = req.query;

    let startDate, endDate;

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    switch (period) {
      case 'last_month':
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0);
        break;
      case 'current_month':
      default:
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
        break;
    }

    // Get daily email usage for the period
    const dailyUsage = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as emails_sent,
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as emails_delivered,
        SUM(CASE WHEN status = 'BOUNCED' THEN 1 ELSE 0 END) as emails_bounced,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as emails_failed
      FROM email_logs 
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Get total usage stats
    const [totalEmails, tenant] = await Promise.all([
      prisma.emailLog.count({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          subscriptionPlan: true,
          monthlyEmailLimit: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          type: period,
        },
        summary: {
          totalEmails,
          monthlyLimit: tenant.monthlyEmailLimit,
          utilizationPercentage: (totalEmails / tenant.monthlyEmailLimit) * 100,
          plan: tenant.subscriptionPlan,
        },
        dailyUsage: dailyUsage.map(day => ({
          date: day.date,
          emailsSent: parseInt(day.emails_sent),
          emailsDelivered: parseInt(day.emails_delivered),
          emailsBounced: parseInt(day.emails_bounced),
          emailsFailed: parseInt(day.emails_failed),
        })),
      },
    });
  } catch (error) {
    logger.error('Get usage analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage analytics',
    });
  }
};

/**
 * Calculate usage charges
 */
export const calculateUsageCharges = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const charges = await billingService.calculateUsageCharges(
      tenantId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: charges,
    });
  } catch (error) {
    logger.error('Calculate usage charges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate usage charges',
    });
  }
};

/**
 * Generate usage report
 */
export const generateUsageReport = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required',
      });
    }

    const report = await billingService.generateUsageReport(
      tenantId,
      parseInt(year),
      parseInt(month)
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Generate usage report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate usage report',
    });
  }
};

/**
 * Get tenant billing summary
 */
export const getTenantBillingSummary = async (req, res) => {
  try {
    const { tenantId } = req.user;

    const billingSummary = await billingService.getTenantBillingSummary(tenantId);

    res.json({
      success: true,
      data: billingSummary,
    });
  } catch (error) {
    logger.error('Get tenant billing summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing summary',
    });
  }
};

/**
 * Check email sending limits
 */
export const checkEmailLimit = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { emailCount = 1 } = req.body;

    const [billingCheck, tenantCheck] = await Promise.all([
      billingService.checkEmailLimit(tenantId, emailCount),
      tenantService.canSendEmails(tenantId, emailCount)
    ]);

    const canSend = billingCheck.allowed && tenantCheck;

    res.json({
      success: true,
      data: {
        ...billingCheck,
        allowed: canSend
      }
    });

  } catch (error) {
    logger.error('Check email limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check email limit'
    });
  }
};

/**
 * Check template creation limits
 */
export const checkTemplateLimits = async (req, res) => {
  try {
    const { tenantId } = req.user;

    const limitCheck = await billingService.checkTemplateLimit(tenantId);

    res.json({
      success: true,
      data: limitCheck,
    });
  } catch (error) {
    logger.error('Check template limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check template limits',
    });
  }
};

// Helper functions for webhook handling
async function handleCheckoutCompleted(session) {
  try {
    const tenantId = session.metadata.tenantId;
    const planId = session.metadata.planId;

    const planLimits = await tenantService.getSubscriptionLimits(planId);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: planId,
        subscriptionStatus: 'ACTIVE',
        stripeSubscriptionId: session.subscription,
        ...planLimits,
      },
    });

    logger.info('Checkout completed for tenant:', tenantId);
  } catch (error) {
    logger.error('Handle checkout completed error:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer);
    const tenantId = customer.metadata.tenantId;

    const planLimits = await tenantService.getSubscriptionLimits(subscription.items.data[0].price.product);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: subscription.items.data[0].price.product,
        subscriptionStatus: subscription.status.toUpperCase(),
        subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
        ...planLimits,
      },
    });

    logger.info('Subscription updated for tenant:', tenantId);
  } catch (error) {
    logger.error('Handle subscription updated error:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer);
    const tenantId = customer.metadata.tenantId;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: 'CANCELLED',
        subscriptionPlan: 'FREE',
        monthlyEmailLimit: 1000,
        customTemplateLimit: 3,
      },
    });

    logger.info('Subscription cancelled for tenant:', tenantId);
  } catch (error) {
    logger.error('Handle subscription deleted error:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    const customer = await stripe.customers.retrieve(invoice.customer);
    const tenantId = customer.metadata.tenantId;

    await prisma.billingHistory.create({
      data: {
        tenantId,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: 'SUCCESS',
        description: invoice.description || 'Subscription payment',
        paidAt: new Date(invoice.status_transitions.paid_at * 1000),
      },
    });

    logger.info('Payment succeeded for tenant:', tenantId);
  } catch (error) {
    logger.error('Handle payment succeeded error:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const customer = await stripe.customers.retrieve(invoice.customer);
    const tenantId = customer.metadata.tenantId;

    await prisma.billingHistory.create({
      data: {
        tenantId,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        status: 'FAILED',
        description: 'Payment failed',
      },
    });

    logger.info('Payment failed for tenant:', tenantId);
  } catch (error) {
    logger.error('Handle payment failed error:', error);
  }
}
