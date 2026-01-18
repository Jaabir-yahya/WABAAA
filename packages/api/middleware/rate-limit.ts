import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later',
});

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});
