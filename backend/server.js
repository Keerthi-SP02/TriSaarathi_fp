import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import BusinessPost from './models/BusinessPost.js';
import CommunityPost from './models/CommunityPost.js';
import ContactMessage from './models/ContactMessage.js';
import BusinessPhoto from './models/BusinessPhoto.js';
import BusinessReview from './models/BusinessReview.js';
import BusinessInquiry from './models/BusinessInquiry.js';
import Notification from './models/Notification.js';
import RuralExperience from './models/RuralExperience.js';
import User from './models/User.js';
import { getRoadRoute, getRuralDestinations } from './services/ruralDiscovery.js';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

const app = express();
const port = Number(process.env.PORT || 4000);
const sessionCookieName = 'trisaarathi_session';
const tokenLifetime = process.env.JWT_EXPIRES_IN || '8h';
const tokenLifetimeMatch = /^(\d+)(s|m|h|d)$/.exec(tokenLifetime);
const tokenLifetimeUnits = { s: 1, m: 60, h: 3600, d: 86400 };
const sessionLifetimeSeconds = tokenLifetimeMatch
  ? Number(tokenLifetimeMatch[1]) * tokenLifetimeUnits[tokenLifetimeMatch[2]]
  : NaN;
const sessionSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
const hasSessionSecret = typeof sessionSecret === 'string' && Buffer.byteLength(sessionSecret) >= 32;
const authRateLimit = new Map();
const discoveryRateLimit = new Map();

if (!Number.isSafeInteger(sessionLifetimeSeconds) || sessionLifetimeSeconds < 60 || sessionLifetimeSeconds > 30 * 86400) {
  throw new Error('JWT_EXPIRES_IN must be between 60 seconds and 30 days (for example, 8h or 1d).');
}

app.use(express.json({ limit: '10kb' }));

function limitAuthRequests(req, res, next) {
  const now = Date.now();
  const key = `${req.path}:${req.ip}`;
  const windowMs = 15 * 60 * 1000;
  const limit = req.path.endsWith('/login') ? 20 : 10;
  const current = authRateLimit.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;

  entry.count += 1;
  authRateLimit.set(key, entry);
  if (authRateLimit.size > 10000) {
    for (const [rateKey, value] of authRateLimit) {
      if (value.resetAt <= now) authRateLimit.delete(rateKey);
    }
  }
  if (entry.count > limit) {
    return res.status(429).json({ error: 'Too many authentication attempts. Please try again later.' });
  }
  return next();
}

function limitDiscoveryRequests(req, res, next) {
  const now = Date.now();
  const key = `${req.ip}:${req.path}`;
  const current = discoveryRateLimit.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + 60 * 1000 }
    : current;
  entry.count += 1;
  discoveryRateLimit.set(key, entry);
  if (discoveryRateLimit.size > 10000) {
    for (const [rateKey, value] of discoveryRateLimit) {
      if (value.resetAt <= now) discoveryRateLimit.delete(rateKey);
    }
  }
  if (entry.count > 20) {
    return res.status(429).json({ error: 'Too many discovery requests. Please wait a minute and try again.' });
  }
  return next();
}

app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected',
  });
});

app.use(['/api/auth', '/api/contact', '/api/admin', '/api/account', '/api/business', '/api/community', '/api/destinations', '/api/inquiries', '/api/notifications'], (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database unavailable. Check the MongoDB connection and network access.' });
  }
  return next();
});

function signSession(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + sessionLifetimeSeconds,
  })).toString('base64url');
  const signedContent = `${header}.${payload}`;
  const signature = createHmac('sha256', sessionSecret).update(signedContent).digest('base64url');
  return `${signedContent}.${signature}`;
}

function verifySession(token) {
  if (!hasSessionSecret || typeof token !== 'string') return null;
  const [header, payload, signature, extra] = token.split('.');
  if (!header || !payload || !signature || extra) return null;

  const signedContent = `${header}.${payload}`;
  const expectedSignature = createHmac('sha256', sessionSecret).update(signedContent).digest();
  let providedSignature;
  try {
    providedSignature = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const jwtHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (
      jwtHeader.alg !== 'HS256' ||
      jwtHeader.typ !== 'JWT' ||
      typeof session.sub !== 'string' ||
      !Number.isFinite(session.exp) ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function setSessionCookie(res, user) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=${signSession(user)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionLifetimeSeconds}${secure}`
  );
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
  );
}

async function requireAuth(req, res, next) {
  if (!hasSessionSecret) {
    return res.status(503).json({ error: 'Authentication is not configured. Set JWT_SECRET to a random value of at least 32 characters.' });
  }

  const cookies = req.headers.cookie?.split(';') ?? [];
  const sessionCookie = cookies.find((cookie) => cookie.trim().startsWith(`${sessionCookieName}=`));
  const cookieToken = sessionCookie?.trim().slice(sessionCookieName.length + 1);
  const bearerToken = /^Bearer\s+(.+)$/i.exec(req.get('Authorization') || '')?.[1];
  const token = cookieToken || bearerToken;
  const session = verifySession(token);
  if (!session) {
    if (cookieToken) clearSessionCookie(res);
    return res.status(401).json({ error: 'Please log in to continue.' });
  }

  try {
    const user = await User.findById(session.sub)
      .select('_id name email role region businessName businessDescription businessPhone businessWebsite businessAddress businessLatitude businessLongitude businessApprovalStatus isActive');
    if (!user || user.isActive === false || session.role !== user.role) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Please log in to continue.' });
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Administrator access is required.' });
  }
  return next();
}

function requireBusinessApproval(req, res, next) {
  if (req.user.role !== 'Business') {
    return res.status(403).json({ error: 'Business account access is required.' });
  }
  if (req.user.businessApprovalStatus !== 'approved') {
    const message = req.user.businessApprovalStatus === 'rejected'
      ? 'Your business account is not approved for business operations.'
      : 'Your business account is awaiting administrator approval.';
    return res.status(403).json({ error: message });
  }
  return next();
}

function requireBusinessAccount(req, res, next) {
  if (req.user.role !== 'Business') {
    return res.status(403).json({ error: 'Business account access is required.' });
  }
  return next();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function serializeExperience(experience) {
  return {
    id: experience._id.toString(),
    title: experience.title,
    description: experience.description,
    category: experience.category,
    region: experience.region,
    duration: experience.duration,
    price: experience.price,
    imageUrl: experience.imageUrl,
    eventDate: experience.eventDate || null,
    status: experience.status,
    createdAt: experience.createdAt,
    updatedAt: experience.updatedAt,
  };
}

app.post('/api/auth/register', limitAuthRequests, async (req, res, next) => {
  try {
    const { name, email, password, role, region, businessName, employeeId } = req.body ?? {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedRole = role === 'traveller' ? 'Traveller' : role === 'business' ? 'Business' : role;
    const normalizedRegion = typeof region === 'string' ? region.trim() : '';
    const normalizedEmployeeId = typeof employeeId === 'string' ? employeeId.trim().toUpperCase() : '';

    if (
      typeof name !== 'string' ||
      name.trim().length === 0 ||
      name.trim().length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      normalizedEmail.length > 254 ||
      typeof password !== 'string' ||
      password.length < 8 ||
      !['Traveller', 'Business', 'Admin'].includes(normalizedRole) ||
      (region !== undefined && typeof region !== 'string') ||
      normalizedRegion.length > 120 ||
      (normalizedRole === 'Admin' && !/^[A-Z]{2}\d{4}$/.test(normalizedEmployeeId)) ||
      (normalizedRole === 'Business' && (
        typeof businessName !== 'string' ||
        businessName.trim().length === 0 ||
        businessName.trim().length > 150
      ))
    ) {
      return res.status(400).json({
        error: 'Provide a valid name, email, and password (at least 8 characters). Choose a supported account type; Admin accounts require an employee ID with two uppercase letters followed by four digits, and business accounts require a business name.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      region: normalizedRegion,
      ...(normalizedRole === 'Admin' && {
        employeeId: normalizedEmployeeId,
        isActive: false,
      }),
      ...(normalizedRole === 'Business' && {
        businessName: businessName.trim(),
        businessApprovalStatus: 'pending',
      }),
      ...(normalizedRole === 'Admin' && {
        isActive: true,
        adminApprovalStatus: 'approved',
      }),
    });

    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        region: user.region,
        businessName: user.businessName,
        businessDescription: user.businessDescription,
        businessPhone: user.businessPhone,
        businessWebsite: user.businessWebsite,
        businessAddress: user.businessAddress,
        businessLatitude: user.businessLatitude,
        businessLongitude: user.businessLongitude,
        employeeId: user.employeeId,
        adminApprovalStatus: user.adminApprovalStatus,
        businessApprovalStatus: user.businessApprovalStatus,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.employeeId) {
        return res.status(409).json({ error: 'An Admin account with this employee ID already exists.' });
      }
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return next(error);
  }
});

app.post('/api/auth/login', limitAuthRequests, async (req, res, next) => {
  try {
    if (!hasSessionSecret) {
      return res.status(503).json({ error: 'Authentication is not configured. Set JWT_SECRET to a random value of at least 32 characters.' });
    }
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.isActive === false) {
      return res.status(403).json({ error: 'This account is disabled. Contact support for assistance.' });
    }

    const accessToken = signSession(user);
    setSessionCookie(res, user);
    return res.json({
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        region: user.region,
        businessName: user.businessName,
        businessDescription: user.businessDescription,
        businessPhone: user.businessPhone,
        businessWebsite: user.businessWebsite,
        businessAddress: user.businessAddress,
        businessLatitude: user.businessLatitude,
        businessLongitude: user.businessLongitude,
        businessApprovalStatus: user.businessApprovalStatus,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/me', async (req, res, next) => {
  if (!hasSessionSecret) {
    return res.status(503).json({ error: 'Authentication is not configured. Set JWT_SECRET to a random value of at least 32 characters.' });
  }
  const cookies = req.headers.cookie?.split(';') ?? [];
  const sessionCookie = cookies.find((cookie) => cookie.trim().startsWith(`${sessionCookieName}=`));
  const cookieToken = sessionCookie?.trim().slice(sessionCookieName.length + 1);
  const bearerToken = /^Bearer\s+(.+)$/i.exec(req.get('Authorization') || '')?.[1];
  const session = verifySession(cookieToken || bearerToken);
  if (!session) {
    if (cookieToken) clearSessionCookie(res);
    return res.json({ user: null });
  }

  try {
    const user = await User.findById(session.sub)
      .select('_id name email role region businessName businessDescription businessPhone businessWebsite businessAddress businessLatitude businessLongitude businessApprovalStatus isActive');
    if (!user || user.isActive === false || session.role !== user.role) {
      clearSessionCookie(res);
      return res.json({ user: null });
    }
    const token = signSession(user);
    setSessionCookie(res, user);
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        region: user.region,
        businessName: user.businessName,
        businessDescription: user.businessDescription,
        businessPhone: user.businessPhone,
        businessWebsite: user.businessWebsite,
        businessAddress: user.businessAddress,
        businessLatitude: user.businessLatitude,
        businessLongitude: user.businessLongitude,
        businessApprovalStatus: user.businessApprovalStatus,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/account/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, region, businessName } = req.body ?? {};
    if (
      typeof name !== 'string' ||
      name.trim().length === 0 ||
      name.trim().length > 100 ||
      typeof region !== 'string' ||
      region.trim().length === 0 ||
      region.trim().length > 120
    ) {
      return res.status(400).json({ error: 'Provide a valid name and exploration region.' });
    }

    const updates = { name: name.trim(), region: region.trim() };
    if (req.user.role === 'Business') {
      if (
        typeof businessName !== 'string' ||
        businessName.trim().length === 0 ||
        businessName.trim().length > 150
      ) {
        return res.status(400).json({ error: 'Provide a valid business name.' });
      }
      updates.businessName = businessName.trim();
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('_id name email role region businessName businessApprovalStatus isActive');
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        region: user.region,
        businessName: user.businessName,
        businessApprovalStatus: user.businessApprovalStatus,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  return res.json({ message: 'You have been logged out.' });
});

app.get('/api/admin/dashboard', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const range = req.query.range || '7d';
    if (!['7d', '30d', '12m'].includes(range)) {
      return res.status(400).json({ error: 'Range must be 7d, 30d, or 12m.' });
    }

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (range === '7d') start.setUTCDate(start.getUTCDate() - 6);
    if (range === '30d') start.setUTCDate(start.getUTCDate() - 29);
    if (range === '12m') {
      start.setUTCDate(1);
      start.setUTCMonth(start.getUTCMonth() - 11);
    }
    const bucketFormat = range === '12m' ? '%Y-%m' : '%Y-%m-%d';
    const db = mongoose.connection.db;
    const collectionExists = async (name) => db.listCollections({ name }, { nameOnly: true }).hasNext();

    const [
      totalUsers,
      businessCount,
      businessPosts,
      communityPosts,
      businessStatuses,
      registrations,
      destinationCollectionExists,
      tripCollectionExists,
      reviewCollectionExists,
      experienceCollectionExists,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'Business' }),
      BusinessPost.countDocuments(),
      CommunityPost.countDocuments(),
      User.aggregate([
        { $match: { role: 'Business' } },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ['$isActive', false] },
                'suspended',
                { $ifNull: ['$businessApprovalStatus', 'pending'] },
              ],
            },
            count: { $sum: 1 },
          },
        },
      ]),
      User.aggregate([
        { $match: { role: { $in: ['Traveller', 'Business'] }, createdAt: { $gte: start, $lte: now } } },
        {
          $group: {
            _id: {
              role: '$role',
              bucket: { $dateToString: { format: bucketFormat, date: '$createdAt', timezone: 'UTC' } },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      collectionExists('destinations'),
      collectionExists('trips'),
      collectionExists('reviews'),
      collectionExists('experiences'),
    ]);

    const registrationsByBucket = new Map(
      registrations.map(({ _id, count }) => [`${_id.role}:${_id.bucket}`, count])
    );
    const labels = [];
    const travellers = [];
    const businesses = [];
    const bucket = new Date(start);
    while (bucket <= now) {
      const label = range === '12m'
        ? bucket.toISOString().slice(0, 7)
        : bucket.toISOString().slice(0, 10);
      labels.push(label);
      travellers.push(registrationsByBucket.get(`Traveller:${label}`) || 0);
      businesses.push(registrationsByBucket.get(`Business:${label}`) || 0);
      if (range === '12m') bucket.setUTCMonth(bucket.getUTCMonth() + 1);
      else bucket.setUTCDate(bucket.getUTCDate() + 1);
    }

    const statuses = Object.fromEntries(businessStatuses.map(({ _id, count }) => [_id, count]));
    const countCollection = async (name, exists) => (
      exists ? db.collection(name).countDocuments() : null
    );
    const [destinations, trips, reviews, experiences] = await Promise.all([
      countCollection('destinations', destinationCollectionExists),
      countCollection('trips', tripCollectionExists),
      countCollection('reviews', reviewCollectionExists),
      countCollection('experiences', experienceCollectionExists),
    ]);

    return res.json({
      range,
      counts: {
        totalUsers,
        businesses: businessCount,
        pendingVerifications: statuses.pending || 0,
        destinations: { value: destinations, available: destinationCollectionExists },
        businessPosts,
      },
      registrations: { labels, travellers, businesses },
      contentActivity: {
        posts: { value: businessPosts + communityPosts, available: true },
        trips: { value: trips, available: tripCollectionExists },
        reviews: { value: reviews, available: reviewCollectionExists },
        experiences: { value: experiences, available: experienceCollectionExists },
      },
      businessVerification: {
        total: businessCount,
        approved: statuses.approved || 0,
        pending: statuses.pending || 0,
        rejected: statuses.rejected || 0,
        suspended: statuses.suspended || 0,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/overview', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [
      totalUsers,
      travellerCount,
      businessCount,
      adminCount,
      pendingBusinesses,
      approvedBusinesses,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'Traveller' }),
      User.countDocuments({ role: 'Business' }),
      User.countDocuments({ role: 'Admin' }),
      User.countDocuments({
        role: 'Business',
        $or: [
          { businessApprovalStatus: 'pending' },
          { businessApprovalStatus: { $exists: false } },
        ],
      }),
      User.countDocuments({ role: 'Business', businessApprovalStatus: 'approved' }),
      User.find().select('name email role region businessName businessApprovalStatus isActive createdAt').sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    return res.json({
      counts: {
        totalUsers,
        travellers: travellerCount,
        businesses: businessCount,
        admins: adminCount,
        pendingBusinesses,
        approvedBusinesses,
      },
      recentUsers,
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive numbers.' });
    }
    const [users, total] = await Promise.all([
      User.find()
        .select('name email role region businessName businessApprovalStatus isActive createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(),
    ]);
    return res.json({ users, page, limit, total });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/admin/users/:id/status', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'User ID is invalid.' });
    }
    const { isActive } = req.body ?? {};
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be true or false.' });
    }
    if (req.params.id.toLowerCase() === req.user.id.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot change your own account status.' });
    }
    if (!isActive) {
      const targetUser = await User.findById(req.params.id).select('role isActive');
      if (!targetUser) return res.status(404).json({ error: 'User not found.' });
      if (targetUser.role === 'Admin' && targetUser.isActive !== false) {
        const activeAdmins = await User.countDocuments({ role: 'Admin', isActive: { $ne: false } });
        if (activeAdmins <= 1) {
          return res.status(400).json({ error: 'The last active administrator cannot be disabled.' });
        }
      }
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive } },
      { new: true, runValidators: true }
    ).select('name email role isActive');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/businesses/pending', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const businesses = await User.find({
      role: 'Business',
      $or: [
        { businessApprovalStatus: 'pending' },
        { businessApprovalStatus: { $exists: false } },
      ],
    })
      .select('name email region businessName businessApprovalStatus createdAt')
      .sort({ createdAt: 1 })
      .lean();
    return res.json({ businesses });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/admin/businesses/:id/approval', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Business account ID is invalid.' });
    }
    const { status } = req.body ?? {};
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Approval status must be approved or rejected.' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot approve your own business account.' });
    }
    const business = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'Business' },
      { $set: { businessApprovalStatus: status } },
      { new: true, runValidators: true }
    ).select('name email region businessName businessApprovalStatus');
    if (!business) return res.status(404).json({ error: 'Business account not found.' });
    await Notification.create({
      recipientId: business._id,
      type: 'business-approval',
      title: status === 'approved' ? 'Business account approved' : 'Business account not approved',
      message: status === 'approved'
        ? 'Your rural business is approved and can publish experiences.'
        : 'Your rural business registration was rejected. Please contact support if you need help.',
    });
    return res.json({ business });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/business/profile', requireAuth, requireBusinessAccount, (req, res) => {
  return res.json({
    business: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      region: req.user.region,
      businessName: req.user.businessName,
      description: req.user.businessDescription || '',
      phone: req.user.businessPhone || '',
      website: req.user.businessWebsite || '',
      address: req.user.businessAddress || '',
      latitude: req.user.businessLatitude,
      longitude: req.user.businessLongitude,
      approvalStatus: req.user.businessApprovalStatus || 'pending',
    },
  });
});

app.put('/api/business/profile', requireAuth, requireBusinessAccount, async (req, res, next) => {
  try {
    const { name, region, businessName, description = '', phone = '', website = '', address = '', latitude = null, longitude = null } = req.body ?? {};
    const hasLatitude = latitude !== '' && latitude !== null && latitude !== undefined;
    const hasLongitude = longitude !== '' && longitude !== null && longitude !== undefined;
    const normalizedLatitude = hasLatitude ? Number(latitude) : null;
    const normalizedLongitude = hasLongitude ? Number(longitude) : null;
    if (
      typeof name !== 'string' || !name.trim() || name.trim().length > 100 ||
      typeof region !== 'string' || !region.trim() || region.trim().length > 120 ||
      typeof businessName !== 'string' || !businessName.trim() || businessName.trim().length > 150 ||
      typeof description !== 'string' || description.trim().length > 2000 ||
      typeof phone !== 'string' || phone.trim().length > 30 ||
      typeof website !== 'string' || website.trim().length > 2048 ||
      typeof address !== 'string' || address.trim().length > 300 ||
      hasLatitude !== hasLongitude ||
      (hasLatitude && (
        !Number.isFinite(normalizedLatitude) || normalizedLatitude < -90 || normalizedLatitude > 90 ||
        !Number.isFinite(normalizedLongitude) || normalizedLongitude < -180 || normalizedLongitude > 180
      ))
    ) {
      return res.status(400).json({ error: 'Provide valid business profile details.' });
    }
    if (website.trim() && !/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(website.trim())) {
      return res.status(400).json({ error: 'Business website must be a valid HTTPS URL.' });
    }

    const business = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          name: name.trim(),
          region: region.trim(),
          businessName: businessName.trim(),
          businessDescription: description.trim(),
          businessPhone: phone.trim(),
          businessWebsite: website.trim(),
          businessAddress: address.trim(),
          businessLatitude: normalizedLatitude,
          businessLongitude: normalizedLongitude,
        },
      },
      { new: true, runValidators: true }
    ).select('_id name email region businessName businessDescription businessPhone businessWebsite businessAddress businessLatitude businessLongitude businessApprovalStatus');
    if (!business) return res.status(404).json({ error: 'Business account not found.' });
    return res.json({
      business: {
        id: business.id,
        name: business.name,
        email: business.email,
        region: business.region,
        businessName: business.businessName,
        description: business.businessDescription,
        phone: business.businessPhone,
        website: business.businessWebsite,
        address: business.businessAddress,
        latitude: business.businessLatitude,
        longitude: business.businessLongitude,
        approvalStatus: business.businessApprovalStatus,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/community/posts', requireAuth, async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 15, 20);
    const scope = req.query.scope || 'feed';
    const type = req.query.type || 'all';
    if (
      page < 1 ||
      page > 1000 ||
      limit < 1 ||
      !['feed', 'mine', 'saved'].includes(scope) ||
      !['all', 'business'].includes(type)
    ) {
      return res.status(400).json({ error: 'Post query is invalid.' });
    }

    let travellerFilter = {};
    let businessFilter = {};
    if (scope === 'feed' && type === 'business') {
      travellerFilter = { _id: null };
      businessFilter = {
        businessId: { $in: await User.find({
          role: 'Business',
          businessApprovalStatus: 'approved',
          isActive: { $ne: false },
        }).distinct('_id') },
      };
    } else if (scope === 'mine') {
      travellerFilter = { authorId: req.user.id };
      businessFilter = req.user.role === 'Business' && req.user.businessApprovalStatus === 'approved'
        ? { businessId: req.user.id }
        : { _id: null };
    } else if (scope === 'saved') {
      const [visibleTravellerIds, visibleBusinessIds] = await Promise.all([
        User.find({ role: 'Traveller', isActive: { $ne: false } }).distinct('_id'),
        User.find({
          role: 'Business',
          businessApprovalStatus: 'approved',
          isActive: { $ne: false },
        }).distinct('_id'),
      ]);
      travellerFilter = { savedBy: req.user.id, authorId: { $in: visibleTravellerIds } };
      businessFilter = { savedBy: req.user.id, businessId: { $in: visibleBusinessIds } };
    } else {
      const visibleAuthorIds = await User.find({
        isActive: { $ne: false },
        $or: [
          { role: 'Traveller' },
          { role: 'Business', businessApprovalStatus: 'approved' },
        ],
      }).distinct('_id');
      travellerFilter = { authorId: { $in: visibleAuthorIds.filter((id) => id.toString() !== req.user.id) } };
      businessFilter = {
        businessId: { $in: await User.find({
          role: 'Business',
          businessApprovalStatus: 'approved',
          isActive: { $ne: false },
        }).distinct('_id') },
      };
    }

    const queryLimit = page * limit;
    const [travellerPosts, businessPosts, total] = await Promise.all([
      CommunityPost.find(travellerFilter)
        .sort({ createdAt: -1 })
        .limit(queryLimit)
        .populate('authorId', 'name role region isActive')
        .lean(),
      BusinessPost.find(businessFilter)
        .sort({ createdAt: -1 })
        .limit(queryLimit)
        .populate('businessId', 'name role businessName region businessApprovalStatus isActive')
        .lean(),
      Promise.all([
        CommunityPost.countDocuments(travellerFilter),
        BusinessPost.countDocuments(businessFilter),
      ]).then((counts) => counts[0] + counts[1]),
    ]);

    const feedPosts = [
      ...travellerPosts.map((post) => ({
        id: post._id.toString(),
        source: 'traveller',
        content: post.content,
        createdAt: post.createdAt,
        author: {
          id: post.authorId?._id?.toString(),
          name: post.authorId?.name || 'Traveller',
          role: 'Traveller',
          region: post.authorId?.region || '',
        },
        likeCount: post.likes.length,
        likedByMe: post.likes.some((id) => id.toString() === req.user.id),
        savedByMe: post.savedBy.some((id) => id.toString() === req.user.id),
        comments: post.comments.map((comment) => ({
          id: comment._id.toString(),
          name: comment.name,
          content: comment.content,
          createdAt: comment.createdAt,
        })),
        isOwner: post.authorId?._id?.toString() === req.user.id,
      })),
      ...businessPosts.map((post) => ({
        id: post._id.toString(),
        source: 'business',
        content: post.content,
        imageUrl: post.imageUrl || '',
        createdAt: post.createdAt,
        author: {
          id: post.businessId?._id?.toString(),
          name: post.businessId?.businessName || post.businessId?.name || 'Local business',
          role: 'Local business',
          region: post.businessId?.region || '',
        },
        likeCount: post.likes.length,
        likedByMe: post.likes.some((id) => id.toString() === req.user.id),
        savedByMe: (post.savedBy || []).some((id) => id.toString() === req.user.id),
        comments: post.comments.map((comment) => ({
          id: comment._id.toString(),
          name: comment.name,
          content: comment.content,
          createdAt: comment.createdAt,
        })),
        isOwner: post.businessId?._id?.toString() === req.user.id,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const start = (page - 1) * limit;

    return res.json({
      posts: feedPosts.slice(start, start + limit),
      page,
      limit,
      total,
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/community/posts', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'Traveller') {
      return res.status(403).json({ error: 'Only traveller accounts can publish community posts.' });
    }
    const { content } = req.body ?? {};
    if (typeof content !== 'string' || content.trim().length === 0 || content.trim().length > 5000) {
      return res.status(400).json({ error: 'Post text must contain between 1 and 5000 characters.' });
    }
    const post = await CommunityPost.create({
      authorId: req.user.id,
      content: content.trim(),
    });
    return res.status(201).json({
      post: { id: post.id, content: post.content, createdAt: post.createdAt },
    });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/community/posts/:id', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Post ID is invalid.' });
    }
    const { content } = req.body ?? {};
    if (typeof content !== 'string' || content.trim().length === 0 || content.trim().length > 5000) {
      return res.status(400).json({ error: 'Post text must contain between 1 and 5000 characters.' });
    }
    const post = await CommunityPost.findOneAndUpdate(
      { _id: req.params.id, authorId: req.user.id },
      { $set: { content: content.trim() } },
      { new: true, runValidators: true }
    );
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    return res.json({ post: { id: post.id, content: post.content, updatedAt: post.updatedAt } });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/community/posts/:id', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Post ID is invalid.' });
    }
    const post = await CommunityPost.findOneAndDelete({
      _id: req.params.id,
      authorId: req.user.id,
    });
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    return res.json({ message: 'Post deleted.' });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/community/posts/:source/:id/:action', requireAuth, async (req, res, next) => {
  try {
    const { source, id, action } = req.params;
    if (!['traveller', 'business'].includes(source) || !['like', 'save', 'comments'].includes(action)) {
      return res.status(404).json({ error: 'Community action not found.' });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Post ID is invalid.' });
    }

    let post;
    if (source === 'traveller') {
      post = await CommunityPost.findOne({
        _id: id,
        authorId: { $in: await User.find({ role: 'Traveller', isActive: { $ne: false } }).distinct('_id') },
      });
    } else {
      post = await BusinessPost.findOne({
        _id: id,
        businessId: { $in: await User.find({
          role: 'Business',
          businessApprovalStatus: 'approved',
          isActive: { $ne: false },
        }).distinct('_id') },
      });
    }
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    if (action === 'like' || action === 'save') {
      const field = action === 'like' ? 'likes' : 'savedBy';
      const alreadyActive = (post[field] || []).some((item) => item.toString() === req.user.id);
      if (alreadyActive) post[field].pull(req.user.id);
      else post[field].addToSet(req.user.id);
      await post.save();
      return res.json({
        active: !alreadyActive,
        likeCount: post.likes.length,
        savedByMe: post.savedBy.some((item) => item.toString() === req.user.id),
      });
    }

    const { content } = req.body ?? {};
    if (typeof content !== 'string' || content.trim().length === 0 || content.trim().length > 2000) {
      return res.status(400).json({ error: 'Comment text must contain between 1 and 2000 characters.' });
    }
    if (post.comments.length >= 500) {
      return res.status(400).json({ error: 'This post has reached its comment limit.' });
    }
    post.comments.push({
      userId: req.user.id,
      name: req.user.name,
      content: content.trim(),
    });
    await post.save();
    const comment = post.comments[post.comments.length - 1];
    return res.status(201).json({
      comment: { id: comment.id, name: comment.name, content: comment.content, createdAt: comment.createdAt },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/discovery/destinations', limitDiscoveryRequests, requireAuth, async (req, res) => {
  const latitude = req.query.latitude === undefined ? undefined : Number(req.query.latitude);
  const longitude = req.query.longitude === undefined ? undefined : Number(req.query.longitude);
  const radius = req.query.radius === undefined ? 25000 : Number(req.query.radius);
  const requestedLimit = req.query.limit === undefined ? 15 : Number(req.query.limit);
  const limit = Number.isFinite(requestedLimit) ? Math.min(requestedLimit, 20) : requestedLimit;
  try {
    const result = await getRuralDestinations({
      category: req.query.category || 'all',
      latitude,
      longitude,
      radius,
      limit,
    });
    return res.json(result);
  } catch (error) {
    if (/invalid|provide both|must be between/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Rural destination provider failed:', error);
    return res.status(502).json({ error: 'OpenStreetMap destination discovery is temporarily unavailable.' });
  }
});

app.get('/api/discovery/route', limitDiscoveryRequests, requireAuth, async (req, res) => {
  try {
    const route = await getRoadRoute({
      fromLatitude: Number(req.query.fromLatitude),
      fromLongitude: Number(req.query.fromLongitude),
      toLatitude: Number(req.query.toLatitude),
      toLongitude: Number(req.query.toLongitude),
    });
    return res.json(route);
  } catch (error) {
    if (/coordinates are invalid/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('OSRM route request failed:', error);
    return res.status(502).json({ error: error.message || 'Road routing is temporarily unavailable.' });
  }
});

app.get('/api/destinations', requireAuth, async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 15, 20);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (page < 1 || page > 1000 || limit < 1 || search.length > 120) {
      return res.status(400).json({ error: 'Destination query is invalid.' });
    }
    const approvedBusinesses = await User.find({
      role: 'Business',
      businessApprovalStatus: 'approved',
      isActive: { $ne: false },
    }).distinct('_id');
    const filter = {
      status: 'published',
      businessId: { $in: approvedBusinesses },
      ...(search ? {
        $or: ['title', 'description', 'category', 'region'].map((field) => ({
          [field]: { $regex: escapeRegExp(search), $options: 'i' },
        })),
      } : {}),
    };
    const [experiences, total] = await Promise.all([
      RuralExperience.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('businessId', 'name businessName region businessDescription businessPhone businessWebsite businessAddress businessLatitude businessLongitude')
        .lean(),
      RuralExperience.countDocuments(filter),
    ]);
    return res.json({
      destinations: experiences.map((experience) => ({
        ...serializeExperience(experience),
        business: experience.businessId ? {
          id: experience.businessId._id.toString(),
          name: experience.businessId.businessName || experience.businessId.name,
          region: experience.businessId.region || '',
          description: experience.businessId.businessDescription || '',
          phone: experience.businessId.businessPhone || '',
          website: experience.businessId.businessWebsite || '',
          address: experience.businessId.businessAddress || '',
          latitude: experience.businessId.businessLatitude,
          longitude: experience.businessId.businessLongitude,
        } : null,
      })),
      page,
      limit,
      total,
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/business/experiences', requireAuth, requireBusinessAccount, async (req, res, next) => {
  try {
    const experiences = await RuralExperience.find({ businessId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return res.json({ experiences: experiences.map(serializeExperience) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/business/experiences', requireAuth, requireBusinessApproval, async (req, res, next) => {
  try {
    const { title, description, category, region, duration = '', price, imageUrl = '', eventDate = null, status = 'draft' } = req.body ?? {};
    if (
      typeof title !== 'string' || !title.trim() || title.trim().length > 150 ||
      typeof description !== 'string' || !description.trim() || description.trim().length > 5000 ||
      typeof category !== 'string' || !category.trim() || category.trim().length > 100 ||
      typeof region !== 'string' || !region.trim() || region.trim().length > 120 ||
      typeof duration !== 'string' || duration.trim().length > 80 ||
      !Number.isFinite(price) || price < 0 || price > 10000000 ||
      typeof imageUrl !== 'string' || imageUrl.length > 2048 ||
      (imageUrl && !imageUrl.startsWith('https://')) ||
      (eventDate !== null && (typeof eventDate !== 'string' || !Number.isFinite(Date.parse(eventDate)))) ||
      !['draft', 'published'].includes(status)
    ) {
      return res.status(400).json({ error: 'Provide a title, description, category, region, valid price, and experience status.' });
    }
    const experience = await RuralExperience.create({
      businessId: req.user.id,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      region: region.trim(),
      duration: duration.trim(),
      price,
      imageUrl: imageUrl.trim(),
      eventDate: eventDate ? new Date(eventDate) : null,
      status,
    });
    return res.status(201).json({ experience: serializeExperience(experience) });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/business/experiences/:id', requireAuth, requireBusinessApproval, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Experience ID is invalid.' });
    }
    const { title, description, category, region, duration = '', price, imageUrl = '', eventDate = null, status = 'draft' } = req.body ?? {};
    if (
      typeof title !== 'string' || !title.trim() || title.trim().length > 150 ||
      typeof description !== 'string' || !description.trim() || description.trim().length > 5000 ||
      typeof category !== 'string' || !category.trim() || category.trim().length > 100 ||
      typeof region !== 'string' || !region.trim() || region.trim().length > 120 ||
      typeof duration !== 'string' || duration.trim().length > 80 ||
      !Number.isFinite(price) || price < 0 || price > 10000000 ||
      typeof imageUrl !== 'string' || imageUrl.length > 2048 ||
      (imageUrl && !imageUrl.startsWith('https://')) ||
      (eventDate !== null && (typeof eventDate !== 'string' || !Number.isFinite(Date.parse(eventDate)))) ||
      !['draft', 'published'].includes(status)
    ) {
      return res.status(400).json({ error: 'Provide a title, description, category, region, valid price, and experience status.' });
    }
    const experience = await RuralExperience.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.id },
      {
        $set: {
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          region: region.trim(),
          duration: duration.trim(),
          price,
          imageUrl: imageUrl.trim(),
          eventDate: eventDate ? new Date(eventDate) : null,
          status,
        },
      },
      { new: true, runValidators: true }
    );
    if (!experience) return res.status(404).json({ error: 'Experience not found.' });
    return res.json({ experience: serializeExperience(experience) });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/business/experiences/:id', requireAuth, requireBusinessApproval, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Experience ID is invalid.' });
    }
    const experience = await RuralExperience.findOneAndDelete({
      _id: req.params.id,
      businessId: req.user.id,
    });
    if (!experience) return res.status(404).json({ error: 'Experience not found.' });
    return res.json({ message: 'Experience deleted.' });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/business/uploads/sign', requireAuth, requireBusinessApproval, (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({ error: 'Image uploads are not configured. Set the Cloudinary credentials on the backend.' });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `trisaarathi/business/${req.user.id}/${randomUUID()}`;
  const signedParameters = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHmac('sha1', apiSecret).update(signedParameters).digest('hex');
  return res.json({ cloudName, apiKey, timestamp, publicId, signature });
});

app.get('/api/business/photos', requireAuth, requireBusinessAccount, async (req, res, next) => {
  try {
    const photos = await BusinessPhoto.find({ businessId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return res.json({
      photos: photos.map((photo) => ({
        id: photo._id.toString(),
        secureUrl: photo.secureUrl,
        altText: photo.altText,
        createdAt: photo.createdAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/business/photos', requireAuth, requireBusinessApproval, async (req, res, next) => {
  try {
    const { cloudinaryPublicId, secureUrl, altText = '' } = req.body ?? {};
    const expectedFolder = `trisaarathi/business/${req.user.id}/`;
    if (
      typeof cloudinaryPublicId !== 'string' || !cloudinaryPublicId.startsWith(expectedFolder) ||
      typeof secureUrl !== 'string' || !secureUrl.startsWith('https://res.cloudinary.com/') ||
      typeof altText !== 'string' || altText.trim().length > 200
    ) {
      return res.status(400).json({ error: 'Provide a valid Cloudinary upload belonging to this business.' });
    }
    const photo = await BusinessPhoto.create({
      businessId: req.user.id,
      cloudinaryPublicId,
      secureUrl,
      altText: altText.trim(),
    });
    return res.status(201).json({
      photo: {
        id: photo.id,
        secureUrl: photo.secureUrl,
        altText: photo.altText,
        createdAt: photo.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This image is already in your business gallery.' });
    }
    return next(error);
  }
});

app.delete('/api/business/photos/:id', requireAuth, requireBusinessApproval, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Photo ID is invalid.' });
    }
    const photo = await BusinessPhoto.findOne({
      _id: req.params.id,
      businessId: req.user.id,
    });
    if (!photo) return res.status(404).json({ error: 'Photo not found.' });

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(503).json({ error: 'Image deletion is not configured. Set the Cloudinary credentials on the backend.' });
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha1', apiSecret)
      .update(`public_id=${photo.cloudinaryPublicId}&timestamp=${timestamp}`)
      .digest('hex');
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        public_id: photo.cloudinaryPublicId,
        timestamp: String(timestamp),
        signature,
      }),
    });
    const result = await response.json();
    if (!response.ok || !['ok', 'not_found'].includes(result.result)) {
      console.error('Cloudinary image deletion failed:', result.error?.message || response.status);
      return res.status(502).json({ error: 'Cloudinary could not delete this image. Please try again.' });
    }
    await photo.deleteOne();
    return res.json({ message: 'Photo deleted.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/business/reviews', requireAuth, requireBusinessAccount, async (req, res, next) => {
  try {
    const reviews = await BusinessReview.find({ businessId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('reviewerId', 'name region')
      .lean();
    const summary = await BusinessReview.aggregate([
      { $match: { businessId: req.user._id } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    return res.json({
      reviews: reviews.map((review) => ({
        id: review._id.toString(),
        rating: review.rating,
        content: review.content,
        businessResponse: review.businessResponse,
        respondedAt: review.respondedAt,
        createdAt: review.createdAt,
        reviewer: {
          id: review.reviewerId?._id?.toString(),
          name: review.reviewerId?.name || 'Traveller',
          region: review.reviewerId?.region || '',
        },
      })),
      summary: { count: summary[0]?.count || 0, average: summary[0]?.average || 0 },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/business/:businessId/reviews', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.businessId)) {
      return res.status(400).json({ error: 'Business account ID is invalid.' });
    }
    const business = await User.findOne({
      _id: req.params.businessId,
      role: 'Business',
      businessApprovalStatus: 'approved',
      isActive: { $ne: false },
    }).select('_id');
    if (!business) return res.status(404).json({ error: 'Business account not found.' });
    const reviews = await BusinessReview.find({ businessId: business._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('reviewerId', 'name region')
      .lean();
    return res.json({
      reviews: reviews.map((review) => ({
        id: review._id.toString(),
        rating: review.rating,
        content: review.content,
        businessResponse: review.businessResponse,
        respondedAt: review.respondedAt,
        createdAt: review.createdAt,
        reviewer: {
          id: review.reviewerId?._id?.toString(),
          name: review.reviewerId?.name || 'Traveller',
          region: review.reviewerId?.region || '',
        },
      })),
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/business/:businessId/reviews', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'Traveller') {
      return res.status(403).json({ error: 'Only traveller accounts can submit business reviews.' });
    }
    if (!mongoose.isValidObjectId(req.params.businessId)) {
      return res.status(400).json({ error: 'Business account ID is invalid.' });
    }
    const { rating, content } = req.body ?? {};
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 ||
      typeof content !== 'string' || !content.trim() || content.trim().length > 2000) {
      return res.status(400).json({ error: 'Provide a rating from 1 to 5 and review text up to 2000 characters.' });
    }
    const business = await User.findOne({
      _id: req.params.businessId,
      role: 'Business',
      businessApprovalStatus: 'approved',
      isActive: { $ne: false },
    }).select('_id businessName name');
    if (!business) return res.status(404).json({ error: 'Business account not found.' });
    const review = await BusinessReview.create({
      businessId: business._id,
      reviewerId: req.user.id,
      rating,
      content: content.trim(),
    });
    await Notification.create({
      recipientId: business._id,
      type: 'business-review',
      title: 'New business review',
      message: `${req.user.name} left a ${rating}-star review for your business.`,
    });
    return res.status(201).json({
      review: {
        id: review.id,
        rating: review.rating,
        content: review.content,
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'You have already reviewed this business.' });
    }
    return next(error);
  }
});

app.patch('/api/business/reviews/:id/reply', requireAuth, requireBusinessApproval, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Review ID is invalid.' });
    }
    const { response: businessResponse } = req.body ?? {};
    if (typeof businessResponse !== 'string' || !businessResponse.trim() || businessResponse.trim().length > 2000) {
      return res.status(400).json({ error: 'Provide a business response of up to 2000 characters.' });
    }
    const review = await BusinessReview.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.id },
      { $set: { businessResponse: businessResponse.trim(), respondedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    await Notification.create({
      recipientId: review.reviewerId,
      type: 'review-response',
      title: 'Business responded to your review',
      message: `${req.user.businessName || req.user.name} replied to your review.`,
    });
    return res.json({
      review: {
        id: review.id,
        businessResponse: review.businessResponse,
        respondedAt: review.respondedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/business/:businessId/inquiries', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'Traveller') {
      return res.status(403).json({ error: 'Only traveller accounts can contact a business.' });
    }
    if (!mongoose.isValidObjectId(req.params.businessId)) {
      return res.status(400).json({ error: 'Business account ID is invalid.' });
    }
    const { subject, message, experienceId = null } = req.body ?? {};
    if (
      typeof subject !== 'string' || !subject.trim() || subject.trim().length > 150 ||
      typeof message !== 'string' || !message.trim() || message.trim().length > 5000 ||
      (experienceId !== null && !mongoose.isValidObjectId(experienceId))
    ) {
      return res.status(400).json({ error: 'Provide a subject and message for your inquiry.' });
    }
    const business = await User.findOne({
      _id: req.params.businessId,
      role: 'Business',
      businessApprovalStatus: 'approved',
      isActive: { $ne: false },
    }).select('_id businessName name');
    if (!business) return res.status(404).json({ error: 'Business account not found.' });
    if (experienceId) {
      const experience = await RuralExperience.exists({
        _id: experienceId,
        businessId: business._id,
        status: 'published',
      });
      if (!experience) return res.status(404).json({ error: 'Published experience not found.' });
    }
    const inquiry = await BusinessInquiry.create({
      businessId: business._id,
      travellerId: req.user.id,
      experienceId,
      subject: subject.trim(),
      message: message.trim(),
    });
    await Notification.create({
      recipientId: business._id,
      type: 'business-inquiry',
      title: 'New business inquiry',
      message: `${req.user.name} sent you an inquiry: ${subject.trim()}`,
    });
    return res.status(201).json({
      inquiry: {
        id: inquiry.id,
        subject: inquiry.subject,
        message: inquiry.message,
        status: inquiry.status,
        createdAt: inquiry.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/business/inquiries', requireAuth, requireBusinessAccount, async (req, res, next) => {
  try {
    const inquiries = await BusinessInquiry.find({ businessId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('travellerId', 'name email region')
      .populate('experienceId', 'title')
      .lean();
    return res.json({
      inquiries: inquiries.map((inquiry) => ({
        id: inquiry._id.toString(),
        subject: inquiry.subject,
        message: inquiry.message,
        status: inquiry.status,
        businessResponse: inquiry.businessResponse,
        respondedAt: inquiry.respondedAt,
        createdAt: inquiry.createdAt,
        traveller: inquiry.travellerId ? {
          id: inquiry.travellerId._id.toString(),
          name: inquiry.travellerId.name,
          email: inquiry.travellerId.email,
          region: inquiry.travellerId.region || '',
        } : null,
        experience: inquiry.experienceId ? {
          id: inquiry.experienceId._id.toString(),
          title: inquiry.experienceId.title,
        } : null,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/inquiries', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'Traveller') {
      return res.status(403).json({ error: 'Traveller account access is required.' });
    }
    const inquiries = await BusinessInquiry.find({ travellerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('businessId', 'businessName name region')
      .lean();
    return res.json({
      inquiries: inquiries.map((inquiry) => ({
        id: inquiry._id.toString(),
        subject: inquiry.subject,
        message: inquiry.message,
        status: inquiry.status,
        businessResponse: inquiry.businessResponse,
        respondedAt: inquiry.respondedAt,
        createdAt: inquiry.createdAt,
        business: inquiry.businessId ? {
          id: inquiry.businessId._id.toString(),
          name: inquiry.businessId.businessName || inquiry.businessId.name,
          region: inquiry.businessId.region || '',
        } : null,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/business/inquiries/:id', requireAuth, requireBusinessApproval, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Inquiry ID is invalid.' });
    }
    const { status, response: businessResponse = '' } = req.body ?? {};
    if (
      !['responded', 'closed'].includes(status) ||
      typeof businessResponse !== 'string' || businessResponse.trim().length > 5000 ||
      (status === 'responded' && !businessResponse.trim())
    ) {
      return res.status(400).json({ error: 'Choose responded or closed and provide a response when replying.' });
    }
    const inquiry = await BusinessInquiry.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.id },
      {
        $set: {
          status,
          businessResponse: businessResponse.trim(),
          respondedAt: status === 'responded' ? new Date() : null,
        },
      },
      { new: true, runValidators: true }
    );
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });
    if (status === 'responded') {
      await Notification.create({
        recipientId: inquiry.travellerId,
        type: 'inquiry-response',
        title: 'A business responded to your inquiry',
        message: `${req.user.businessName || req.user.name} responded to "${inquiry.subject}".`,
      });
    }
    return res.json({
      inquiry: {
        id: inquiry.id,
        status: inquiry.status,
        businessResponse: inquiry.businessResponse,
        respondedAt: inquiry.respondedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/notifications', requireAuth, async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipientId: req.user.id }).sort({ createdAt: -1 }).limit(20).lean(),
      Notification.countDocuments({ recipientId: req.user.id, readAt: null }),
    ]);
    return res.json({
      notifications: notifications.map((notification) => ({
        id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: Boolean(notification.readAt),
        createdAt: notification.createdAt,
      })),
      unreadCount,
    });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/notifications/read-all', requireAuth, async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipientId: req.user.id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return res.json({ markedRead: result.modifiedCount });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Notification ID is invalid.' });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id, readAt: null },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) {
      const existing = await Notification.exists({ _id: req.params.id, recipientId: req.user.id });
      if (!existing) return res.status(404).json({ error: 'Notification not found.' });
    }
    return res.json({ read: true });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/business/posts', requireAuth, async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 15, 20);
    const scope = req.query.scope || 'all';
    if (page < 1 || limit < 1 || !['all', 'mine'].includes(scope)) {
      return res.status(400).json({ error: 'Post query is invalid.' });
    }

    const visibilityFilter = scope === 'mine'
      ? req.user.role === 'Business' ? { businessId: req.user.id } : { _id: null }
      : req.user.role === 'Business' && req.user.businessApprovalStatus !== 'approved'
        ? { businessId: req.user.id }
        : { businessId: { $in: await User.find({
          role: 'Business',
          businessApprovalStatus: 'approved',
          isActive: { $ne: false },
        }).distinct('_id') } };
    const filter = visibilityFilter;
    const [posts, total, ownPostCount] = await Promise.all([
      BusinessPost.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('businessId', 'businessName name region businessApprovalStatus isActive')
        .lean(),
      BusinessPost.countDocuments(filter),
      req.user.role === 'Business'
        ? BusinessPost.countDocuments({ businessId: req.user.id })
        : Promise.resolve(0),
    ]);

    return res.json({
      posts: posts.map((post) => ({
        id: post._id,
        content: post.content,
        imageUrl: post.imageUrl || '',
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        business: post.businessId ? {
          id: post.businessId._id,
          name: post.businessId.businessName || post.businessId.name,
          region: post.businessId.region,
        } : null,
        likeCount: post.likes.length,
        likedByMe: post.likes.some((id) => id.toString() === req.user.id),
        comments: post.comments.map((comment) => ({
          id: comment._id,
          name: comment.name,
          content: comment.content,
          createdAt: comment.createdAt,
          isOwner: comment.userId.toString() === req.user.id,
        })),
        isOwner: post.businessId?._id.toString() === req.user.id,
      })),
      page,
      limit,
      total,
      ownPostCount,
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/business/posts', requireAuth, requireBusinessApproval, async (req, res, next) => {
  try {
    const { content, imageId = null } = req.body ?? {};
    if (typeof content !== 'string' || content.trim().length === 0 || content.trim().length > 5000) {
      return res.status(400).json({ error: 'Post text must contain between 1 and 5000 characters.' });
    }
    if (imageId !== null && !mongoose.isValidObjectId(imageId)) {
      return res.status(400).json({ error: 'Post image ID is invalid.' });
    }
    const photo = imageId
      ? await BusinessPhoto.findOne({ _id: imageId, businessId: req.user.id }).select('secureUrl')
      : null;
    if (imageId && !photo) return res.status(404).json({ error: 'Business photo not found.' });

    const post = await BusinessPost.create({
      businessId: req.user.id,
      content: content.trim(),
      imageUrl: photo?.secureUrl || '',
    });
    return res.status(201).json({
      post: { id: post.id, content: post.content, imageUrl: post.imageUrl, createdAt: post.createdAt },
    });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/business/posts/:id', requireAuth, requireBusinessApproval, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Post ID is invalid.' });
    }
    const { content } = req.body ?? {};
    if (typeof content !== 'string' || content.trim().length === 0 || content.trim().length > 5000) {
      return res.status(400).json({ error: 'Post text must contain between 1 and 5000 characters.' });
    }
    const updates = { content: content.trim() };
    if (Object.hasOwn(req.body ?? {}, 'imageId')) {
      const { imageId } = req.body;
      if (imageId !== null && !mongoose.isValidObjectId(imageId)) {
        return res.status(400).json({ error: 'Post image ID is invalid.' });
      }
      const photo = imageId
        ? await BusinessPhoto.findOne({ _id: imageId, businessId: req.user.id }).select('secureUrl')
        : null;
      if (imageId && !photo) return res.status(404).json({ error: 'Business photo not found.' });
      updates.imageUrl = photo?.secureUrl || '';
    }
    const post = await BusinessPost.findOneAndUpdate(
      { _id: req.params.id, businessId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    return res.json({
      post: { id: post.id, content: post.content, imageUrl: post.imageUrl, updatedAt: post.updatedAt },
    });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/business/posts/:id', requireAuth, requireBusinessApproval, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Post ID is invalid.' });
    }
    const post = await BusinessPost.findOneAndDelete({
      _id: req.params.id,
      businessId: req.user.id,
    });
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    return res.json({ message: 'Post deleted.' });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/business/posts/:id/like', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Post ID is invalid.' });
    }
    const approvedBusinessIds = await User.find({
      role: 'Business',
      businessApprovalStatus: 'approved',
      isActive: { $ne: false },
    }).distinct('_id');
    const post = await BusinessPost.findOne({
      _id: req.params.id,
      businessId: { $in: approvedBusinessIds },
    });
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const alreadyLiked = post.likes.some((id) => id.toString() === req.user.id);
    if (alreadyLiked) {
      post.likes.pull(req.user.id);
    } else {
      post.likes.addToSet(req.user.id);
    }
    await post.save();
    return res.json({ liked: !alreadyLiked, likeCount: post.likes.length });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/business/posts/:id/comments', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Post ID is invalid.' });
    }
    const { content } = req.body ?? {};
    if (typeof content !== 'string' || content.trim().length === 0 || content.trim().length > 2000) {
      return res.status(400).json({ error: 'Comment text must contain between 1 and 2000 characters.' });
    }
    const approvedBusinessIds = await User.find({
      role: 'Business',
      businessApprovalStatus: 'approved',
      isActive: { $ne: false },
    }).distinct('_id');
    const post = await BusinessPost.findOne({
      _id: req.params.id,
      businessId: { $in: approvedBusinessIds },
    });
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    post.comments.push({
      userId: req.user.id,
      name: req.user.name,
      content: content.trim(),
    });
    await post.save();
    const comment = post.comments[post.comments.length - 1];
    return res.status(201).json({
      comment: {
        id: comment.id,
        name: comment.name,
        content: comment.content,
        createdAt: comment.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/admins', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (
      typeof name !== 'string' ||
      name.trim().length === 0 ||
      name.trim().length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      normalizedEmail.length > 254 ||
      typeof password !== 'string' ||
      password.length < 12
    ) {
      return res.status(400).json({ error: 'Provide a valid name and email, and an Admin password of at least 12 characters.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'Admin',
    });

    return res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return next(error);
  }
});

app.post('/api/contact', async (req, res, next) => {
  try {
    const { name, email, message } = req.body ?? {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (
      typeof name !== 'string' ||
      name.trim().length === 0 ||
      name.trim().length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      typeof message !== 'string' ||
      message.trim().length === 0 ||
      message.trim().length > 5000
    ) {
      return res.status(400).json({ error: 'Please provide a name, valid email, and message (up to 5000 characters).' });
    }

    await ContactMessage.create({
      name: name.trim(),
      email: normalizedEmail,
      message: message.trim(),
    });

    return res.status(201).json({ message: 'Your message has been received.' });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error('API request failed:', error);
  res.status(500).json({ error: 'The request could not be completed. Please try again.' });
});

app.listen(port, () => {
  console.log(`API listening on port ${port}.`);
});

if (!process.env.MONGODB_URI) {
  console.error('MongoDB is not configured. Set MONGODB_URI in .env; database-backed API requests will return 503.');
} else {
  const connectToMongo = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
      console.log('Connected to MongoDB.');
      if (!hasSessionSecret) {
        console.error('Authentication is unavailable. Set JWT_SECRET to a random value of at least 32 characters.');
      }
      await ensureBootstrapAdmin();
    } catch (error) {
      console.error('MongoDB connection failed; retrying in 5 seconds:', error.message);
      setTimeout(connectToMongo, 5000);
    }
  };

  connectToMongo();
}

async function ensureBootstrapAdmin() {
  const legacyPendingAdmins = await User.updateMany(
    {
      role: 'Admin',
      isActive: false,
      employeeId: { $regex: /^[A-Z]{2}\d{4}$/ },
      adminApprovalStatus: { $exists: false },
    },
    { $set: { isActive: true, adminApprovalStatus: 'approved' } }
  );
  if (legacyPendingAdmins.modifiedCount > 0) {
    console.log(`Activated ${legacyPendingAdmins.modifiedCount} Admin registration(s) that were awaiting the removed verification step.`);
  }

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email && !password) return;
  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof password !== 'string' ||
    password.length < 12
  ) {
    console.error('Bootstrap Admin setup requires a valid BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters.');
    return;
  }

  try {
    if (await User.exists({ role: 'Admin', isActive: { $ne: false } })) return;
    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
      name: 'TriSaarathi Administrator',
      email,
      password: hashedPassword,
      role: 'Admin',
    });
    console.log('Initial Admin account created. Remove BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD from the environment.');
  } catch (error) {
    if (error.code === 11000) {
      console.error('Bootstrap Admin email already belongs to an existing account; no Admin account was created.');
      return;
    }
    console.error('Could not create the bootstrap Admin account:', error.message);
  }
}
