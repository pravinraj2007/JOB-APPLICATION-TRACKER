require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const multer = require('multer');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'jobtrack-demo-secret';
const MONGODB_URI = process.env.MONGODB_URI || '';
const EMAIL_SECURE = String(process.env.EMAIL_SECURE || 'false').toLowerCase() === 'true';
const OTP_TTL_MS = 10 * 60 * 1000;

if (!MONGODB_URI) {
  console.error('FATAL: MONGODB_URI is missing from the root .env file. MongoDB persistence is required for startup.');
  process.exit(1);
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function serializeUser(user) {
  const data = user && user.toObject ? user.toObject() : user;
  const safeProfile = data?.profile || { phone: '', location: '', linkedin: '', portfolio: '', bio: '' };
  return {
    id: data?._id ? data._id.toString() : data?.id || null,
    name: data?.name || '',
    email: data?.email || '',
    profile: safeProfile,
    publicProfile: data?.publicProfile || { enabled: false, about: true, skills: true, projects: true, experience: true, certifications: true, education: true },
    isVerified: Boolean(data?.isVerified),
  };
}

async function setUserVerificationOtp(user, code) {
  user.verificationCodeHash = await bcrypt.hash(code, 10);
  user.verificationCodeExpiresAt = Date.now() + OTP_TTL_MS;
  user.verificationAttempts = 0;
}

function safeEmailError(error) {
  return {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: EMAIL_SECURE,
    code: error && error.code ? String(error.code) : 'unknown',
    responseCode: error && error.responseCode ? Number(error.responseCode) : null,
    message: error && error.message ? String(error.message) : 'Unknown SMTP error',
  };
}

console.log('EMAIL_USER configured:', process.env.EMAIL_USER ? 'YES' : 'NO');
console.log('EMAIL_PASS configured:', process.env.EMAIL_PASS ? 'YES' : 'NO');
console.log('EMAIL_FROM configured:', process.env.EMAIL_FROM ? 'YES' : 'NO');
console.log('SMTP_HOST:', process.env.EMAIL_HOST || 'smtp.gmail.com');
console.log('SMTP_PORT:', Number(process.env.EMAIL_PORT) || 587);
console.log('SMTP_SECURE:', EMAIL_SECURE ? 'true' : 'false');
console.log('MONGODB_URI configured:', MONGODB_URI ? 'YES' : 'NO');

if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_FROM) {
  console.warn('Gmail SMTP credentials are missing.');
}

const emailTransport = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: EMAIL_SECURE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

if (emailTransport) {
  emailTransport.verify()
    .then(() => {
      console.log('SMTP_VERIFY: SUCCESS');
      console.log('SMTP connection successful');
    })
    .catch((error) => {
      console.error('SMTP_VERIFY: FAILED');
      console.error('error.code:', error && error.code ? String(error.code) : 'NO_CODE');
      console.error('error.responseCode:', error && error.responseCode ? String(error.responseCode) : 'NO_RESPONSE');
      console.error('error.command:', error && error.command ? String(error.command) : 'NO_COMMAND');
      console.error('error.message:', error && error.message ? String(error.message) : 'NO_MESSAGE');
    });
} else {
  console.warn('SMTP is not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM in the environment.');
}

async function sendVerificationEmail(email, code) {
  if (!emailTransport) {
    return { sent: false, reason: 'Email provider not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM in the environment.' };
  }

  if (!email) {
    return { sent: false, reason: 'Recipient email is required.' };
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  console.log('[EMAIL] verification email requested for:', email);
  try {
    await emailTransport.sendMail({
      from: fromAddress,
      to: email,
      subject: 'Your JobTrack verification code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
          <h2>Welcome to JobTrack</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; margin: 20px 0; color: #4f46e5;">${code}</div>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });
    console.log('[EMAIL] verification email sent successfully');
    return { sent: true };
  } catch (error) {
    console.error('Email sending failed:');
    console.error(safeEmailError(error));
    return { sent: false, reason: "We couldn't send the verification email. Please try again." };
  }
}

async function sendPasswordResetEmail(email, token) {
  if (!emailTransport) {
    return { sent: false, reason: 'Email provider not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM in the environment.' };
  }

  const resetUrl = `${CLIENT_URL.replace(/\/$/, '')}/reset-password/${encodeURIComponent(token)}`;
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  try {
    await emailTransport.sendMail({
      from: fromAddress,
      to: email,
      subject: 'JobTrack — Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; line-height: 1.6;">
          <div style="display: inline-block; padding: 8px 14px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-weight: 700; margin-bottom: 16px;">JobTrack</div>
          <h2 style="margin: 0 0 12px;">Password reset requested</h2>
          <p style="margin: 0 0 16px;">Someone requested a password reset for your JobTrack account.</p>
          <p style="margin: 0 0 16px;">Click the button below to create a new password.</p>
          <div style="margin: 20px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 700;">Reset Password</a>
          </div>
          <p style="margin: 0 0 12px;">This link expires in 15 minutes.</p>
          <p style="margin: 0 0 12px;">If you did not request this password reset, you can safely ignore this email.</p>
          <p style="margin: 0; color: #6b7280;">For security reasons, this link can only be used once.</p>
        </div>
      `,
    });
    return { sent: true };
  } catch (error) {
    console.error('Email sending failed:');
    console.error(safeEmailError(error));
    return { sent: false, reason: "We couldn't send the password reset email. Please try again." };
  }
}

const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?\/?$/i;
const allowedOrigins = Array.from(new Set([
  CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean).map((value) => value.replace(/\/$/, ''))));

app.use(cors({
  origin: function (origin, callback) {
    const normalizedOrigin = origin ? origin.replace(/\/$/, '') : origin;
    if (!origin || allowedOrigins.includes(normalizedOrigin) || localhostOriginPattern.test(normalizedOrigin)) {
      callback(null, true);
      return;
    }
    console.warn('CORS_BLOCKED_ORIGIN', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  profile: {
    type: {
      phone: { type: String, default: '' },
      location: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      portfolio: { type: String, default: '' },
      bio: { type: String, default: '' },
    },
    default: () => ({ phone: '', location: '', linkedin: '', portfolio: '', bio: '' }),
  },
  publicProfile: {
    enabled: { type: Boolean, default: false },
    about: { type: Boolean, default: true },
    skills: { type: Boolean, default: true },
    projects: { type: Boolean, default: true },
    experience: { type: Boolean, default: true },
    certifications: { type: Boolean, default: true },
    education: { type: Boolean, default: true },
  },
  isVerified: { type: Boolean, default: false },
  verificationCodeHash: { type: String, default: null },
  verificationCodeExpiresAt: { type: Number, default: null },
  verificationAttempts: { type: Number, default: 0 },
  passwordResetTokenHash: { type: String, default: null },
  passwordResetExpiresAt: { type: Number, default: null },
}, { timestamps: true });

const jobSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  location: { type: String, default: '' },
  salary: { type: String, default: '' },
  jobType: { type: String, default: '' },
  url: { type: String, default: '' },
  status: { type: String, default: 'Applied' },
  statusHistory: {
    type: [{ status: { type: String, required: true }, changedAt: { type: Date, default: Date.now } }],
    default: [],
  },
  applicationDate: { type: String, default: '' },
  deadline: { type: String, default: '' },
  notes: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  interviewDate: { type: String, default: '' },
  interviewTime: { type: String, default: '' },
  interviewType: { type: String, default: '' },
  interviewStatus: { type: String, default: '' },
  interviewNotes: { type: String, default: '' },
  workArrangement: { type: String, default: '' },
  experienceLevel: { type: String, default: '' },
  priority: { type: String, default: 'Medium' },
  description: { type: String, default: '' },
  requiredSkills: { type: [String], default: [] },
  source: { type: String, default: '' },
  followUpDate: { type: String, default: '' },
  followUpCompleted: { type: Boolean, default: false },
  followUpNotes: { type: String, default: '' },
  meetingLink: { type: String, default: '' },
  interviewRound: { type: String, default: '' },
}, { timestamps: true });

const resumeSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, default: '' },
  professionalTitle: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  location: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  github: { type: String, default: '' },
  portfolio: { type: String, default: '' },
  summary: { type: String, default: '' },
  experience: {
    type: [{
      company: { type: String, default: '' },
      position: { type: String, default: '' },
      location: { type: String, default: '' },
      startDate: { type: String, default: '' },
      endDate: { type: String, default: '' },
      current: { type: Boolean, default: false },
      bullets: { type: [String], default: [''] },
    }],
    default: [],
  },
  education: {
    type: [{
      institution: { type: String, default: '' },
      degree: { type: String, default: '' },
      fieldOfStudy: { type: String, default: '' },
      location: { type: String, default: '' },
      startDate: { type: String, default: '' },
      endDate: { type: String, default: '' },
      gpa: { type: String, default: '' },
    }],
    default: [],
  },
  skills: { type: [String], default: [] },
  projects: {
    type: [{
      name: { type: String, default: '' },
      description: { type: String, default: '' },
      technologies: { type: String, default: '' },
      url: { type: String, default: '' },
    }],
    default: [],
  },
  certifications: { type: [String], default: [] },
  achievements: { type: [String], default: [] },
  languages: { type: [String], default: [] },
  template: { type: String, default: 'Modern' },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const bookmarkSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  targetId: { type: String, required: true },
  title: { type: String, default: '' },
}, { timestamps: true });

const atsAnalysisSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  filename: { type: String, default: 'resume.pdf' },
  resumeText: { type: String, default: '' },
  jobDescription: { type: String, default: '' },
  overallScore: { type: Number, default: 0 },
  categoryScores: { type: Object, default: {} },
  matchedKeywords: { type: [String], default: [] },
  missingKeywords: { type: [String], default: [] },
  detectedSkills: { type: [String], default: [] },
  detectedSections: { type: [String], default: [] },
  strengths: { type: [String], default: [] },
  issues: { type: [String], default: [] },
  suggestions: { type: [String], default: [] },
}, { timestamps: true });

const ATS_UPLOAD_LIMIT_BYTES = 8 * 1024 * 1024;
const ATS_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ATS_SECTION_MAP = [
  { label: 'Summary / Objective', pattern: /\b(summary|objective|profile|about me|professional summary)\b/i },
  { label: 'Experience', pattern: /\b(experience|work experience|employment|professional history)\b/i },
  { label: 'Education', pattern: /\b(education|academic background|qualifications)\b/i },
  { label: 'Skills', pattern: /\b(skills|core competencies|technical skills|expertise)\b/i },
  { label: 'Projects', pattern: /\b(projects|portfolio|key projects|selected projects)\b/i },
  { label: 'Certifications', pattern: /\b(certifications|licenses|credentials)\b/i },
];
const ATS_SKILL_LIBRARY = [
  'javascript', 'typescript', 'react', 'node.js', 'node', 'express', 'html', 'css', 'sql', 'postgresql', 'mongodb', 'mysql', 'python', 'java', 'c#', 'c++', 'aws', 'azure', 'docker', 'kubernetes', 'git', 'agile', 'scrum', 'figma', 'ui', 'ux', 'leadership', 'communication', 'project management', 'rest api', 'api design', 'testing', 'seo', 'analytics', 'data analysis', 'excel'
];
const ATS_ACTION_VERBS = ['led', 'built', 'developed', 'managed', 'improved', 'created', 'designed', 'optimized', 'delivered', 'launched', 'implemented', 'reduced', 'increased', 'streamlined', 'architected'];
const ATS_STOP_WORDS = new Set(['a','an','and','are','as','at','be','by','for','from','has','have','in','into','is','it','its','of','on','or','that','the','their','this','to','with','you','your','our','we','will','can','should','using','use','years','year','role','work','working','experience','skills','skill','team','plus','about']);
const ATS_WEIGHTS = { keywordMatch: 0.30, skillsMatch: 0.20, structure: 0.15, experienceQuality: 0.15, contactInformation: 0.10, educationAndCertifications: 0.10 };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ATS_UPLOAD_LIMIT_BYTES },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = [...ATS_ALLOWED_MIME_TYPES];
    const extension = path.extname(file.originalname || '').toLowerCase();
    const isAllowed = allowedMimeTypes.includes(file.mimetype) || ['.pdf', '.docx'].includes(extension);
    if (isAllowed) {
      callback(null, true);
      return;
    }
    callback(new Error('Only PDF and DOCX files are supported.'));
  },
});

function sanitizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeKeywords(text) {
  if (!text) return [];
  const words = sanitizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !ATS_STOP_WORDS.has(word));

  const counts = new Map();
  words.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([word]) => word);
}

function extractContactInfo(text) {
  const cleaned = sanitizeText(text);
  const emailMatch = cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = cleaned.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  const profileMatch = cleaned.match(/https?:\/\/[^\s]+|(?:linkedin\.com\/in\/[^\s]+|linkedin\.com\/company\/[^\s]+|github\.com\/[^\s]+)/i);

  const lines = cleaned.split(/\n|\r/).map((line) => line.trim()).filter(Boolean);
  const nameCandidate = lines.find((line) => {
    const tokens = line.split(/\s+/).filter(Boolean);
    return tokens.length >= 2 && !/[0-9]/.test(line) && !/[@://]/.test(line) && !/\b(summary|experience|education|skills|projects|certifications)\b/i.test(line);
  }) || '';

  return {
    name: sanitizeText(nameCandidate) || '',
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0].replace(/\s+/g, ' ').trim() : '',
    portfolio: profileMatch ? profileMatch[0] : '',
  };
}

function detectSections(text) {
  return ATS_SECTION_MAP.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
}

function detectSkills(text) {
  const normalizedText = sanitizeText(text).toLowerCase();
  const matches = ATS_SKILL_LIBRARY.filter((skill) => {
    if (!skill) return false;
    const pattern = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${pattern}\\b`, 'i').test(normalizedText);
  });
  return matches.map((skill) => skill.replace(/\s+/g, ' ')).filter(Boolean);
}

function calculateExperienceQuality(text) {
  const words = sanitizeText(text).toLowerCase();
  const actionVerbHits = ATS_ACTION_VERBS.filter((verb) => new RegExp(`\\b${verb}\\b`, 'i').test(words)).length;
  const numbers = (words.match(/\b\d+(?:[.,]\d+)?%?\b/g) || []).length;
  const hasDates = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b/i.test(words);
  const hasRolePattern = /(?:senior|junior|lead|manager|engineer|analyst|designer|developer|specialist)/i.test(words);

  let score = 0;
  if (actionVerbHits > 0) score += 35;
  if (numbers > 0) score += 25;
  if (hasDates) score += 20;
  if (hasRolePattern) score += 20;
  return Math.min(100, score);
}

function buildAnalysisResult({ resumeText, jobDescription }) {
  const safeResumeText = String(resumeText || '').replace(/\r/g, '').trim().replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n');
  const safeJobDescription = sanitizeText(jobDescription || '');
  const contactInfo = extractContactInfo(safeResumeText);
  const sections = detectSections(safeResumeText);
  const detectedSkills = detectSkills(safeResumeText);
  const jobKeywords = safeJobDescription ? normalizeKeywords(safeJobDescription) : [];
  const resumeKeywords = normalizeKeywords(safeResumeText);
  const matchedKeywords = safeJobDescription ? jobKeywords.filter((keyword) => resumeKeywords.includes(keyword)) : [];
  const missingKeywords = safeJobDescription ? jobKeywords.filter((keyword) => !resumeKeywords.includes(keyword)) : [];
  const jobSkills = ATS_SKILL_LIBRARY.filter((skill) => {
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9+#])${escapedSkill}(?=$|[^a-z0-9+#])`, 'i').test(safeJobDescription);
  });
  const matchedJobSkills = jobSkills.filter((skill) => detectedSkills.includes(skill));

  const contactScore = [
    !!contactInfo.name,
    !!contactInfo.email,
    !!contactInfo.phone,
    !!contactInfo.portfolio,
  ].reduce((total, present) => total + (present ? 25 : 0), 0);

  const sectionScore = sections.length === 0 ? 0 : Math.min(100, (sections.length / 4) * 100);
  const skillsScore = safeJobDescription && jobSkills.length ? Math.round((matchedJobSkills.length / jobSkills.length) * 100) : (detectedSkills.length === 0 ? 0 : Math.min(100, 35 + detectedSkills.length * 10));
  const jobMatchScore = safeJobDescription ? Math.min(100, Math.round((matchedKeywords.length / Math.max(jobKeywords.length, 1)) * 100)) : Math.min(100, 40 + Math.min(resumeKeywords.length, 60));
  const structureScore = (() => {
    let score = 60;
    if (safeResumeText.length > 250) score += 15;
    if (safeResumeText.length > 1000) score += 10;
    if (sections.length >= 3) score += 10;
    if (/\t|\|\s*\w/.test(safeResumeText)) score -= 10;
    if (safeResumeText.length < 120) score -= 20;
    return Math.min(100, Math.max(0, score));
  })();
  const experienceScore = calculateExperienceQuality(safeResumeText);
  const atsRiskScore = (() => {
    let penalty = 0;
    if (!contactInfo.name || !contactInfo.email || !contactInfo.phone) penalty += 25;
    if (sections.length < 3) penalty += 20;
    if (safeResumeText.length < 200) penalty += 20;
    if (!sections.includes('Experience')) penalty += 15;
    if (!sections.includes('Skills')) penalty += 15;
    if (safeJobDescription && missingKeywords.length > 10) penalty += 15;
    if (new Set(resumeKeywords).size < 10) penalty += 10;
    return Math.max(0, 100 - penalty);
  })();

  const educationScore = /\b(education|degree|bachelor|master|university|college|certification|certifications)\b/i.test(safeResumeText) ? 100 : 45;
  const categoryScores = {
    keywordMatch: Math.round(jobMatchScore),
    skillsMatch: Math.round(skillsScore),
    structure: Math.round(Math.min(100, (sectionScore + structureScore) / 2)),
    experienceQuality: Math.round(experienceScore),
    contactInformation: contactScore,
    educationAndCertifications: educationScore,
  };
  const overallScore = Math.min(100, Math.max(0, Math.round(Object.entries(ATS_WEIGHTS).reduce((sum, [key, weight]) => sum + categoryScores[key] * weight, 0))));

  const strengths = [];
  if (contactScore >= 75) strengths.push('Contact details are clearly present and easy to find.');
  if (sections.length >= 4) strengths.push('Core resume sections are present and recognizable.');
  if (detectedSkills.length >= 4) strengths.push(`Strong technical skill coverage detected: ${detectedSkills.slice(0, 5).join(', ')}.`);
  if (experienceScore >= 70) strengths.push('Experience reads as action-oriented and includes measurable indicators.');
  if (safeJobDescription && matchedKeywords.length > 0) strengths.push(`Resume matches important job keywords such as ${matchedKeywords.slice(0, 5).join(', ')}.`);

  const issues = [];
  if (!contactInfo.name) issues.push('Missing candidate name.');
  if (!contactInfo.email) issues.push('Missing email address.');
  if (!contactInfo.phone) issues.push('Missing phone number.');
  if (sections.length < 3) issues.push('Resume lacks key section headings such as Experience, Skills, or Education.');
  if (!sections.includes('Skills')) issues.push('Add a dedicated Skills section to improve ATS matching.');
  if (safeResumeText.length < 200) issues.push('Resume text looks too short for a competitive ATS screening.');
  if (safeJobDescription && missingKeywords.length > 0) issues.push(`Missing important keywords from the job description: ${missingKeywords.slice(0, 8).join(', ')}.`);
  if (detectedSkills.length === 0) issues.push('No technical or professional skills were detected from the resume text.');
  if (safeResumeText.length > 10000) issues.push('Resume appears overly long or contains unusually dense formatting for ATS parsing.');

  const suggestions = [];
  if (!sections.includes('Summary')) suggestions.push('Add a brief summary/objective near the top of the resume.');
  if (!sections.includes('Skills')) suggestions.push('Create a clear Skills section with relevant technical and professional strengths.');
  if (safeJobDescription && missingKeywords.length > 0) suggestions.push(`Add keyword coverage for: ${missingKeywords.slice(0, 6).join(', ')}.`);
  if (experienceScore < 70) suggestions.push('Use stronger action verbs and include measurable outcomes such as percentages, revenue, or time saved.');
  if (contactInfo.name && !contactInfo.email) suggestions.push('Add a valid email address in the contact section.');
  if (!strengths.length) suggestions.push('Keep the resume concise, structured, and easy for ATS parsers to read.');

  return {
    overallScore,
    score: overallScore,
    categoryScores,
    matchedKeywords: matchedKeywords.slice(0, 25),
    missingKeywords: missingKeywords.slice(0, 25),
    detectedSkills: detectedSkills.slice(0, 20),
    detectedSections: sections,
    strengths: strengths.slice(0, 6),
    issues: issues.slice(0, 8),
    suggestions: suggestions.slice(0, 6),
    analysisType: safeJobDescription ? 'Job-specific compatibility analysis' : 'General resume analysis',
    scoringMethodology: ATS_WEIGHTS,
  };
}

function withUserOwnershipFilter(query, userId) {
  return { ...query, userId };
}

function normalizeAtsDocument(document) {
  if (!document) return null;
  return {
    id: document._id.toString(),
    filename: document.filename || 'resume.pdf',
    overallScore: document.overallScore,
    categoryScores: document.categoryScores || {},
    matchedKeywords: document.matchedKeywords || [],
    missingKeywords: document.missingKeywords || [],
    detectedSkills: document.detectedSkills || [],
    detectedSections: document.detectedSections || [],
    strengths: document.strengths || [],
    issues: document.issues || [],
    suggestions: document.suggestions || [],
    analysisType: document.jobDescription ? 'Job-specific compatibility analysis' : 'General resume analysis',
    scoringMethodology: ATS_WEIGHTS,
    createdAt: document.createdAt,
    jobDescription: document.jobDescription || '',
  };
}

function normalizeLegacyResumePayload(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const asStringArray = (input) => Array.isArray(input)
    ? input
        .filter((item) => typeof item === 'string' || typeof item === 'number')
        .map((item) => String(item).trim())
        .filter(Boolean)
    : [];

  const cleanText = (input, fallback = '') => {
    if (typeof input === 'string') return input.trim();
    if (input === null || input === undefined) return fallback;
    return String(input).trim();
  };

  const normalizeProject = (item, index) => {
    if (item && typeof item === 'object') {
      return {
        name: cleanText(item.name),
        description: cleanText(item.description),
        technologies: cleanText(item.technologies),
        url: cleanText(item.url),
      };
    }
    const text = cleanText(item);
    return {
      name: text || `Project ${index + 1}`,
      description: '',
      technologies: '',
      url: '',
    };
  };

  const normalizeExperienceItem = (item, index) => {
    if (item && typeof item === 'object') {
      const bullets = Array.isArray(item.bullets) ? item.bullets.map((bullet) => cleanText(bullet)).filter(Boolean) : [];
      return {
        company: cleanText(item.company),
        position: cleanText(item.position),
        location: cleanText(item.location),
        startDate: cleanText(item.startDate),
        endDate: cleanText(item.endDate),
        current: Boolean(item.current),
        bullets: bullets.length ? bullets : [''],
      };
    }

    const text = cleanText(item);
    const match = text.match(/^(.*?)[,\s]+(.*?)(?:\s*[-–]\s*(.*))?$/);
    return {
      company: match && match[1] ? match[1] : '',
      position: match && match[2] ? match[2] : text || `Experience ${index + 1}`,
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      bullets: match && match[3] ? [match[3]] : [''],
    };
  };

  const normalizeEducationItem = (item) => {
    if (item && typeof item === 'object') {
      return {
        institution: cleanText(item.institution),
        degree: cleanText(item.degree),
        fieldOfStudy: cleanText(item.fieldOfStudy),
        location: cleanText(item.location),
        startDate: cleanText(item.startDate),
        endDate: cleanText(item.endDate),
        gpa: cleanText(item.gpa),
      };
    }
    return {
      institution: '',
      degree: cleanText(item),
      fieldOfStudy: '',
      location: '',
      startDate: '',
      endDate: '',
      gpa: '',
    };
  };

  const experience = Array.isArray(source.experience)
    ? source.experience.map(normalizeExperienceItem).filter((entry) => entry && (entry.company || entry.position || (entry.bullets || []).some(Boolean)))
    : [];

  const education = Array.isArray(source.education)
    ? source.education.map(normalizeEducationItem).filter((entry) => entry && (entry.institution || entry.degree || entry.fieldOfStudy))
    : [];

  const projects = Array.isArray(source.projects)
    ? source.projects.map(normalizeProject).filter((entry) => entry && (entry.name || entry.description || entry.technologies || entry.url))
    : [];

  return {
    fullName: cleanText(source.fullName || source.name),
    professionalTitle: cleanText(source.professionalTitle),
    email: cleanText(source.email),
    phone: cleanText(source.phone),
    location: cleanText(source.location),
    linkedin: cleanText(source.linkedin),
    github: cleanText(source.github),
    portfolio: cleanText(source.portfolio),
    summary: cleanText(source.summary),
    experience: experience.length ? experience : [{ company: '', position: '', location: '', startDate: '', endDate: '', current: false, bullets: [''] }],
    education: education.length ? education : [{ institution: '', degree: '', fieldOfStudy: '', location: '', startDate: '', endDate: '', gpa: '' }],
    skills: asStringArray(source.skills),
    projects: projects.length ? projects : [{ name: '', description: '', technologies: '', url: '' }],
    certifications: asStringArray(source.certifications),
    achievements: asStringArray(source.achievements),
    languages: asStringArray(source.languages),
    template: ['Modern', 'Professional', 'Minimal'].includes(source.template) ? source.template : 'Modern',
  };
}

const User = mongoose.model('User', userSchema);
const Job = mongoose.model('Job', jobSchema);
const Resume = mongoose.model('Resume', resumeSchema);
const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
const AtsAnalysis = mongoose.model('AtsAnalysis', atsAnalysisSchema);

const careerProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  educationLevel: { type: String, default: '' },
  currentRole: { type: String, default: '' },
  targetRole: { type: String, default: '' },
  experienceLevel: { type: String, default: '' },
  technicalSkills: { type: [String], default: [] },
  softSkills: { type: [String], default: [] },
  industry: { type: String, default: '' },
  workLocation: { type: String, default: '' },
  careerGoal: { type: String, default: '' },
  weeklyLearningTime: { type: Number, default: 0 },
  targetTimeline: { type: String, default: '' },
  preferredTechnologies: { type: [String], default: [] },
}, { timestamps: true });

const learningGoalSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  skill: { type: String, required: true },
  description: { type: String, default: '' },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  estimatedEffort: { type: String, default: '' },
  status: { type: String, enum: ['Not Started', 'In Progress', 'Completed'], default: 'Not Started' },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  targetDate: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

const roadmapItemSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  targetRole: { type: String, default: '' },
  category: { type: String, enum: ['Skills', 'Learning', 'Projects', 'Certifications', 'Interview', 'Applications'], required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['Not Started', 'In Progress', 'Completed'], default: 'Not Started' },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const toolItemSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  kind: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false },
}, { timestamps: true });

const CareerProfile = mongoose.model('CareerProfile', careerProfileSchema);
const LearningGoal = mongoose.model('LearningGoal', learningGoalSchema);
const RoadmapItem = mongoose.model('RoadmapItem', roadmapItemSchema);
const ToolItem = mongoose.model('ToolItem', toolItemSchema);

const interviewSaveSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  questionId: { type: String, required: true },
  savedAt: { type: Date, default: Date.now },
}, { timestamps: true });
interviewSaveSchema.index({ userId: 1, questionId: 1 }, { unique: true });

const interviewPracticeSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  questionId: { type: String, required: true },
  answer: { type: String, required: true },
  score: { type: Number, required: true },
  feedback: { type: Object, required: true },
}, { timestamps: true });

const InterviewSave = mongoose.model('InterviewSave', interviewSaveSchema);
const InterviewPractice = mongoose.model('InterviewPractice', interviewPracticeSchema);

const interviewQuestions = [
  { id: 'hr-introduction', category: 'HR', subcategory: 'Self Introduction', difficulty: 'Easy', role: 'Software Engineer', question: 'Tell me about yourself.', answer: 'Example: connect your current strengths, relevant experience, and the kind of work you want to do next. Keep it focused on the role.', keyPoints: ['Present focus', 'Relevant evidence', 'Why this role'], commonMistakes: ['Reciting your entire biography'], tips: ['Keep the answer to 60-90 seconds.'], tags: ['communication'] },
  { id: 'behavioral-conflict', category: 'Behavioral', subcategory: 'Conflict Resolution', difficulty: 'Medium', role: 'Software Engineer', question: 'Describe a time you resolved a conflict in a team.', answer: 'Example: use STAR. Explain the shared goal, how you listened, the action you took to align the team, and the outcome.', keyPoints: ['Situation and task', 'Specific action', 'Outcome and learning'], commonMistakes: ['Blaming a teammate'], tips: ['Use a real experience and protect confidential details.'], tags: ['STAR', 'teamwork'] },
  { id: 'technical-react-performance', category: 'Technical', subcategory: 'React', difficulty: 'Hard', role: 'Frontend Developer', question: 'How do you improve React application performance?', answer: 'Profile first, then reduce unnecessary renders, keep state close to where it is used, split large bundles, optimize data fetching, and verify improvements with measurements.', keyPoints: ['Profiling', 'Render and bundle optimization', 'Measurement'], commonMistakes: ['Adding memoization everywhere'], tips: ['Explain the trade-off of each optimization.'], tags: ['React', 'JavaScript'] },
  { id: 'situational-priority', category: 'Situational', subcategory: 'Prioritization', difficulty: 'Medium', role: 'Full Stack Developer', question: 'How do you prioritize work when multiple deadlines are moving?', answer: 'Clarify urgency, customer impact, dependencies, and effort. Propose an ordered plan, communicate trade-offs early, and revisit it as new information arrives.', keyPoints: ['Impact and urgency', 'Dependencies', 'Communication'], commonMistakes: ['Trying to do everything at once'], tips: ['State what you would defer and why.'], tags: ['prioritization'] },
  { id: 'technical-node-io', category: 'Technical', subcategory: 'Node.js', difficulty: 'Medium', role: 'Backend Developer', question: 'How does Node.js handle concurrent I/O?', answer: 'Node uses an event loop and asynchronous, non-blocking I/O so one process can coordinate many waiting operations. CPU-heavy work still needs care or worker threads.', keyPoints: ['Event loop', 'Non-blocking I/O', 'CPU-bound trade-offs'], commonMistakes: ['Calling Node fully parallel by default'], tips: ['Contrast I/O concurrency with CPU parallelism.'], tags: ['Node.js', 'backend'] },
  { id: 'behavioral-failure', category: 'Behavioral', subcategory: 'Failure', difficulty: 'Medium', role: 'Software Engineer', roles: ['Software Engineer', 'Data Analyst'], question: 'Tell me about a professional failure and what you learned.', answer: 'Example: describe a real mistake, your responsibility, the corrective action, and the process change that reduced the chance of repetition.', keyPoints: ['Ownership', 'Correction', 'Learning'], commonMistakes: ['Choosing a fake weakness'], tips: ['Do not invent metrics or blame others.'], tags: ['STAR', 'growth'] },
  { id: 'behavioral-data-decision', category: 'Behavioral', subcategory: 'Decision Making', difficulty: 'Hard', role: 'Data Analyst', roles: ['Data Analyst', 'Data Scientist'], question: 'Describe a difficult data-driven decision you made.', answer: 'Example: use STAR to explain the business context, the evidence you evaluated, the decision you recommended, how you communicated uncertainty, and the measurable outcome.', keyPoints: ['Evidence and assumptions', 'Trade-offs', 'Communication', 'Outcome'], commonMistakes: ['Presenting analysis without a decision', 'Inventing an outcome'], tips: ['Use a real project and distinguish facts from assumptions.'], tags: ['STAR', 'Data Analysis', 'Decision Making'] },
  { id: 'hr-motivation', category: 'HR', subcategory: 'Company Motivation', difficulty: 'Easy', role: 'Full Stack Developer', question: 'Why are you interested in this company?', answer: 'Connect a specific product, mission, or working style detail to your experience and the contribution you want to make.', keyPoints: ['Specific research', 'Role alignment', 'Authentic motivation'], commonMistakes: ['Generic praise'], tips: ['Mention one informed question for the interviewer.'], tags: ['company'] },
  { id: 'technical-sql', category: 'Technical', subcategory: 'SQL', difficulty: 'Medium', role: 'Data Analyst', question: 'How would you investigate a query that suddenly became slow?', answer: 'Reproduce it, inspect the query plan, check data volume and indexes, look for changed parameters or locks, make one measured change, and monitor the result.', keyPoints: ['Reproduction', 'Query plan', 'Indexes', 'Monitoring'], commonMistakes: ['Adding indexes without checking the plan'], tips: ['Discuss correctness and operational risk.'], tags: ['SQL', 'databases'] },
];

const aptitudeQuestions = [
  { id: 1, category: 'Quantitative Aptitude', question: 'If 15 is 30% of a number, what is the number?', options: ['30', '40', '45', '50'], answer: '50', explanation: '15 = 0.3 × x, so x = 50.' },
  { id: 2, category: 'Logical Reasoning', question: 'Which is the next number: 2, 6, 12, 20, ?', options: ['28', '30', '32', '36'], answer: '30', explanation: 'The pattern adds 4, 6, 8, then 10.' }
];

const technicalTopics = [
  { id: 'react', title: 'React', concepts: ['Hooks', 'State management', 'Performance'], questions: ['What is useMemo used for?'], examples: ['Example: memoized selection logic'], interviewQuestions: ['Explain reconciliation in React.'] },
  { id: 'node', title: 'Node.js', concepts: ['Event loop', 'REST APIs', 'Streams'], questions: ['How does Node handle I/O?'], examples: ['Simple Express API'], interviewQuestions: ['Difference between sync and async operations.'] }
];

function generateToken(user) {
  const userId = user && (user._id ? user._id.toString() : user.id);
  return jwt.sign({ id: userId, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }
    req.user = { id: user._id.toString(), email: user.email };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function normalizeSkillList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value || '')
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildRecommendations({ jobs, profileSkills, preferredRole, preferredLocation, workMode, salaryTarget, experienceYears, education }) {
  const preferredRoleLower = String(preferredRole || '').toLowerCase();
  const userSkills = new Set(normalizeSkillList(profileSkills).map((skill) => skill.toLowerCase()));
  const salaryScore = Number(salaryTarget) ? 1 : 0;

  return jobs
    .map((role) => {
      const requiredSkills = normalizeSkillList(role.requiredSkills?.length ? role.requiredSkills : String(role.description || '').match(/[a-z][a-z0-9+#.-]{2,}/gi) || []);
      const normalizedRole = String(role.title).toLowerCase();
      const jobLocation = String(role.location || '').trim();
      const jobWorkMode = String(role.workArrangement || role.workMode || role.jobType || '').trim();
      const skillMatches = requiredSkills.filter((skill) => userSkills.has(skill.toLowerCase()));
      const missingSkills = requiredSkills.filter((skill) => !userSkills.has(skill.toLowerCase()));
      let matchPercentage = requiredSkills.length ? Math.round((skillMatches.length / requiredSkills.length) * 70) : 35;

      if (preferredRoleLower && normalizedRole.includes(preferredRoleLower)) {
        matchPercentage += 10;
      }
      if (experienceYears >= 3) {
        matchPercentage += 5;
      }
      if (workMode && jobWorkMode.toLowerCase() === String(workMode).toLowerCase()) {
        matchPercentage += 5;
      }
      if (preferredLocation && jobLocation.toLowerCase().includes(String(preferredLocation).toLowerCase())) {
        matchPercentage += 5;
      }
      if (education && String(education).toLowerCase().includes('bachelor')) {
        matchPercentage += 3;
      }
      if (salaryScore && Number(salaryTarget) >= 100000) {
        matchPercentage += 2;
      }

      matchPercentage = Math.max(40, Math.min(97, matchPercentage));

      const reason = `${skillMatches.length} of your current skills align with ${role.title}, and the remaining gap is mainly ${missingSkills.slice(0, 2).join(', ')}.`;

      return {
        title: role.title,
        company: role.company,
        location: jobLocation || 'Location not specified',
        workMode: jobWorkMode || 'Work mode not specified',
        salary: String(role.salary || ''),
        url: String(role.url || ''),
        requiredSkills,
        matchPercentage,
        matchingSkills: skillMatches.slice(0, 4),
        missingSkills: missingSkills.slice(0, 4),
        reason,
      };
    })
    .sort((left, right) => right.matchPercentage - left.matchPercentage)
    .slice(0, 5);
}

app.post('/api/recommendations', authMiddleware, async (req, res) => {
  try {
    const [profile, resume, jobs] = await Promise.all([
      CareerProfile.findOne({ userId: req.user.id }).lean(),
      Resume.findOne({ userId: req.user.id }).lean(),
      Job.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean(),
    ]);
    const payload = req.body || {};
    const skills = normalizeSkillList([...(profile?.technicalSkills || []), ...(resume?.skills || []), ...normalizeSkillList(payload.skills)]);
    const preferredRole = String(payload.role || profile?.targetRole || '').trim();
    const preferredLocation = String(payload.location || profile?.workLocation || '').trim();
    const workMode = String(payload.workMode || '').trim();
    const salaryTarget = Number(payload.salary || 0) || 0;
    const experienceYears = Number(payload.experience || 0) || 0;
    const education = String(payload.education || profile?.educationLevel || '').trim();

    const recommendations = buildRecommendations({
      jobs,
      profileSkills: skills,
      preferredRole,
      preferredLocation,
      workMode,
      salaryTarget,
      experienceYears,
      education,
    });

    res.json({
      success: true,
      recommendations,
      meta: {
        role: preferredRole,
        location: preferredLocation,
        workMode,
        experienceYears,
        skillsCount: skills.length,
      },
    });
  } catch (error) {
    console.error('Recommendation generation failed:', error);
    res.status(500).json({ success: false, message: 'Unable to generate recommendations right now.' });
  }
});

app.get('/api/skill-gap/:jobId', authMiddleware, async (req, res) => {
  try {
    const [job, profile, resume] = await Promise.all([
      Job.findOne({ _id: req.params.jobId, userId: req.user.id }).lean(),
      CareerProfile.findOne({ userId: req.user.id }).lean(),
      Resume.findOne({ userId: req.user.id }).lean(),
    ]);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    const currentSkills = [...new Set(normalizeSkillList([...(profile?.technicalSkills || []), ...(resume?.skills || [])]))];
    const requiredSkills = [...new Set(normalizeSkillList(job.requiredSkills?.length ? job.requiredSkills : String(job.description || '').match(/[a-z][a-z0-9+#.-]{2,}/gi) || []))];
    const known = new Set(currentSkills.map((skill) => skill.toLowerCase()));
    const matchingSkills = requiredSkills.filter((skill) => known.has(skill.toLowerCase()));
    const missingSkills = requiredSkills.filter((skill) => !known.has(skill.toLowerCase())).map((skill, index) => ({ skill, priority: index < 2 ? 'High' : 'Medium', status: 'Not Started' }));
    res.json({ success: true, job, currentSkills, requiredSkills, matchingSkills, missingSkills, matchPercentage: requiredSkills.length ? Math.round(matchingSkills.length / requiredSkills.length * 100) : 0 });
  } catch (error) { res.status(400).json({ success: false, message: 'Unable to analyze this skill gap.' }); }
});

async function seedDemoData() {
  const demoEmail = 'demo@jobtrack.app';
  let demoUser = await User.findOne({ email: demoEmail });

  if (!demoUser) {
    demoUser = await User.create({
      name: 'Ava Thompson',
      email: demoEmail,
      password: await bcrypt.hash('demo123', 10),
      profile: {
        phone: '+1 (415) 738-2201',
        location: 'San Francisco, CA',
        linkedin: 'linkedin.com/in/avathompson',
        portfolio: 'avathompson.dev',
        bio: 'Product-minded software engineer with a focus on growth and data-driven teams.',
      },
      isVerified: true,
    });
  }

  const demoJobs = [
    {
      userId: demoUser._id.toString(),
      title: 'Senior Frontend Engineer',
      company: 'Northstar Labs',
      location: 'Remote',
      salary: '$135k - $160k',
      jobType: 'Full-time',
      url: 'https://example.com/jobs/1',
      status: 'Applied',
      applicationDate: '2026-09-01',
      deadline: '2026-09-18',
      notes: 'Strong product role with React and design systems focus.',
    },
    {
      userId: demoUser._id.toString(),
      title: 'Product Analyst',
      company: 'SignalIQ',
      location: 'New York, NY',
      salary: '$110k - $130k',
      jobType: 'Hybrid',
      url: 'https://example.com/jobs/2',
      status: 'Interview',
      applicationDate: '2026-09-10',
      deadline: '2026-09-22',
      notes: 'Asked to share a case study and SQL sample.',
    },
  ];

  const resumeDoc = {
    userId: demoUser._id.toString(),
    personalInfo: {
      fullName: 'Ava Thompson',
      email: demoEmail,
      phone: '+1 (415) 738-2201',
      location: 'San Francisco, CA',
      linkedin: 'linkedin.com/in/avathompson',
      portfolio: 'avathompson.dev',
    },
    summary: 'Product-led Full Stack Engineer with 5+ years of experience building accessible web apps, shipping dashboards, and improving customer retention.',
    education: ['B.S. in Computer Science, University of California, Berkeley'],
    experience: ['Senior Frontend Engineer, Northstar Labs - Built reusable React design system used by 8 product teams.', 'Software Engineer, LatticeWorks - Improved onboarding funnel conversion by 18%.'],
    skills: ['React', 'Node.js', 'TypeScript', 'SQL', 'Figma'],
    projects: ['Hiring Platform optimization case study'],
    certifications: ['AWS Certified Cloud Practitioner'],
    template: 'Modern',
    updatedAt: new Date(),
  };

  const bookmarkDocs = [
    { userId: demoUser._id.toString(), type: 'job', targetId: 'job-1', title: 'Senior Frontend Engineer' },
    { userId: demoUser._id.toString(), type: 'resource', targetId: 'tech', title: 'Career guidance resources' },
  ];

  const existingJobs = await Job.countDocuments({ userId: demoUser._id.toString() });
  if (existingJobs === 0) {
    await Job.insertMany(demoJobs);
  }

  const existingResume = await Resume.findOne({ userId: demoUser._id.toString() });
  if (!existingResume) {
    await Resume.create(resumeDoc);
  }

  const existingBookmarks = await Bookmark.countDocuments({ userId: demoUser._id.toString() });
  if (existingBookmarks === 0) {
    await Bookmark.insertMany(bookmarkDocs);
  }
}

app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'JobTrack API', status: 'ok' });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ message: 'User already exists.' });
  }

  const newUser = new User({
    name: String(name).trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, 10),
    profile: {
      phone: '',
      location: '',
      linkedin: '',
      portfolio: '',
      bio: '',
    },
    isVerified: false,
  });

  const code = generateOtpCode();
  await setUserVerificationOtp(newUser, code);
  await newUser.save();

  const emailResult = await sendVerificationEmail(newUser.email, code);

  if (!emailResult.sent) {
    newUser.verificationCodeHash = null;
    newUser.verificationCodeExpiresAt = null;
    await newUser.save();
    return res.status(502).json({
      success: false,
      message: "We couldn't send the verification email. Please try again.",
    });
  }

  return res.status(201).json({
    success: true,
    user: serializeUser(newUser),
    verificationRequired: true,
    verificationEmailSent: true,
    message: 'Verification code sent to your email.',
  });
});

app.post('/api/auth/verify-email', async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) {
    return res.status(400).json({ message: 'Email and verification code are required.' });
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (!user.verificationCodeHash || !user.verificationCodeExpiresAt || Date.now() > user.verificationCodeExpiresAt) {
    return res.status(410).json({ message: 'Verification code expired. Please request a new one.' });
  }

  const matches = await bcrypt.compare(String(code), user.verificationCodeHash);
  if (!matches) {
    user.verificationAttempts = (user.verificationAttempts || 0) + 1;
    if (user.verificationAttempts >= 5) {
      user.verificationCodeHash = null;
      user.verificationCodeExpiresAt = null;
      await user.save();
      return res.status(429).json({ message: 'Too many failed verification attempts. Please request a new code.' });
    }
    await user.save();
    return res.status(401).json({ message: 'Invalid verification code.' });
  }

  user.isVerified = true;
  user.verificationCodeHash = null;
  user.verificationCodeExpiresAt = null;
  user.verificationAttempts = 0;
  await user.save();

  const token = generateToken(user);
  return res.json({
    success: true,
    token,
    user: serializeUser(user),
    message: 'Email verified successfully.'
  });
});

app.post('/api/auth/resend-verification', async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (user.isVerified) {
    return res.status(400).json({ message: 'This account is already verified.' });
  }

  const code = generateOtpCode();
  await setUserVerificationOtp(user, code);
  await user.save();

  const emailResult = await sendVerificationEmail(user.email, code);
  if (!emailResult.sent) {
    user.verificationCodeHash = null;
    user.verificationCodeExpiresAt = null;
    await user.save();
    return res.status(502).json({
      success: false,
      message: "We couldn't send the verification email. Please try again.",
    });
  }

  return res.json({
    success: true,
    verificationEmailSent: true,
    message: 'Verification code sent to your email.',
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      message: 'Email not verified. Please verify your email address to continue.',
      unverified: true,
      email: user.email,
    });
  }

  const token = generateToken(user);
  return res.json({
    token,
    user: serializeUser(user),
  });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  const user = await User.findOne({ email });

  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = await bcrypt.hash(resetToken, 10);
    user.passwordResetExpiresAt = Date.now() + 15 * 60 * 1000;
    await user.save();

    const emailResult = await sendPasswordResetEmail(user.email, resetToken);
    if (!emailResult.sent) {
      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      await user.save();
      return res.status(503).json({
        success: false,
        message: "We couldn't send the password reset email. Please try again.",
      });
    }
  }

  return res.json({
    success: true,
    message: 'If an account exists for this email, a password reset link has been sent.',
  });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const newPassword = String(req.body?.newPassword ?? req.body?.password ?? '').trim();
  const confirmPassword = String(req.body?.confirmPassword ?? '').trim();

  if (!token) {
    return res.status(400).json({ message: 'This password reset link is invalid.' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  if (req.body?.confirmPassword === undefined && req.body?.password !== undefined && req.body?.newPassword === undefined) {
    // legacy single-password payload support
  } else if (!confirmPassword) {
    return res.status(400).json({ message: 'Password confirmation is required.' });
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  const usersWithResetTokens = await User.find({ passwordResetTokenHash: { $ne: null } });
  let matchedUser = null;

  for (const user of usersWithResetTokens) {
    if (!user.passwordResetExpiresAt || Date.now() > user.passwordResetExpiresAt) {
      continue;
    }

    const valid = await bcrypt.compare(token, user.passwordResetTokenHash);
    if (valid) {
      matchedUser = user;
      break;
    }
  }

  if (!matchedUser) {
    return res.status(400).json({ message: 'This password reset link is invalid or has expired.' });
  }

  const isSameAsOldPassword = await bcrypt.compare(newPassword, matchedUser.password);
  if (isSameAsOldPassword) {
    return res.status(400).json({ message: 'Please choose a new password that is different from your current one.' });
  }

  matchedUser.password = await bcrypt.hash(newPassword, 10);
  matchedUser.passwordResetTokenHash = null;
  matchedUser.passwordResetExpiresAt = null;
  await matchedUser.save();

  return res.json({ success: true, message: 'Your password has been reset successfully. You can now log in.' });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({ user: serializeUser(user) });
});

app.put('/api/auth/password', authMiddleware, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new passwords are required.' });
  if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  const user = await User.findById(req.user.id);
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) return res.status(401).json({ message: 'Current password is incorrect.' });
  if (await bcrypt.compare(newPassword, user.password)) return res.status(400).json({ message: 'Choose a password different from your current one.' });
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ success: true, message: 'Password updated successfully.' });
});

app.get('/api/jobs', authMiddleware, async (req, res) => {
  const jobs = await Job.find({ userId: req.user.id }).sort({ updatedAt: -1 });
  res.json({ jobs });
});

app.get('/api/jobs/:id', authMiddleware, async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, userId: req.user.id });
  if (!job) return res.status(404).json({ message: 'Job not found.' });
  res.json({ job });
});

app.patch('/api/jobs/:id/status', authMiddleware, async (req, res) => {
  const allowedStatuses = ['Wishlist', 'Applied', 'Screening', 'Interview', 'Offer', 'Accepted', 'Rejected', 'Withdrawn'];
  const status = String(req.body?.status || '');
  if (!allowedStatuses.includes(status)) return res.status(400).json({ message: 'Invalid application status.' });
  const existing = await Job.findOne({ _id: req.params.id, userId: req.user.id });
  if (!existing) return res.status(404).json({ message: 'Job not found.' });
  existing.status = status;
  existing.statusHistory = [...(existing.statusHistory || []), { status, changedAt: new Date() }];
  await existing.save();
  res.json({ job: existing });
});

app.get('/api/jobs/:id/timeline', authMiddleware, async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, userId: req.user.id }).lean();
  if (!job) return res.status(404).json({ message: 'Job not found.' });
  const history = job.statusHistory?.length ? job.statusHistory : [{ status: job.status || 'Saved', changedAt: job.createdAt }];
  res.json({ success: true, timeline: { job, history } });
});

app.get('/api/analytics', authMiddleware, async (req, res) => {
  try {
    const [jobs, bookmarks] = await Promise.all([Job.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean(), Bookmark.countDocuments({ userId: req.user.id, type: 'job' })]);
    const statusCounts = jobs.reduce((result, job) => { const status = job.status || 'Saved'; result[status] = (result[status] || 0) + 1; return result; }, {});
    const today = new Date().toISOString().slice(0, 10);
    const deadlines = jobs.filter((job) => job.deadline).map((job) => ({ id: job._id, title: job.title, company: job.company, deadline: job.deadline, status: job.status })).sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)));
    res.json({ success: true, analytics: { totals: { total: jobs.length, saved: bookmarks, applied: statusCounts.Applied || 0, shortlisted: (statusCounts.Screening || 0) + (statusCounts.Shortlisted || 0), interviews: statusCounts.Interview || 0, offers: (statusCounts.Offer || 0) + (statusCounts.Accepted || 0), rejected: statusCounts.Rejected || 0 }, statusCounts, deadlines: { upcoming: deadlines.filter((item) => item.deadline > today), today: deadlines.filter((item) => item.deadline === today), overdue: deadlines.filter((item) => item.deadline < today) }, applications: jobs } });
  } catch (error) { res.status(500).json({ success: false, message: 'Unable to load application analytics.' }); }
});

app.get('/api/dashboard/summary', authMiddleware, async (req, res) => {
  try {
    const [jobs, bookmarks, resume, latestAts, goals, practices, profile, projectCount, certificationCount] = await Promise.all([
      Job.find({ userId: req.user.id, ...(req.query.status && req.query.status !== 'All' ? { status: String(req.query.status) } : {}) }).sort({ updatedAt: -1 }).lean(),
      Bookmark.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean(),
      Resume.findOne({ userId: req.user.id }).lean(),
      AtsAnalysis.findOne({ userId: req.user.id }).sort({ createdAt: -1 }).lean(),
      LearningGoal.find({ userId: req.user.id }).lean(),
      InterviewPractice.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean(),
      CareerProfile.findOne({ userId: req.user.id }).lean(),
      ToolItem.countDocuments({ userId: req.user.id, kind: 'projects' }),
      ToolItem.countDocuments({ userId: req.user.id, kind: 'certifications' }),
    ]);

    const statusCounts = jobs.reduce((counts, job) => { const key = job.status || 'Other'; counts[key] = (counts[key] || 0) + 1; return counts; }, {});
    const parseDate = (job) => new Date(job.applicationDate || job.createdAt);
    const range = String(req.query.range || '90d');
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '180d' ? 180 : 90;
    const cutoff = Date.now() - days * 86400000;
    const trendMap = new Map();
    jobs.filter((job) => parseDate(job).getTime() >= cutoff).forEach((job) => { const date = parseDate(job); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; trendMap.set(key, (trendMap.get(key) || 0) + 1); });
    const upcomingInterviews = jobs.filter((job) => job.interviewDate && (!job.interviewStatus || job.interviewStatus !== 'Completed')).sort((left, right) => `${left.interviewDate} ${left.interviewTime || ''}`.localeCompare(`${right.interviewDate} ${right.interviewTime || ''}`));
    const today = new Date().toISOString().slice(0, 10);
    const deadlineReminders = jobs.filter((job) => job.deadline && !['Rejected', 'Accepted', 'Withdrawn'].includes(job.status) && job.deadline >= today).sort((left, right) => String(left.deadline).localeCompare(String(right.deadline))).slice(0, 8);
    const completedGoals = goals.filter((goal) => goal.status === 'Completed').length;
    const profileFields = [profile?.targetRole, profile?.experienceLevel, profile?.educationLevel, profile?.currentRole, profile?.industry, profile?.workLocation, profile?.careerGoal, profile?.technicalSkills?.length, profile?.softSkills?.length];
    const resumeFields = [resume?.fullName, resume?.professionalTitle, resume?.summary, resume?.skills?.length, resume?.experience?.length, resume?.education?.length];
    const profileCompletion = Math.round([...profileFields, ...resumeFields].filter(Boolean).length / 15 * 100);
    const profileMissing = [...(!profile?.currentRole ? ['Personal information'] : []), ...(!profile?.educationLevel && !resume?.education?.length ? ['Education'] : []), ...(!profile?.technicalSkills?.length && !resume?.skills?.length ? ['Skills'] : []), ...(!resume?.experience?.length ? ['Experience'] : []), ...(!resume ? ['Resume'] : []), ...(!resume?.projects?.length ? ['Projects'] : []), ...(!resume?.certifications?.length ? ['Certifications'] : []), ...(!profile?.targetRole ? ['Career preferences'] : [])];
    const readinessCategories = { resume: resume ? 100 : 0, skills: Math.min(100, (new Set([...(profile?.technicalSkills || []), ...(resume?.skills || [])])).size * 12), projects: projectCount ? 100 : 0, experience: resume?.experience?.length ? 100 : 0, certifications: certificationCount || resume?.certifications?.length ? 100 : 0, interview: Math.min(100, practices.length * 20), profile: profileCompletion, roadmap: goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) : 0 };
    const careerReadiness = Math.round(Object.values(readinessCategories).reduce((sum, score) => sum + score, 0) / Object.keys(readinessCategories).length);
    const nextActions = [];
    if (!resume) nextActions.push({ title: 'Create your first resume', description: 'Build a resume before applying to more roles.', path: '/resume', priority: 'High' });
    if (upcomingInterviews.length) nextActions.push({ title: 'Review interview preparation', description: `${upcomingInterviews.length} scheduled interview${upcomingInterviews.length === 1 ? '' : 's'} need attention.`, path: '/interview', priority: 'High' });
    if (!practices.length) nextActions.push({ title: 'Practice an interview question', description: 'Start a practice session to create preparation history.', path: '/interview', priority: 'Medium' });
    if (goals.some((goal) => goal.status !== 'Completed')) nextActions.push({ title: 'Continue your learning roadmap', description: 'You have unfinished learning goals.', path: '/career', priority: 'Medium' });
    if (!nextActions.length && jobs.length) nextActions.push({ title: 'Review your application pipeline', description: 'Keep statuses and follow-up notes current.', path: '/jobs', priority: 'Low' });
    const recentActivity = jobs.slice(0, 5).map((job) => ({ label: `${job.status || 'Updated'}: ${job.title} at ${job.company}`, date: job.updatedAt || job.createdAt, path: '/jobs' }));
    if (resume) recentActivity.push({ label: 'Resume is available', date: resume.updatedAt || resume.createdAt, path: '/resume' });
    res.json({ success: true, data: {
      greeting: `Good day, ${req.user.email.split('@')[0]}`,
      kpis: { totalApplications: jobs.length, activeApplications: jobs.filter((job) => !['Rejected', 'Offer', 'Withdrawn'].includes(job.status)).length, interviews: jobs.filter((job) => job.status === 'Interview').length, offers: jobs.filter((job) => job.status === 'Offer').length, savedJobs: bookmarks.length, atsScore: latestAts?.overallScore ?? null },
      statusCounts, trends: [...trendMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([month, applications]) => ({ month, applications })), recentApplications: jobs.slice(0, 5), upcomingInterviews, deadlineReminders, readiness: { resumeAvailable: Boolean(resume), atsAvailable: Boolean(latestAts), interviewPracticeSessions: practices.length, roadmapCompletion: goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) : 0, profileComplete: Boolean(profile?.targetRole), profileCompletion, profileMissing, careerReadiness, readinessCategories }, nextActions, recentActivity, filters: { range, days, status: req.query.status || 'All' }, completedGoals,
    } });
  } catch (error) { res.status(500).json({ success: false, message: 'Unable to load dashboard summary.' }); }
});

const JOB_WRITE_FIELDS = ['title', 'company', 'location', 'salary', 'jobType', 'url', 'status', 'applicationDate', 'deadline', 'notes', 'contactPerson', 'contactEmail', 'interviewDate', 'interviewTime', 'interviewType', 'interviewStatus', 'interviewNotes', 'workArrangement', 'experienceLevel', 'priority', 'description', 'requiredSkills', 'source', 'followUpDate', 'followUpCompleted', 'followUpNotes', 'meetingLink', 'interviewRound'];
function sanitizeJobPayload(payload) {
  return Object.fromEntries(Object.entries(payload || {}).filter(([key]) => JOB_WRITE_FIELDS.includes(key)));
}

app.post('/api/jobs', authMiddleware, async (req, res) => {
  const payload = sanitizeJobPayload(req.body);
  const job = await Job.create({ userId: req.user.id, ...payload, status: payload.status || 'Saved', statusHistory: [{ status: payload.status || 'Saved', changedAt: new Date() }] });
  res.status(201).json({ job });
});

app.put('/api/jobs/:id', authMiddleware, async (req, res) => {
  const existing = await Job.findOne({ _id: req.params.id, userId: req.user.id });
  if (!existing) return res.status(404).json({ message: 'Job not found.' });
  const changes = sanitizeJobPayload(req.body);
  const previousStatus = existing.status;
  Object.assign(existing, changes);
  if (changes.status && changes.status !== previousStatus) existing.statusHistory = [...(existing.statusHistory || []), { status: changes.status, changedAt: new Date() }];
  await existing.save();
  const job = existing;

  res.json({ job });
});

app.delete('/api/jobs/:id', authMiddleware, async (req, res) => {
  const deleted = await Job.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (deleted.deletedCount === 0) {
    return res.status(404).json({ message: 'Job not found.' });
  }

  res.json({ success: true });
});

app.get('/api/resume', authMiddleware, async (req, res) => {
  const existing = await Resume.findOne({ userId: req.user.id });
  if (!existing) {
    return res.status(404).json({ message: 'No resume found for this user.' });
  }

  const normalized = normalizeLegacyResumePayload(existing.toObject());
  if (JSON.stringify(normalized) !== JSON.stringify(existing.toObject())) {
    await Resume.findOneAndUpdate(
      { _id: existing._id },
      { $set: { ...normalized, updatedAt: new Date() } },
      { new: true }
    );
  }

  res.json({ resume: normalized });
});

app.post('/api/resume', authMiddleware, async (req, res) => {
  const sanitized = normalizeLegacyResumePayload(req.body);
  const resume = await Resume.create({ userId: req.user.id, ...sanitized, updatedAt: new Date() });
  res.status(201).json({ resume: normalizeLegacyResumePayload(resume.toObject()) });
});

app.put('/api/resume', authMiddleware, async (req, res) => {
  const sanitized = normalizeLegacyResumePayload(req.body);
  const resume = await Resume.findOneAndUpdate(
    { userId: req.user.id },
    { $set: { ...sanitized, userId: req.user.id, updatedAt: new Date() } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ resume: normalizeLegacyResumePayload(resume.toObject()) });
});

app.post('/api/resume/match', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    const [resume, selectedJob] = await Promise.all([
      Resume.findOne({ userId: req.user.id }).lean(),
      req.body?.jobId ? Job.findOne({ _id: req.body.jobId, userId: req.user.id }).lean() : null,
    ]);
    if (!resume) return res.status(404).json({ success: false, message: 'Create a resume before running a match.' });
    if (!selectedJob && !String(req.body?.jobDescription || '').trim()) return res.status(400).json({ success: false, message: 'Select a saved job or paste a job description before running a match.' });
    const job = selectedJob || { _id: 'custom-job', title: String(req.body?.jobTitle || 'Target job'), company: 'Custom description', description: String(req.body.jobDescription), requiredSkills: normalizeSkillList(req.body.requiredSkills) };

    const resumeText = normalizeLegacyResumePayload(resume);
    let suppliedResumeText = String(req.body?.resumeText || '').trim();
    if (req.file) {
      const extension = path.extname(req.file.originalname || '').toLowerCase();
      try {
        if (extension === '.pdf') suppliedResumeText = sanitizeText((await pdfParse(req.file.buffer)).text || '');
        if (extension === '.docx') suppliedResumeText = sanitizeText((await mammoth.extractRawText({ buffer: req.file.buffer })).value || '');
      } catch (error) {
        return res.status(422).json({ success: false, message: 'The uploaded resume could not be read.' });
      }
    }
    const resumeSkills = normalizeSkillList(resumeText.skills);
    const requiredSkills = normalizeSkillList(job.requiredSkills);
    const descriptionTerms = String(job.description || '').match(/[a-z][a-z0-9+#.-]{2,}/gi) || [];
    const requirements = [...new Set([...requiredSkills, ...descriptionTerms.slice(0, 12)])];
    const normalizedResume = new Set([
      ...resumeSkills,
      resumeText.summary,
      ...(resumeText.experience || []).map((item) => typeof item === 'string' ? item : `${item.position || ''} ${item.bullets?.join(' ') || ''}`),
      ...(resumeText.projects || []).map((item) => typeof item === 'string' ? item : `${item.name || ''} ${item.description || ''} ${item.technologies || ''}`),
      suppliedResumeText,
    ].join(' ').toLowerCase().split(/[^a-z0-9+#.-]+/).filter(Boolean));
    const matchingSkills = requirements.filter((skill) => normalizedResume.has(String(skill).toLowerCase()));
    const missingSkills = requirements.filter((skill) => !normalizedResume.has(String(skill).toLowerCase()));
    const keywordText = `${job.title} ${job.description || ''} ${requirements.join(' ')}`.toLowerCase();
    const resumeJoined = (suppliedResumeText || JSON.stringify(resumeText)).toLowerCase();
    const matchedKeywords = [...new Set(keywordText.match(/[a-z][a-z0-9+#.-]{2,}/g) || [])].filter((keyword) => resumeJoined.includes(keyword)).slice(0, 20);
    const matchPercentage = requirements.length ? Math.round((matchingSkills.length / requirements.length) * 75 + Math.min(25, matchedKeywords.length)) : (matchedKeywords.length ? 65 : 35);

    res.json({ success: true, match: {
      job: { id: job._id.toString(), title: job.title, company: job.company },
      matchPercentage: Math.min(100, matchPercentage),
      matchingSkills,
      missingSkills,
      matchedKeywords,
      missingQualifications: missingSkills.filter((skill) => !resumeText.education?.length || !resumeText.experience?.length).slice(0, 5),
      qualifications: { education: suppliedResumeText ? /education|degree|university|college/i.test(suppliedResumeText) : Boolean(resumeText.education?.length), experience: suppliedResumeText ? /experience|worked|engineer|developer|analyst/i.test(suppliedResumeText) : Boolean(resumeText.experience?.length), projects: suppliedResumeText ? /project|built|created|implemented/i.test(suppliedResumeText) : Boolean(resumeText.projects?.length), contactInformation: suppliedResumeText ? /@|phone|linkedin/i.test(suppliedResumeText) : Boolean(resumeText.email && resumeText.phone) },
      suggestions: missingSkills.slice(0, 6).map((skill) => `Add evidence for ${skill} through a project, achievement, or experience bullet.`),
    } });
  } catch (error) {
    console.error('Resume match failed:', error);
    res.status(400).json({ success: false, message: 'Unable to match this resume to the selected job.' });
  }
});

app.get('/api/profile', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  res.json({ profile: user.profile, name: user.name, email: user.email });
});

app.put('/api/profile', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (req.body.email && normalizeEmail(req.body.email) !== user.email) {
    const existingUser = await User.findOne({ email: normalizeEmail(req.body.email) });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(409).json({ message: 'Another account already uses that email address.' });
    }
    user.email = normalizeEmail(req.body.email);
  }

  user.name = req.body.name || user.name;
  user.profile = { ...user.profile, ...(req.body.profile || {}) };
  user.publicProfile = { ...user.publicProfile, ...(req.body.publicProfile || {}) };
  await user.save();

  res.json({ user: serializeUser(user) });
});

app.get('/api/public/profile/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(404).json({ success: false, message: 'This public profile is unavailable.' });
    const user = await User.findById(req.params.userId).lean();
    if (!user || !user.publicProfile?.enabled) return res.status(404).json({ success: false, message: 'This public profile is unavailable.' });
    const [resume, projects, certifications] = await Promise.all([Resume.findOne({ userId: req.params.userId }).lean(), ToolItem.find({ userId: req.params.userId, kind: { $in: ['projects', 'certifications'] } }).lean(), ToolItem.find({ userId: req.params.userId, kind: 'certifications' }).lean()]);
    res.json({ success: true, profile: { name: user.name, about: user.publicProfile.about ? user.profile?.bio : '', skills: user.publicProfile.skills ? resume?.skills || [] : [], experience: user.publicProfile.experience ? resume?.experience || [] : [], education: user.publicProfile.education ? resume?.education || [] : [], projects: user.publicProfile.projects ? projects.filter((item) => item.kind === 'projects') : [], certifications: user.publicProfile.certifications ? certifications : [] } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load this public profile.' });
  }
});

const CAREER_ROLE_SKILLS = {
  'Full Stack Developer': ['JavaScript', 'React', 'Node.js', 'REST APIs', 'SQL', 'Git'],
  'Frontend Developer': ['JavaScript', 'React', 'HTML', 'CSS', 'Accessibility', 'Git'],
  'Backend Developer': ['Node.js', 'REST APIs', 'SQL', 'MongoDB', 'Testing', 'Git'],
  'Data Analyst': ['SQL', 'Excel', 'Python', 'Statistics', 'Data Visualization'],
  'Data Scientist': ['Python', 'Statistics', 'SQL', 'Machine Learning', 'Data Visualization'],
  'Software Engineer': ['JavaScript', 'Data Structures', 'Algorithms', 'Testing', 'Git'],
};

const CAREER_RESOURCES = [
  { title: 'MDN Web Docs', description: 'Reference material for HTML, CSS, and JavaScript fundamentals.', category: 'Technical', difficulty: 'All levels', link: 'https://developer.mozilla.org/' },
  { title: 'React Documentation', description: 'Official React concepts, APIs, and learning guides.', category: 'Technical', difficulty: 'Intermediate', link: 'https://react.dev/learn' },
  { title: 'SQLBolt', description: 'Interactive SQL lessons and exercises.', category: 'Data', difficulty: 'Beginner', link: 'https://sqlbolt.com/' },
  { title: 'STAR Method Guide', description: 'A practical structure for behavioral interview answers.', category: 'Interview', difficulty: 'All levels', link: 'https://www.themuse.com/advice/star-interview-method' },
];

function listCareerValues(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function buildCareerOverview({ profile, resume, jobs, practices, goals }) {
  const targetRole = profile?.targetRole || '';
  const requiredSkills = CAREER_ROLE_SKILLS[targetRole] || [];
  const resumeSkills = Array.isArray(resume?.skills) ? resume.skills : [];
  const currentSkills = [...new Set([...profile?.technicalSkills || [], ...resumeSkills].map((skill) => String(skill).trim()).filter(Boolean))];
  const normalizedCurrent = new Set(currentSkills.map((skill) => skill.toLowerCase()));
  const skillGaps = requiredSkills.map((skill) => ({
    skill,
    status: normalizedCurrent.has(skill.toLowerCase()) ? 'Known' : 'Recommended',
    importance: requiredSkills.indexOf(skill) < 2 ? 'High' : 'Medium',
    whyItMatters: `This is commonly useful for the selected ${targetRole || 'target'} path based on the local role guide.`,
    practice: `Add a small ${skill} exercise to a project or interview practice session.`,
  }));
  const missingSkills = skillGaps.filter((skill) => skill.status === 'Recommended');
  const roadmap = targetRole ? [
    { phase: 'Phase 1: Foundations', items: requiredSkills.slice(0, 2) },
    { phase: 'Phase 2: Role skills', items: requiredSkills.slice(2, 4) },
    { phase: 'Phase 3: Evidence', items: ['Build a role-relevant project', 'Document the decisions and outcome'] },
    { phase: 'Phase 4: Preparation', items: ['Review the Resume Builder and ATS results', 'Practice role-relevant interview questions'] },
  ].filter((phase) => phase.items.length) : [];
  const completedGoals = goals.filter((goal) => goal.status === 'Completed').length;
  const inProgressGoals = goals.filter((goal) => goal.status === 'In Progress').length;
  const appliedJobs = jobs.filter((job) => job.status === 'Applied');
  const nextSteps = targetRole ? [
    missingSkills[0] ? `Start with ${missingSkills[0].skill}, a relevant gap for ${targetRole}.` : 'Review your role-specific skills and turn one into a portfolio example.',
    practices.length ? 'Continue interview practice and review your latest feedback.' : 'Practice one role-relevant interview question.',
    appliedJobs.length ? 'Review applied jobs and record the next follow-up date.' : 'Add your first target opportunity to Job Tracker.',
  ] : ['Complete your career profile to receive role-specific recommendations.'];
  return {
    profile: profile || {},
    hasProfile: Boolean(targetRole),
    targetRole,
    currentSkills,
    requiredSkills,
    skillGaps,
    roadmap,
    goals,
    resources: CAREER_RESOURCES,
    stats: { completedGoals, inProgressGoals, roadmapCompletion: goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) : 0, practiceSessions: practices.length, savedResources: 0 },
    nextSteps,
    jobGuidance: appliedJobs.length ? `You have ${appliedJobs.length} applied job${appliedJobs.length === 1 ? '' : 's'}. Review follow-up dates and keep status notes current.` : 'Use Job Tracker to record opportunities and make follow-up timing visible.',
  };
}

async function getCareerContext(userId) {
  const [profile, resume, jobs, practices, goals] = await Promise.all([
    CareerProfile.findOne({ userId }).lean(), Resume.findOne({ userId }).lean(), Job.find({ userId }).lean(), InterviewPractice.find({ userId }).lean(), LearningGoal.find({ userId }).sort({ updatedAt: -1 }).lean(),
  ]);
  return buildCareerOverview({ profile, resume, jobs, practices, goals });
}

app.get('/api/career/overview', authMiddleware, async (req, res) => {
  try { res.json({ success: true, data: await getCareerContext(req.user.id) }); } catch (error) { res.status(500).json({ success: false, message: 'Unable to load career guidance.' }); }
});

function roadmapTemplate(targetRole) {
  const skills = CAREER_ROLE_SKILLS[targetRole] || CAREER_ROLE_SKILLS['Software Engineer'];
  return [
    ...skills.slice(0, 3).map((skill, order) => ({ category: 'Skills', title: `Build ${skill}`, description: `Learn and demonstrate ${skill} for a ${targetRole || 'target'} role.`, order })),
    { category: 'Learning', title: 'Complete a structured course', description: 'Finish a practical course covering the role fundamentals.', order: 10 },
    { category: 'Projects', title: 'Build a portfolio project', description: `Create a project that proves your ${skills.slice(0, 2).join(' and ')} skills.`, order: 20 },
    { category: 'Certifications', title: 'Choose a relevant certification', description: 'Compare one industry-recognized certification with your target job requirements.', order: 30 },
    { category: 'Interview', title: 'Complete a mock interview', description: 'Practice technical and behavioral questions and review your feedback.', order: 40 },
    { category: 'Applications', title: 'Prepare a targeted application set', description: 'Match your resume to three target jobs and record follow-up dates.', order: 50 },
  ];
}

app.get('/api/career/roadmap', authMiddleware, async (req, res) => {
  try {
    const profile = await CareerProfile.findOne({ userId: req.user.id }).lean();
    const targetRole = String(req.query.role || profile?.targetRole || 'Software Engineer');
    let items = await RoadmapItem.find({ userId: req.user.id, targetRole }).sort({ order: 1, createdAt: 1 }).lean();
    if (!items.length) {
      const created = await RoadmapItem.insertMany(roadmapTemplate(targetRole).map((item) => ({ ...item, targetRole, userId: req.user.id })));
      items = created.map((item) => item.toObject());
    }
    const progress = items.length ? Math.round(items.reduce((sum, item) => sum + (item.status === 'Completed' ? 100 : item.status === 'In Progress' ? 50 : 0), 0) / items.length) : 0;
    res.json({ success: true, targetRole, progress, items });
  } catch (error) { res.status(500).json({ success: false, message: 'Unable to load career roadmap.' }); }
});

app.patch('/api/career/roadmap/:id', authMiddleware, async (req, res) => {
  const status = String(req.body?.status || '');
  if (!['Not Started', 'In Progress', 'Completed'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid roadmap status.' });
  const item = await RoadmapItem.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { $set: { status } }, { new: true });
  if (!item) return res.status(404).json({ success: false, message: 'Roadmap item not found.' });
  res.json({ success: true, item });
});

app.put('/api/career/profile', authMiddleware, async (req, res) => {
  try {
    const payload = req.body || {};
    const profile = await CareerProfile.findOneAndUpdate({ userId: req.user.id }, { $set: {
      userId: req.user.id, educationLevel: String(payload.educationLevel || '').trim(), currentRole: String(payload.currentRole || '').trim(), targetRole: String(payload.targetRole || '').trim(), experienceLevel: String(payload.experienceLevel || '').trim(), technicalSkills: listCareerValues(payload.technicalSkills), softSkills: listCareerValues(payload.softSkills), industry: String(payload.industry || '').trim(), workLocation: String(payload.workLocation || '').trim(), careerGoal: String(payload.careerGoal || '').trim(), weeklyLearningTime: Math.max(0, Math.min(168, Number(payload.weeklyLearningTime) || 0)), targetTimeline: String(payload.targetTimeline || '').trim(), preferredTechnologies: listCareerValues(payload.preferredTechnologies),
    } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.json({ success: true, profile });
  } catch (error) { res.status(400).json({ success: false, message: 'Career profile could not be saved.' }); }
});

app.post('/api/career/learning-goals', authMiddleware, async (req, res) => {
  const payload = req.body || {};
  if (!String(payload.skill || '').trim()) return res.status(400).json({ success: false, message: 'A learning skill is required.' });
  const goal = await LearningGoal.create({ userId: req.user.id, skill: String(payload.skill).trim(), description: String(payload.description || '').trim(), priority: ['High', 'Medium', 'Low'].includes(payload.priority) ? payload.priority : 'Medium', estimatedEffort: String(payload.estimatedEffort || '').trim(), targetDate: String(payload.targetDate || '').trim(), notes: String(payload.notes || '').trim() });
  res.status(201).json({ success: true, goal });
});

app.put('/api/career/learning-goals/:id', authMiddleware, async (req, res) => {
  const allowed = ['skill', 'description', 'priority', 'estimatedEffort', 'status', 'progress', 'targetDate', 'notes'];
  const changes = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
  if (changes.progress !== undefined) changes.progress = Math.max(0, Math.min(100, Number(changes.progress) || 0));
  if (changes.status === 'Completed') changes.progress = 100;
  const goal = await LearningGoal.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { $set: changes }, { new: true });
  if (!goal) return res.status(404).json({ success: false, message: 'Learning goal not found.' });
  res.json({ success: true, goal });
});

app.delete('/api/career/learning-goals/:id', authMiddleware, async (req, res) => {
  const deleted = await LearningGoal.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (!deleted.deletedCount) return res.status(404).json({ success: false, message: 'Learning goal not found.' });
  res.json({ success: true });
});

app.post('/api/career/assistant', authMiddleware, async (req, res) => {
  try {
    const context = await getCareerContext(req.user.id);
    const question = String(req.body?.question || '').trim();
    if (!question) return res.status(400).json({ success: false, message: 'Please enter a career question.' });
    const answer = context.hasProfile ? `Based on your ${context.targetRole} goal, start with ${context.nextSteps[0]} ${context.nextSteps[1]}` : 'Complete your career profile first. Until then, general guidance is to choose a target role, list your current skills, and select one small learning goal.';
    res.json({ success: true, answer, personalized: context.hasProfile, note: context.hasProfile ? 'This guidance uses your saved career profile and current JobTrack activity.' : 'This is general guidance because your target role is not set.' });
  } catch (error) { res.status(500).json({ success: false, message: 'Career assistant is temporarily unavailable.' }); }
});

app.get('/api/bookmarks', authMiddleware, async (req, res) => {
  const bookmarks = await Bookmark.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json({ bookmarks });
});

app.post('/api/bookmarks', authMiddleware, async (req, res) => {
  const bookmark = await Bookmark.create({ userId: req.user.id, ...req.body });
  res.status(201).json({ bookmark });
});

app.delete('/api/bookmarks/:id', authMiddleware, async (req, res) => {
  const deleted = await Bookmark.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (deleted.deletedCount === 0) {
    return res.status(404).json({ message: 'Bookmark not found.' });
  }

  res.json({ success: true });
});

const TOOL_KINDS = new Set(['cover-letters', 'emails', 'job-alerts', 'notifications', 'career-goals', 'learning-items', 'certifications', 'projects', 'interview-events', 'hidden-recommendations']);

function toolKindOrReject(value) {
  const kind = String(value || '').trim().toLowerCase();
  return TOOL_KINDS.has(kind) ? kind : null;
}

app.get('/api/tools/:kind', authMiddleware, async (req, res) => {
  const kind = toolKindOrReject(req.params.kind);
  if (!kind) return res.status(404).json({ success: false, message: 'Tool collection not found.' });
  const items = await ToolItem.find({ userId: req.user.id, kind }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, items });
});

app.post('/api/tools/:kind', authMiddleware, async (req, res) => {
  const kind = toolKindOrReject(req.params.kind);
  if (!kind) return res.status(404).json({ success: false, message: 'Tool collection not found.' });
  const payload = req.body || {};
  const title = String(payload.title || payload.name || `${kind} item`).trim().slice(0, 180);
  if (!title) return res.status(400).json({ success: false, message: 'A title is required.' });
  const data = { ...payload };
  delete data.userId;
  delete data._id;
  delete data.title;
  const item = await ToolItem.create({ userId: req.user.id, kind, title, data, read: Boolean(payload.read) });
  res.status(201).json({ success: true, item });
});

app.put('/api/tools/:kind/:id', authMiddleware, async (req, res) => {
  const kind = toolKindOrReject(req.params.kind);
  if (!kind) return res.status(404).json({ success: false, message: 'Tool collection not found.' });
  const payload = { ...(req.body || {}) };
  const changes = {};
  if (payload.title !== undefined) changes.title = String(payload.title).trim().slice(0, 180);
  delete payload.userId;
  delete payload._id;
  delete payload.title;
  if (Object.keys(payload).length) changes.data = payload;
  if (req.body?.read !== undefined) changes.read = Boolean(req.body.read);
  const item = await ToolItem.findOneAndUpdate({ _id: req.params.id, userId: req.user.id, kind }, { $set: changes }, { new: true });
  if (!item) return res.status(404).json({ success: false, message: 'Tool item not found.' });
  res.json({ success: true, item });
});

app.delete('/api/tools/:kind/:id', authMiddleware, async (req, res) => {
  const kind = toolKindOrReject(req.params.kind);
  if (!kind) return res.status(404).json({ success: false, message: 'Tool collection not found.' });
  const result = await ToolItem.deleteOne({ _id: req.params.id, userId: req.user.id, kind });
  if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Tool item not found.' });
  res.json({ success: true });
});

app.patch('/api/tools/notifications/read-all', authMiddleware, async (req, res) => {
  await ToolItem.updateMany({ userId: req.user.id, kind: 'notifications' }, { $set: { read: true } });
  res.json({ success: true });
});

app.post('/api/ats/analyze', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    const providedJobDescription = sanitizeText(req.body?.jobDescription || req.body?.description || '');
    const providedResumeText = sanitizeText(req.body?.resumeText || '');

    if (req.file) {
      if (!req.file.buffer || req.file.buffer.length === 0) {
        return res.status(400).json({ success: false, message: 'Uploaded file is empty.' });
      }

      const extension = path.extname(req.file.originalname || '').toLowerCase();
      let extractedText = '';

      const hasPdfSignature = req.file.buffer.subarray(0, 5).toString('ascii') === '%PDF-';
      const hasDocxSignature = req.file.buffer.subarray(0, 2).toString('ascii') === 'PK';
      if ((extension === '.pdf' && !hasPdfSignature) || (extension === '.docx' && !hasDocxSignature)) {
        return res.status(400).json({ success: false, message: 'The uploaded file content does not match its PDF or DOCX extension.' });
      }

      try {
        if (extension === '.pdf') {
          const parsed = await pdfParse(req.file.buffer);
          extractedText = sanitizeText(parsed.text || '');
        } else if (extension === '.docx') {
          const parsed = await mammoth.extractRawText({ buffer: req.file.buffer });
          extractedText = sanitizeText(parsed.value || '');
        } else {
          return res.status(400).json({ success: false, message: 'Only PDF and DOCX files are supported.' });
        }
      } catch (error) {
        console.error('ATS PDF/DOCX extraction failed:', error);
        return res.status(422).json({ success: false, message: 'The uploaded file could not be read. Please upload a valid PDF or DOCX resume.' });
      }

      if (!extractedText) {
        return res.status(422).json({ success: false, message: 'No readable text was found in the uploaded file.' });
      }

      const analysis = buildAnalysisResult({ resumeText: extractedText, jobDescription: providedJobDescription });
      const saved = await AtsAnalysis.create({
        userId: req.user.id,
        filename: req.file.originalname || 'resume.pdf',
        resumeText: extractedText,
        jobDescription: providedJobDescription,
        overallScore: analysis.overallScore,
        categoryScores: analysis.categoryScores,
        matchedKeywords: analysis.matchedKeywords,
        missingKeywords: analysis.missingKeywords,
        detectedSkills: analysis.detectedSkills,
        detectedSections: analysis.detectedSections,
        strengths: analysis.strengths,
        issues: analysis.issues,
        suggestions: analysis.suggestions,
      });

      return res.status(201).json({
        success: true,
        analysis: normalizeAtsDocument(saved),
      });
    }

    if (!providedResumeText) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF or DOCX resume, or paste resume text.' });
    }

    const analysis = buildAnalysisResult({ resumeText: providedResumeText, jobDescription: providedJobDescription });
    const saved = await AtsAnalysis.create({
      userId: req.user.id,
      filename: 'resume-text.txt',
      resumeText: providedResumeText,
      jobDescription: providedJobDescription,
      overallScore: analysis.overallScore,
      categoryScores: analysis.categoryScores,
      matchedKeywords: analysis.matchedKeywords,
      missingKeywords: analysis.missingKeywords,
      detectedSkills: analysis.detectedSkills,
      detectedSections: analysis.detectedSections,
      strengths: analysis.strengths,
      issues: analysis.issues,
      suggestions: analysis.suggestions,
    });

    return res.status(201).json({
      success: true,
      analysis: normalizeAtsDocument(saved),
    });
  } catch (error) {
    console.error('ATS analysis failed:', error);
    return res.status(500).json({ success: false, message: 'ATS analysis failed. Please try again.' });
  }
});

app.get('/api/ats/history', authMiddleware, async (req, res) => {
  try {
    const analyses = await AtsAnalysis.find({ userId: req.user.id }).sort({ createdAt: -1 });
    const history = analyses.map((analysis) => ({
      id: analysis._id.toString(),
      filename: analysis.filename,
      overallScore: analysis.overallScore,
      createdAt: analysis.createdAt,
    }));
    res.json({ success: true, history });
  } catch (error) {
    console.error('ATS history query failed:', error);
    res.status(500).json({ success: false, message: 'Unable to load ATS history.' });
  }
});

app.get('/api/ats/:id', authMiddleware, async (req, res) => {
  try {
    const analysis = await AtsAnalysis.findOne({ _id: req.params.id, userId: req.user.id });
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'ATS analysis not found.' });
    }
    res.json({ success: true, analysis: normalizeAtsDocument(analysis) });
  } catch (error) {
    console.error('ATS single lookup failed:', error);
    res.status(500).json({ success: false, message: 'Unable to load ATS analysis.' });
  }
});

app.delete('/api/ats/:id', authMiddleware, async (req, res) => {
  try {
    const result = await AtsAnalysis.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'ATS analysis not found.' });
    }
    res.json({ success: true, message: 'ATS analysis deleted.' });
  } catch (error) {
    console.error('ATS delete failed:', error);
    res.status(500).json({ success: false, message: 'Unable to delete ATS analysis.' });
  }
});

function evaluateInterviewAnswer(question, answer) {
  const text = String(answer || '').trim();
  const lower = text.toLowerCase();
  const criteria = question.category === 'Technical'
    ? ['concept', 'example', 'tradeoff']
    : question.category === 'Situational'
      ? ['priorit', 'communicat', 'action']
      : ['situation', 'action', 'result'];
  const hits = criteria.filter((term) => lower.includes(term));
  const lengthScore = text.length >= 160 ? 30 : text.length >= 80 ? 20 : text.length >= 30 ? 10 : 0;
  const score = Math.min(100, Math.round((hits.length / criteria.length) * 60 + lengthScore));
  const strengths = [];
  if (text.length >= 80) strengths.push('The answer has enough detail to review.');
  if (hits.length) strengths.push(`It addresses ${hits.length} documented evaluation criterion${hits.length === 1 ? '' : 'a'}.`);
  const improvements = [];
  if (text.length < 80) improvements.push('Add specific context and evidence instead of a one-line response.');
  criteria.filter((term) => !hits.includes(term)).forEach((term) => improvements.push(`Address the ${term} dimension explicitly.`));
  return {
    score,
    criteria,
    strengths,
    areasForImprovement: improvements,
    overallFeedback: 'This is a coaching signal based on answer length and visible criteria, not a definitive measure of interview performance.',
    followUpQuestions: question.tags?.length ? [`How would you apply this in a ${question.tags[0]} context?`] : ['What was the outcome, and what would you do differently?'],
  };
}

app.get('/api/interview', authMiddleware, async (req, res) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const category = String(req.query.category || 'All');
    const difficulty = String(req.query.difficulty || 'All');
    const role = String(req.query.role || 'All');
    const questions = interviewQuestions.filter((question) => {
      const searchable = `${question.question} ${question.category} ${question.subcategory} ${question.role} ${(question.tags || []).join(' ')}`.toLowerCase();
      const questionRoles = question.roles || [question.role];
      return (!search || searchable.includes(search)) && (category === 'All' || question.category === category) && (difficulty === 'All' || question.difficulty === difficulty) && (role === 'All' || questionRoles.some((item) => item.toLowerCase() === role.toLowerCase()));
    });
    const [saved, practices] = await Promise.all([
      InterviewSave.find({ userId: req.user.id }).sort({ savedAt: -1 }).lean(),
      InterviewPractice.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean(),
    ]);
    const savedIds = saved.map((item) => item.questionId);
    const answeredIds = new Set(practices.map((item) => item.questionId));
    const averageScore = practices.length ? Math.round(practices.reduce((sum, item) => sum + item.score, 0) / practices.length) : 0;
    const categoryProgress = Object.fromEntries(['HR', 'Technical', 'Behavioral', 'Situational'].map((name) => {
      const total = interviewQuestions.filter((question) => question.category === name).length;
      const answered = interviewQuestions.filter((question) => question.category === name && answeredIds.has(String(question.id))).length;
      return [name, { total, answered, percentage: total ? Math.round(answered / total * 100) : 0 }];
    }));
    res.json({ success: true, questions: questions.map((question) => ({ ...question, saved: savedIds.includes(String(question.id)), answered: answeredIds.has(String(question.id)) })), stats: { totalQuestions: interviewQuestions.length, answeredQuestions: answeredIds.size, savedQuestions: savedIds.length, practiceSessions: practices.length, averageScore, categoryProgress } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load interview questions.' });
  }
});

app.get('/api/interview/history', authMiddleware, async (req, res) => {
  try {
    const history = await InterviewPractice.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({ success: true, history: history.map((item) => ({ id: item._id.toString(), questionId: item.questionId, score: item.score, createdAt: item.createdAt, category: interviewQuestions.find((question) => String(question.id) === item.questionId)?.category || 'Interview', strengths: item.feedback?.strengths || [], improvements: item.feedback?.areasForImprovement || [] })) });
  } catch (error) { res.status(500).json({ success: false, message: 'Unable to load practice history.' }); }
});

app.get('/api/interview/mock', authMiddleware, async (req, res) => {
  try {
    const category = String(req.query.category || 'Technical').trim();
    const difficulty = String(req.query.difficulty || 'Medium').trim();
    const role = String(req.query.role || 'All').trim();
    const matchesRole = (question) => role === 'All' || (question.roles || [question.role]).some((item) => item.toLowerCase() === role.toLowerCase());
    const byCategory = interviewQuestions.filter((question) => question.category === category);
    const exact = byCategory.filter((question) => question.difficulty === difficulty && matchesRole(question));
    const difficultyMatches = byCategory.filter((question) => question.difficulty === difficulty);
    const roleMatches = byCategory.filter((question) => matchesRole(question));
    const selection = exact.length ? exact : difficultyMatches.length ? difficultyMatches : roleMatches.length ? roleMatches : byCategory;
    const fallbackMessage = exact.length ? '' : difficultyMatches.length
      ? `No exact questions found for ${category} + ${difficulty} + ${role}. Showing ${category} questions at the selected difficulty; the target role filter was relaxed.`
      : roleMatches.length
        ? `No exact questions found for ${category} + ${difficulty} + ${role}. Showing ${category} questions relevant to the target role; difficulty was relaxed.`
        : byCategory.length
          ? `No exact questions found for ${category} + ${difficulty} + ${role}. Showing related ${category} questions; difficulty and role were relaxed.`
          : 'No questions are available for this interview type yet. Try another category.';
    const [saved, practices] = await Promise.all([InterviewSave.find({ userId: req.user.id }).lean(), InterviewPractice.find({ userId: req.user.id }).lean()]);
    const savedIds = new Set(saved.map((item) => item.questionId));
    const answeredIds = new Set(practices.map((item) => item.questionId));
    res.json({ success: true, fallbackMessage, questions: selection.map((question) => ({ ...question, saved: savedIds.has(String(question.id)), answered: answeredIds.has(String(question.id)) })) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to build this mock interview.' });
  }
});

app.get('/api/interview/saved', authMiddleware, async (req, res) => {
  const saved = await InterviewSave.find({ userId: req.user.id }).sort({ savedAt: -1 }).lean();
  res.json({ success: true, questions: saved.map((item) => interviewQuestions.find((question) => String(question.id) === item.questionId)).filter(Boolean).map((question) => ({ ...question, saved: true })) });
});

app.post('/api/interview/saved', authMiddleware, async (req, res) => {
  const questionId = String(req.body?.questionId || '');
  if (!interviewQuestions.some((question) => String(question.id) === questionId)) return res.status(404).json({ success: false, message: 'Interview question not found.' });
  await InterviewSave.updateOne({ userId: req.user.id, questionId }, { $setOnInsert: { userId: req.user.id, questionId } }, { upsert: true });
  res.status(201).json({ success: true, saved: true });
});

app.delete('/api/interview/saved/:questionId', authMiddleware, async (req, res) => {
  await InterviewSave.deleteOne({ userId: req.user.id, questionId: String(req.params.questionId) });
  res.json({ success: true, saved: false });
});

app.post('/api/interview/practice', authMiddleware, async (req, res) => {
  const question = interviewQuestions.find((item) => String(item.id) === String(req.body?.questionId));
  const answer = String(req.body?.answer || '').trim();
  if (!question) return res.status(404).json({ success: false, message: 'Interview question not found.' });
  if (!answer) return res.status(400).json({ success: false, message: 'Please submit an answer before requesting feedback.' });
  const feedback = evaluateInterviewAnswer(question, answer);
  const saved = await InterviewPractice.create({ userId: req.user.id, questionId: String(question.id), answer, score: feedback.score, feedback });
  res.status(201).json({ success: true, practice: { id: saved._id.toString(), ...feedback } });
});

app.get('/api/aptitude', authMiddleware, (req, res) => {
  res.json({ questions: aptitudeQuestions });
});

app.get('/api/technical', authMiddleware, (req, res) => {
  res.json({ topics: technicalTopics });
});

const distPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    res.json({ message: 'JobTrack API is running. Build the client to serve the frontend.', status: 'demo-mode' });
  });
}

async function migrateLegacyResumeRecords() {
  const resumes = await Resume.find({});
  for (const resume of resumes) {
    const normalized = normalizeLegacyResumePayload(resume.toObject());
    const isLegacy = JSON.stringify(resume.toObject()) !== JSON.stringify(normalized);
    if (isLegacy) {
      await Resume.updateOne({ _id: resume._id }, { $set: { ...normalized, updatedAt: new Date() } });
      console.log('Migrated legacy resume document for user:', resume.userId);
    }
  }
}

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });
    console.log('MongoDB connected successfully.');
    await seedDemoData();
    await migrateLegacyResumeRecords();
    app.listen(PORT, () => {
      console.log(`JobTrack API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.error('Startup aborted because MongoDB is required for JobTrack persistence.');
    process.exit(1);
  }
}

startServer();
