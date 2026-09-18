import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { University } from '../models/University';
import { Campus } from '../models/Campus';
import { env } from '../config/env';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/authenticate';

const generateTokens = (userId: string, role: string, email?: string) => {
  const accessToken = jwt.sign({ _id: userId, role, email: email || '' }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
  const refreshToken = jwt.sign({ _id: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });
  return { accessToken, refreshToken };
};

const setTokenCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: env.isProd(),
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.isProd(),
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, phone, password, role, studentId, department, year } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw createError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash,
    role: role || 'STUDENT',
  });

  // Create student profile if registering as student
  if ((role || 'STUDENT') === 'STUDENT' && studentId) {
    await StudentProfile.create({
      userId: user._id,
      studentId,
      department,
      year,
    });
  }

  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role, user.email);
  await User.findByIdAndUpdate(user._id, { refreshToken });
  setTokenCookies(res, accessToken, refreshToken);

  res.status(201).json({
    success: true,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
    },
  });
});

// ─── Student Quick Access (Passwordless) ──────────────────────────────────────

export const studentQuickAccess = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, identifier } = req.body;

  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    throw createError('Enrollment number or mobile number is required', 400, 'IDENTIFIER_REQUIRED');
  }

  const cleanIdentifier = identifier.trim();
  let digitsOnly = cleanIdentifier.replace(/\D/g, '');

  // Normalize Indian mobile numbers with +91 or leading 0
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    digitsOnly = digitsOnly.slice(2);
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    digitsOnly = digitsOnly.slice(1);
  }

  const digitCount = digitsOnly.length;
  const isPhone = digitCount === 10;
  const isEnrollment = digitCount === 13;
  const normalizedPhone = isPhone ? digitsOnly : '';

  // 1. Check if student profile or user already exists (returning student lookup)
  let existingProfile = await StudentProfile.findOne({
    studentId: { $regex: new RegExp(`^${digitsOnly || cleanIdentifier}$`, 'i') },
  });

  let user = null;
  if (existingProfile) {
    user = await User.findById(existingProfile.userId);
  }

  if (!user) {
    const orConditions: Array<Record<string, unknown>> = [];
    if (isEnrollment || !isPhone) {
      orConditions.push({ enrollmentNumber: { $regex: new RegExp(`^${digitsOnly || cleanIdentifier}$`, 'i') } });
    }
    if (normalizedPhone) {
      orConditions.push({ phone: { $regex: normalizedPhone } });
    }
    if (orConditions.length > 0) {
      user = await User.findOne({
        role: 'STUDENT',
        $or: orConditions,
      });
    }
    if (user && !existingProfile) {
      existingProfile = await StudentProfile.findOne({ userId: user._id });
    }
  }

  // Returning student found: log them in immediately without password
  if (user) {
    if (name && typeof name === 'string' && name.trim().length >= 2 && user.name !== name.trim()) {
      user.name = name.trim();
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role, user.email);
    await User.findByIdAndUpdate(user._id, { refreshToken });
    setTokenCookies(res, accessToken, refreshToken);

    return res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || normalizedPhone || '',
          enrollmentNumber: user.enrollmentNumber || (isEnrollment ? digitsOnly : ''),
          role: user.role,
        },
        isReturning: true,
      },
    });
  }

  // First-time student signing up: validate count of digits
  if (!isPhone && !isEnrollment) {
    throw createError(
      `Invalid number length (${digitCount} digits). Enrollment number must be exactly 13 digits, or mobile number must be exactly 10 digits.`,
      400,
      'INVALID_IDENTIFIER_COUNT'
    );
  }

  const studentName = (name && typeof name === 'string') ? name.trim() : '';
  if (!studentName || studentName.length < 2) {
    throw createError('Full name is required for first-time students', 400, 'NAME_REQUIRED');
  }

  const [parulUni, parulCampus] = await Promise.all([
    University.findOne({ code: 'PU' }) || (await University.findOne()),
    Campus.findOne(),
  ]);

  // Save according to digit count:
  // 10 digits -> saved as mobile number (phone)
  // 13 digits -> saved as enrollment number
  const newUser = await User.create({
    name: studentName,
    phone: isPhone ? `+91${digitsOnly}` : undefined,
    enrollmentNumber: isEnrollment ? digitsOnly : undefined,
    role: 'STUDENT',
    universityId: parulUni?._id,
    campusId: parulCampus?._id,
  });

  await StudentProfile.create({
    userId: newUser._id,
    studentId: isEnrollment ? digitsOnly : digitsOnly,
  });

  const { accessToken, refreshToken } = generateTokens(newUser._id.toString(), newUser.role, newUser.email);
  await User.findByIdAndUpdate(newUser._id, { refreshToken });
  setTokenCookies(res, accessToken, refreshToken);

  return res.status(201).json({
    success: true,
    data: {
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email || '',
        phone: newUser.phone || '',
        enrollmentNumber: newUser.enrollmentNumber || '',
        role: newUser.role,
      },
      isReturning: false,
    },
  });
});

const HARDCODED_ADMIN_EMAIL = 'admin@campusprint.com';
const HARDCODED_ADMIN_PASSWORD = 'CampusPrint@Admin2026!';

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const emailInput = req.body.email || req.body.identifier;
  const { password } = req.body;

  if (!emailInput || typeof emailInput !== 'string') {
    throw createError('Email is required', 400, 'EMAIL_REQUIRED');
  }

  const normalizedEmail = emailInput.trim().toLowerCase();

  // ─── Hardcoded Developer Admin Authentication ───────────────────────────────
  if (
    normalizedEmail === HARDCODED_ADMIN_EMAIL &&
    password === HARDCODED_ADMIN_PASSWORD
  ) {
    let adminUser = await User.findOne({ email: HARDCODED_ADMIN_EMAIL });
    if (!adminUser) {
      const passwordHash = await bcrypt.hash(HARDCODED_ADMIN_PASSWORD, 10);
      adminUser = await User.create({
        name: 'System Administrator',
        email: HARDCODED_ADMIN_EMAIL,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
      });
    } else {
      if (adminUser.role !== 'SUPER_ADMIN' && adminUser.role !== 'ADMIN') {
        adminUser.role = 'SUPER_ADMIN';
      }
      adminUser.isActive = true;
      await adminUser.save();
    }

    const { accessToken, refreshToken } = generateTokens(adminUser._id.toString(), adminUser.role, adminUser.email);
    await User.findByIdAndUpdate(adminUser._id, { refreshToken });
    setTokenCookies(res, accessToken, refreshToken);

    return res.json({
      success: true,
      data: {
        user: {
          _id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone,
          role: adminUser.role,
          avatar: adminUser.avatar,
          universityId: adminUser.universityId,
          campusId: adminUser.campusId,
        },
      },
    });
  }

  const trimmedInput = emailInput.trim();
  const user = await User.findOne({
    $or: [{ email: normalizedEmail }, { phone: trimmedInput }],
  });
  if (!user || !user.isActive) {
    throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role, user.email);
  await User.findByIdAndUpdate(user._id, { refreshToken });
  setTokenCookies(res, accessToken, refreshToken);

  res.json({
    success: true,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        universityId: user.universityId,
        campusId: user.campusId,
      },
    },
  });
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?._id).select('-passwordHash -refreshToken');
  if (!user) {
    throw createError('User not found', 404, 'USER_NOT_FOUND');
  }
  res.json({ success: true, data: { user } });
});

export const refresh = asyncHandler(async (req: AuthRequest, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No active session found',
      code: 'NO_REFRESH_TOKEN',
    });
  }

  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { _id: string };
  const user = await User.findById(decoded._id);

  if (!user || user.refreshToken !== token || !user.isActive) {
    throw createError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role, user.email);
  await User.findByIdAndUpdate(user._id, { refreshToken });
  setTokenCookies(res, accessToken, refreshToken);

  res.json({ success: true, message: 'Tokens refreshed' });
});
