require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const multer = require("multer");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");
const OpenAI = require("openai");

const db = require("./database");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
        const extension = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(file.mimetype) || [".pdf", ".docx"].includes(extension)) {
            callback(null, true);
        } else {
            callback(new Error("Only PDF and DOCX files are supported."));
        }
    }
});

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || "jobtrack_secret_key_123";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const openaiClient = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

const verificationSendTimes = new Map();
const VERIFICATION_COOLDOWN_MS = 60 * 1000;

function generateVerificationCode() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hasUsableEmailConfig() {
    const user = String(process.env.EMAIL_USER || "").trim();
    const pass = String(process.env.EMAIL_PASS || "").trim();
    const from = String(process.env.EMAIL_FROM || user).trim();
    const placeholder = /^(YOUR_|CHANGE_ME|your_|change_me|example@)/i;
    return Boolean(user && pass && from && !placeholder.test(user) && !placeholder.test(pass) && !placeholder.test(from));
}

function getVerificationCooldown(email) {
    const lastSentAt = verificationSendTimes.get(String(email).toLowerCase());
    if (!lastSentAt) return 0;
    return Math.max(0, VERIFICATION_COOLDOWN_MS - (Date.now() - lastSentAt));
}

function markVerificationSent(email) {
    verificationSendTimes.set(String(email).toLowerCase(), Date.now());
}

function getEmailTransporter() {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: Number(process.env.EMAIL_PORT || 587),
        secure: String(process.env.EMAIL_SECURE || "false") === "true",
        auth: {
            user: emailUser,
            pass: emailPass
        }
    });
}

async function sendVerificationEmail(email, code) {
    if (!hasUsableEmailConfig()) {
        const error = new Error("Email provider is not configured.");
        error.code = "EMAIL_NOT_CONFIGURED";
        throw error;
    }

    const transporter = getEmailTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@jobtrack.local";

    await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: "Your JobTrack verification code",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
                <h2 style="margin-bottom: 12px;">JobTrack email verification</h2>
                <p>Your verification code is:</p>
                <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1d4ed8; margin: 16px 0;">${code}</p>
                <p>This code expires in 10 minutes.</p>
            </div>
        `
    });

    return {
        sent: true,
        message: "Verification email sent."
    };
}

function sendVerificationFailure(res, error) {
    console.error("Verification email delivery failed:", error?.message || error);
    return res.status(error?.code === "EMAIL_NOT_CONFIGURED" ? 503 : 502).json({
        success: false,
        code: error?.code === "EMAIL_NOT_CONFIGURED" ? "EMAIL_NOT_CONFIGURED" : "EMAIL_DELIVERY_FAILED",
        message: "Unable to send verification email. Please try again later."
    });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function servePage(pageFile) {
    return (req, res) => {
        res.sendFile(path.join(__dirname, pageFile));
    };
}

// =====================================================
// ROUTE ALIASES
// =====================================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/login", servePage("login.html"));
app.get("/signup", servePage("signup.html"));
app.get("/dashboard", servePage("dashboard.html"));
app.get("/job-tracker", servePage("job-tracker.html"));
app.get("/resume-ai", servePage("resume-ai.html"));
app.get("/career-resources", servePage("career-resources.html"));
app.get("/interview-prep", servePage("interview-prep.html"));
app.get("/profile", servePage("profile.html"));
app.get("/settings", servePage("settings.html"));

// =====================================================
// TEST API
// =====================================================

app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        message: "JobTrack backend is running",
        status: "ok",
        service: "JobTrack Backend",
        timestamp: new Date().toISOString()
    });

});


app.get("/", (req, res) => {

    res.sendFile(path.join(__dirname, "index.html"));

});


// =====================================================
// REGISTER
// =====================================================

app.post("/api/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;

        // Check fields
        if (!name || !email || !password) {

            return res.status(400).json({
                message: "All fields are required."
            });

        }

        // Check password length
        if (password.length < 6) {

            return res.status(400).json({
                message: "Password must contain at least 6 characters."
            });

        }

        db.get(
            "SELECT * FROM users WHERE email = ?",
            [email],
            async (err, user) => {

                if (err) {

                    return res.status(500).json({
                        message: "Database error."
                    });

                }

                if (user) {
                    if (user.email_verified === 1) {
                        return res.status(409).json({
                            code: "EMAIL_EXISTS",
                            message: "This email is already registered. Please log in."
                        });
                    }

                    const cooldown = getVerificationCooldown(email);
                    if (cooldown > 0) {
                        return res.status(429).json({
                            code: "VERIFICATION_RATE_LIMIT",
                            retryAfterSeconds: Math.ceil(cooldown / 1000),
                            message: "Too many verification attempts. Please wait and try again."
                        });
                    }

                    const verificationCode = generateVerificationCode();
                    const verificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
                    const hashedPassword = await bcrypt.hash(password, 10);

                    db.run(
                        `
                        UPDATE users
                        SET name = ?, password = ?, verification_code = ?, verification_expires_at = ?, email_verified = 0
                        WHERE email = ?
                        `,
                        [name, hashedPassword, verificationCode, verificationExpiresAt, email],
                        async function (updateErr) {
                            if (updateErr) {
                                return res.status(500).json({
                                    message: "Registration failed."
                                });
                            }

                            try {
                                await sendVerificationEmail(email, verificationCode);
                                markVerificationSent(email);

                                return res.status(201).json({
                                    message: "Verification code sent to your email.",
                                    email: email
                                });
                            } catch (emailError) {
                                return sendVerificationFailure(res, emailError);
                            }
                        }
                    );

                    return;
                }

                const hashedPassword = await bcrypt.hash(password, 10);
                const verificationCode = generateVerificationCode();
                const verificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

                db.run(
                    `
                    INSERT INTO users
                    (name, email, password, email_verified, verification_code, verification_expires_at)
                    VALUES (?, ?, ?, 0, ?, ?)
                    `,
                    [
                        name,
                        email,
                        hashedPassword,
                        verificationCode,
                        verificationExpiresAt
                    ],
                    async function (insertErr) {
                        if (insertErr) {
                            return res.status(500).json({
                                message: "Registration failed."
                            });
                        }

                        try {
                            await sendVerificationEmail(email, verificationCode);
                            markVerificationSent(email);

                            return res.status(201).json({
                                message: "Verification code sent to your email.",
                                email: email
                            });
                        } catch (emailError) {
                            return sendVerificationFailure(res, emailError);
                        }
                    }
                );

            }
        );

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error."
        });

    }

});

app.post("/api/resend-verification", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ code: "INVALID_EMAIL", message: "Please enter a valid email address." });
    }

    const cooldown = getVerificationCooldown(email);
    if (cooldown > 0) {
        return res.status(429).json({
            code: "VERIFICATION_RATE_LIMIT",
            retryAfterSeconds: Math.ceil(cooldown / 1000),
            message: "Too many verification attempts. Please wait and try again."
        });
    }

    db.get("SELECT id, email_verified FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) return res.status(500).json({ code: "DATABASE_ERROR", message: "Unable to resend verification email." });
        if (!user) return res.status(404).json({ code: "ACCOUNT_NOT_FOUND", message: "No signup attempt was found for this email." });
        if (user.email_verified === 1) return res.status(409).json({ code: "EMAIL_VERIFIED", message: "This email is already verified. Please log in." });

        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        db.run("UPDATE users SET verification_code = ?, verification_expires_at = ? WHERE id = ?", [code, expiresAt, user.id], async (updateErr) => {
            if (updateErr) return res.status(500).json({ code: "DATABASE_ERROR", message: "Unable to resend verification email." });
            try {
                await sendVerificationEmail(email, code);
                markVerificationSent(email);
                return res.json({ success: true, email, message: "Verification email sent." });
            } catch (emailError) {
                return sendVerificationFailure(res, emailError);
            }
        });
    });
});

app.post("/api/verify-email", (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({
            message: "Email and verification code are required."
        });
    }

    db.get(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, user) => {
            if (err) {
                return res.status(500).json({
                    message: "Database error."
                });
            }

            if (!user) {
                return res.status(404).json({
                    message: "User not found."
                });
            }

            if (user.email_verified === 1) {
                return res.status(200).json({
                    message: "Email already verified."
                });
            }

            const expiresAt = new Date(user.verification_expires_at);
            const now = new Date();

            if (!user.verification_code || expiresAt < now) {
                return res.status(400).json({
                    message: "Verification code expired. Please register again."
                });
            }

            if (String(user.verification_code) !== String(code)) {
                return res.status(400).json({
                    message: "Invalid verification code."
                });
            }

            db.run(
                `
                UPDATE users
                SET email_verified = 1, verification_code = NULL, verification_expires_at = NULL
                WHERE id = ?
                `,
                [user.id],
                function (updateErr) {
                    if (updateErr) {
                        return res.status(500).json({
                            message: "Verification failed."
                        });
                    }

                    return res.json({
                        message: "Email verified successfully."
                    });
                }
            );
        }
    );
});


// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", (req, res) => {

    const {
        email,
        password
    } = req.body;

    if (!email || !password) {

        return res.status(400).json({
            message: "Email and password are required."
        });

    }

    db.get(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, user) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            if (!user) {

                return res.status(401).json({
                    message: "Invalid email or password."
                });

            }

            if (user.email_verified !== 1) {
                return res.status(403).json({
                    message: "Please verify your email before logging in."
                });
            }

            // Compare password
            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!passwordMatch) {

                return res.status(401).json({
                    message: "Invalid email or password."
                });

            }

            // Create token
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email
                },
                JWT_SECRET,
                {
                    expiresIn: "1d"
                }
            );

            res.json({

                message: "Login successful.",

                token: token,

                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }

            });

        }
    );

});


// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

function authenticateToken(req, res, next) {

    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Login required."
        });
    }

    const token = authHeader.substring(7).trim();

    if (!token || token === "undefined" || token === "null") {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }

    jwt.verify(
        token,
        JWT_SECRET,
        (err, user) => {

            if (err) {

                return res.status(401).json({
                    success: false,
                    message: "Invalid or expired token."
                });

            }

            req.user = user;

            next();

        }
    );

}


// =====================================================
// PROFILE
// =====================================================

app.get("/api/profile", authenticateToken, (req, res) => {
    db.get(
        "SELECT * FROM profiles WHERE user_id = ?",
        [req.user.id],
        (err, profile) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Failed to load profile." });
            }

            const baseUser = { id: req.user.id, email: req.user.email };
            const profileData = profile ? { ...profile, user: baseUser } : { user: baseUser };
            res.json({ success: true, profile: profileData });
        }
    );
});

app.put("/api/profile", authenticateToken, (req, res) => {
    const payload = req.body || {};
    const data = {
        full_name: payload.fullName || "",
        email: payload.email || req.user.email,
        phone: payload.phone || "",
        location: payload.location || "",
        linkedin: payload.linkedin || "",
        github: payload.github || "",
        portfolio: payload.portfolio || "",
        current_role: payload.currentRole || "",
        target_role: payload.targetRole || "",
        experience: payload.experience || "",
        preferred_location: payload.preferredLocation || "",
        work_mode: payload.workMode || "",
        skills: payload.skills || "",
        education: payload.education || ""
    };

    db.get("SELECT id FROM profiles WHERE user_id = ?", [req.user.id], (err, existing) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Unable to save profile." });
        }

        const insertValues = [
            data.full_name,
            data.email,
            data.phone,
            data.location,
            data.linkedin,
            data.github,
            data.portfolio,
            data.current_role,
            data.target_role,
            data.experience,
            data.preferred_location,
            data.work_mode,
            data.skills,
            data.education,
            req.user.id,
            new Date().toISOString()
        ];

        if (existing) {
            const updateValues = [
                data.full_name,
                data.email,
                data.phone,
                data.location,
                data.linkedin,
                data.github,
                data.portfolio,
                data.current_role,
                data.target_role,
                data.experience,
                data.preferred_location,
                data.work_mode,
                data.skills,
                data.education,
                new Date().toISOString(),
                req.user.id
            ];

            db.run(
                `UPDATE profiles SET full_name = ?, email = ?, phone = ?, location = ?, linkedin = ?, github = ?, portfolio = ?, current_role = ?, target_role = ?, experience = ?, preferred_location = ?, work_mode = ?, skills = ?, education = ?, updated_at = ? WHERE user_id = ?`,
                updateValues,
                function (updateErr) {
                    if (updateErr) {
                        return res.status(500).json({ success: false, message: "Profile update failed." });
                    }
                    db.run("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'info')", [req.user.id, "Profile updated", "Your profile details were successfully saved.",], () => {});
                    res.json({ success: true, message: "Profile saved." });
                }
            );
            return;
        }

        db.run(
            `INSERT INTO profiles (full_name, email, phone, location, linkedin, github, portfolio, current_role, target_role, experience, preferred_location, work_mode, skills, education, user_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            insertValues,
            function (insertErr) {
                if (insertErr) {
                    return res.status(500).json({ success: false, message: "Profile creation failed." });
                }
                db.run("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'info')", [req.user.id, "Profile created", "Your profile was created and is ready to use.",], () => {});
                res.json({ success: true, message: "Profile saved." });
            }
        );
    });
});

app.get("/api/profile/completion", authenticateToken, (req, res) => {
    db.get("SELECT * FROM profiles WHERE user_id = ?", [req.user.id], (err, profile) => {
        if (err) return res.status(500).json({ success: false, message: "Unable to calculate profile completion." });
        const fields = [
            profile?.full_name,
            profile?.email,
            profile?.phone,
            profile?.location,
            profile?.linkedin,
            profile?.github,
            profile?.portfolio,
            profile?.current_role,
            profile?.target_role,
            profile?.experience,
            profile?.preferred_location,
            profile?.work_mode,
            profile?.skills,
            profile?.education
        ];
        const completed = fields.filter((value) => String(value || "").trim()).length;
        const percent = Math.round((completed / fields.length) * 100);
        res.json({ success: true, completion: percent, completed, total: fields.length });
    });
});

// =====================================================
// DASHBOARD / NOTIFICATIONS / RESOURCES
// =====================================================

app.get("/api/dashboard", authenticateToken, async (req, res) => {
    db.get(`
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'Saved' THEN 1 ELSE 0 END) AS saved,
            SUM(CASE WHEN status = 'Applied' THEN 1 ELSE 0 END) AS applied,
            SUM(CASE WHEN status = 'Assessment' THEN 1 ELSE 0 END) AS assessment,
            SUM(CASE WHEN status = 'Interview' THEN 1 ELSE 0 END) AS interview,
            SUM(CASE WHEN status = 'Offer' THEN 1 ELSE 0 END) AS offer,
            SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
            SUM(CASE WHEN status = 'Withdrawn' THEN 1 ELSE 0 END) AS withdrawn
        FROM jobs WHERE user_id = ?
    `, [req.user.id], (statsErr, stats) => {
        if (statsErr) return res.status(500).json({ success: false, message: "Failed to load dashboard." });

        db.all(`SELECT * FROM jobs WHERE user_id = ? ORDER BY id DESC LIMIT 5`, [req.user.id], (jobsErr, recentJobs) => {
            if (jobsErr) return res.status(500).json({ success: false, message: "Failed to load jobs." });

            db.all(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`, [req.user.id], (notifErr, notifications) => {
                if (notifErr) return res.status(500).json({ success: false, message: "Failed to load notifications." });

                db.get("SELECT * FROM profiles WHERE user_id = ?", [req.user.id], (profileErr, profile) => {
                    if (profileErr) return res.status(500).json({ success: false, message: "Failed to load profile statistics." });
                    const fields = [
                        profile?.full_name, profile?.email, profile?.phone, profile?.location, profile?.linkedin, profile?.github,
                        profile?.portfolio, profile?.current_role, profile?.target_role, profile?.experience, profile?.preferred_location,
                        profile?.work_mode, profile?.skills, profile?.education
                    ];
                    const completion = Math.round((fields.filter((value) => String(value || "").trim()).length / fields.length) * 100);
                    db.get("SELECT COUNT(*) AS count FROM resumes WHERE user_id = ?", [req.user.id], (resumeErr, resumeCount) => {
                        if (resumeErr) return res.status(500).json({ success: false, message: "Failed to load resume statistics." });
                        res.json({
                        success: true,
                        stats: stats || { total: 0, saved: 0, applied: 0, assessment: 0, interview: 0, offer: 0, rejected: 0, withdrawn: 0 },
                        recentJobs: recentJobs || [],
                        notifications: notifications || [],
                        profileCompletion: completion,
                        resumeStatus: Number(resumeCount?.count || 0) > 0 ? "Resume saved" : "No resume yet",
                        upcomingDeadlines: (recentJobs || []).filter((job) => job.deadline).slice(0, 5)
                        });
                    });
                });
            });
        });
    });
});

app.get("/api/notifications", authenticateToken, (req, res) => {
    db.all(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to load notifications." });
        res.json({ success: true, notifications: rows || [] });
    });
});

app.put("/api/notifications/:id/read", authenticateToken, (req, res) => {
    db.run("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ success: false, message: "Failed to update notification." });
        if (!this.changes) return res.status(404).json({ success: false, message: "Notification not found." });
        res.json({ success: true, message: "Notification marked read." });
    });
});

app.put("/api/notifications/read-all", authenticateToken, (req, res) => {
    db.run("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user.id], function (err) {
        if (err) return res.status(500).json({ success: false, message: "Failed to mark notifications as read." });
        res.json({ success: true, message: "Notifications updated." });
    });
});

app.get("/api/resources", authenticateToken, (req, res) => {
    const { q = "", category = "All" } = req.query || {};
    db.all(`SELECT r.*, EXISTS (SELECT 1 FROM bookmarks b WHERE b.user_id = ? AND b.resource_id = r.id) AS bookmarked FROM career_resources r WHERE (? = '' OR r.title LIKE ? OR r.summary LIKE ? OR r.content LIKE ?) AND (? = 'All' OR r.category = ?) ORDER BY r.id DESC`, [
        req.user.id,
        String(q || ""),
        `%${String(q || "").trim()}%`,
        `%${String(q || "").trim()}%`,
        `%${String(q || "").trim()}%`,
        String(category || "All"),
        String(category || "All")
    ], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to load resources." });
        res.json({ success: true, resources: rows || [] });
    });
});

app.put("/api/resources/:id/bookmark", authenticateToken, (req, res) => {
    const { bookmarked } = req.body || {};
    if (bookmarked) {
        db.run("INSERT OR IGNORE INTO bookmarks (user_id, resource_id) VALUES (?, ?)", [req.user.id, req.params.id], function (err) {
            if (err) return res.status(500).json({ success: false, message: "Bookmark failed." });
            return res.json({ success: true, bookmarked: true });
        });
        return;
    }

    db.run("DELETE FROM bookmarks WHERE user_id = ? AND resource_id = ?", [req.user.id, req.params.id], function (err) {
        if (err) return res.status(500).json({ success: false, message: "Remove bookmark failed." });
        res.json({ success: true, bookmarked: false });
    });
});

// =====================================================
// GET ALL JOBS
// =====================================================

app.get(
    "/api/jobs",
    authenticateToken,
    (req, res) => {

        db.all(
            `
            SELECT *
            FROM jobs
            WHERE user_id = ?
            ORDER BY id DESC
            `,
            [req.user.id],
            (err, jobs) => {

                if (err) {

                    return res.status(500).json({
                        message: "Failed to fetch jobs."
                    });

                }

                res.json(jobs);

            }
        );

    }
);


// =====================================================
// ADD JOB
// =====================================================

app.post(
    "/api/jobs",
    authenticateToken,
    (req, res) => {

        const {
            company,
            role,
            location,
            status,
            job_link,
            notes,
            application_date,
            job_type,
            salary,
            deadline,
            contact_person,
            contact_email
        } = req.body;

        if (!company || !role) {

            return res.status(400).json({
                message: "Company and role are required."
            });

        }

        db.run(
            `
            INSERT INTO jobs
            (
                user_id,
                company,
                role,
                location,
                job_type,
                salary,
                date_applied,
                deadline,
                status,
                job_link,
                notes,
                contact_person,
                contact_email
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                req.user.id,
                company,
                role,
                location || "",
                job_type || "",
                salary || "",
                application_date || "",
                deadline || "",
                status || "Applied",
                job_link || "",
                notes || "",
                contact_person || "",
                contact_email || ""
            ],
            function (err) {

                if (err) {

                    return res.status(500).json({
                        message: "Failed to add job."
                    });

                }

                db.run("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'job')", [req.user.id, "Job added", `${company} (${role}) was added to your tracker.`,], () => {});

                res.status(201).json({

                    message: "Job added successfully.",

                    job: {
                        id: this.lastID,
                        company,
                        role,
                        location: location || "",
                        job_type: job_type || "",
                        salary: salary || "",
                        date_applied: application_date || "",
                        deadline: deadline || "",
                        status: status || "Applied",
                        job_link: job_link || "",
                        notes: notes || "",
                        contact_person: contact_person || "",
                        contact_email: contact_email || ""
                    }

                });

            }
        );

    }
);


// =====================================================
// UPDATE JOB
// =====================================================

app.put(
    "/api/jobs/:id",
    authenticateToken,
    (req, res) => {

        const jobId = req.params.id;

        const {
            company,
            role,
            location,
            status,
            job_link,
            notes,
            application_date,
            job_type,
            salary,
            deadline,
            contact_person,
            contact_email
        } = req.body;

        db.run(
            `
            UPDATE jobs
            SET
                company = ?,
                role = ?,
                location = ?,
                job_type = ?,
                salary = ?,
                date_applied = ?,
                deadline = ?,
                status = ?,
                job_link = ?,
                notes = ?,
                contact_person = ?,
                contact_email = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE
                id = ?
                AND user_id = ?
            `,
            [
                company,
                role,
                location || "",
                job_type || "",
                salary || "",
                application_date || "",
                deadline || "",
                status,
                job_link || "",
                notes || "",
                contact_person || "",
                contact_email || "",
                jobId,
                req.user.id
            ],
            function (err) {

                if (err) {

                    return res.status(500).json({
                        message: "Failed to update job."
                    });

                }

                if (this.changes === 0) {

                    return res.status(404).json({
                        message: "Job not found."
                    });

                }

                db.run("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'status')", [req.user.id, "Application updated", `${company || role} has been updated to ${status || "Applied"}.`,], () => {});
                res.json({
                    message: "Job updated successfully."
                });

            }
        );

    }
);


// =====================================================
// DELETE JOB
// =====================================================

app.delete(
    "/api/jobs/:id",
    authenticateToken,
    (req, res) => {

        const jobId = req.params.id;

        db.run(
            `
            DELETE FROM jobs
            WHERE
                id = ?
                AND user_id = ?
            `,
            [
                jobId,
                req.user.id
            ],
            function (err) {

                if (err) {

                    return res.status(500).json({
                        message: "Failed to delete job."
                    });

                }

                if (this.changes === 0) {

                    return res.status(404).json({
                        message: "Job not found."
                    });

                }

                res.json({
                    message: "Job deleted successfully."
                });

            }
        );

    }
);


// =====================================================
// JOB STATISTICS
// =====================================================

app.get(
    "/api/jobs/stats",
    authenticateToken,
    (req, res) => {

        const query = `
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'Saved'
                    THEN 1 ELSE 0 END) AS saved,

                SUM(CASE WHEN status = 'Applied'
                    THEN 1 ELSE 0 END) AS applied,

                SUM(CASE WHEN status = 'Assessment'
                    THEN 1 ELSE 0 END) AS assessment,

                SUM(CASE WHEN status = 'Interview'
                    THEN 1 ELSE 0 END) AS interview,

                SUM(CASE WHEN status = 'Offer'
                    THEN 1 ELSE 0 END) AS offer
            FROM jobs
            WHERE user_id = ?
        `;

        db.get(
            query,
            [req.user.id],
            (err, stats) => {

                if (err) {

                    return res.status(500).json({
                        message: "Failed to get statistics."
                    });

                }

                res.json(stats);

            }
        );

    }
);


// =====================================================
// START SERVER
// =====================================================

const STOP_WORDS = new Set("a an and are as at be by for from has have in into is it its of on or that the their this to with you your our we will can should required requirements using use years year role work working experience skills skill team plus looking seek seeking join ideal candidate candidates ability strong preferred required responsibilities description position someone".split(/\s+/));

const ATS_WEIGHTS = {
    keywordMatch: 0.30,
    skillsMatch: 0.20,
    structure: 0.15,
    experienceQuality: 0.15,
    contactInformation: 0.10,
    educationAndCertifications: 0.10
};

const SKILL_LIBRARY = [
    { name: "JavaScript", category: "Programming", aliases: ["javascript", "js", "ecmascript"] },
    { name: "TypeScript", category: "Programming", aliases: ["typescript", "ts"] },
    { name: "Python", category: "Programming", aliases: ["python"] },
    { name: "Java", category: "Programming", aliases: ["java"] },
    { name: "C++", category: "Programming", aliases: ["c++", "cpp"] },
    { name: "C#", category: "Programming", aliases: ["c#", "csharp"] },
    { name: "React", category: "Frontend", aliases: ["react", "react.js", "reactjs"] },
    { name: "HTML", category: "Frontend", aliases: ["html", "html5"] },
    { name: "CSS", category: "Frontend", aliases: ["css", "css3"] },
    { name: "Tailwind CSS", category: "Frontend", aliases: ["tailwind", "tailwind css"] },
    { name: "Node.js", category: "Backend", aliases: ["node", "node.js", "nodejs"] },
    { name: "Express", category: "Backend", aliases: ["express", "express.js", "expressjs"] },
    { name: "FastAPI", category: "Backend", aliases: ["fastapi"] },
    { name: "REST API", category: "Backend", aliases: ["rest", "rest api", "restful"] },
    { name: "MongoDB", category: "Databases", aliases: ["mongodb", "mongo"] },
    { name: "MySQL", category: "Databases", aliases: ["mysql"] },
    { name: "PostgreSQL", category: "Databases", aliases: ["postgresql", "postgres"] },
    { name: "SQL", category: "Databases", aliases: ["sql"] },
    { name: "AWS", category: "Cloud and DevOps", aliases: ["aws", "amazon web services"] },
    { name: "Docker", category: "Cloud and DevOps", aliases: ["docker"] },
    { name: "Git", category: "Cloud and DevOps", aliases: ["git", "github", "gitlab"] },
    { name: "Kubernetes", category: "Cloud and DevOps", aliases: ["kubernetes", "k8s"] },
    { name: "Figma", category: "Design", aliases: ["figma"] },
    { name: "Agile", category: "Methods", aliases: ["agile", "scrum"] }
];

function getResumeText(data) {
    if (!data || typeof data !== "object") return "";
    const values = [];
    const add = (value) => {
        if (typeof value === "string") values.push(value);
        if (Array.isArray(value)) value.forEach(add);
        if (value && typeof value === "object" && !Array.isArray(value)) Object.values(value).forEach(add);
    };
    add(data);
    return values.join(" ").replace(/\s+/g, " ").trim();
}

function getKeywords(text) {
    return [...new Set((text || "").toLowerCase().match(/[a-z][a-z0-9+#.-]{1,}/g) || [])]
        .filter((word) => !STOP_WORDS.has(word) && !/^\d+$/.test(word));
}

function containsAlias(text, alias) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9+#])${escaped}(?=$|[^a-z0-9+#])`, "i").test(text);
}

function detectSkills(text) {
    return SKILL_LIBRARY.filter((skill) => skill.aliases.some((alias) => containsAlias(text, alias)))
        .map(({ name, category }) => ({ name, category }));
}

function analyzeText(resumeText, jobDescription) {
    const resume = String(resumeText || "").replace(/\r/g, "").trim();
    const job = String(jobDescription || "").replace(/\r/g, "").trim();
    const resumeLower = resume.toLowerCase();
    const jobLower = job.toLowerCase();
    const hasJobDescription = Boolean(job);
    const detectedSkills = detectSkills(resume);
    const jobSkills = SKILL_LIBRARY.filter((skill) => skill.aliases.some((alias) => containsAlias(job, alias)));
    const matchedSkills = jobSkills.filter((skill) => skill.aliases.some((alias) => containsAlias(resume, alias)));
    const missingSkills = jobSkills.filter((skill) => !matchedSkills.includes(skill));
    const resumeWords = new Set(getKeywords(resume));
    const jobKeywords = hasJobDescription ? getKeywords(job).filter((word) => word.length > 2) : [];
    const matchedKeywords = jobKeywords.filter((word) => resumeWords.has(word));
    const missingKeywords = jobKeywords.filter((word) => !resumeWords.has(word)).slice(0, 20);
    const sectionPatterns = [
        ["Professional Summary", /\b(summary|professional summary|profile|objective)\b/i],
        ["Experience", /\b(experience|work experience|employment history|professional experience)\b/i],
        ["Education", /\b(education|academic background|qualifications)\b/i],
        ["Skills", /\b(skills|technical skills|core competencies|technologies)\b/i],
        ["Projects", /\b(projects| selected projects|personal projects)\b/i],
        ["Certifications", /\b(certifications|certificates|licenses)\b/i],
        ["Achievements", /\b(achievements|awards|honors)\b/i],
        ["Languages", /\b(languages|spoken languages)\b/i]
    ];
    const detectedSections = sectionPatterns.filter(([, pattern]) => pattern.test(resume)).map(([name]) => name);
    const contactChecks = {
        name: /^[A-Za-z][A-Za-z .'-]{2,}$/.test(resume.split("\n").find((line) => line.trim()) || ""),
        email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(resume),
        phone: /(?:\+?\d[\d ()-]{7,}\d)/.test(resume),
        link: /(?:linkedin\.com|github\.com|https?:\/\/)/i.test(resume)
    };
    const sectionsScore = Math.round((detectedSections.length / 4) * 100);
    const contactScore = Math.round(Object.values(contactChecks).filter(Boolean).length / 4 * 100);
    const educationScore = /\b(education|degree|bachelor|master|university|college|certification)\b/i.test(resume) ? 100 : 45;
    const bullets = resume.split("\n").filter((line) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(line));
    const actionVerbCount = (resume.match(/\b(built|created|developed|led|managed|designed|implemented|improved|increased|reduced|launched|automated|delivered|optimized|analyzed|coordinated)\b/gi) || []).length;
    const measurableCount = (resume.match(/\b\d+(?:%|\+|x|k)?\b|\$\d+/gi) || []).length;
    const experienceScore = bullets.length ? Math.min(100, 45 + actionVerbCount * 8 + measurableCount * 10) : 35;
    const keywordScore = hasJobDescription ? Math.round((matchedKeywords.length / Math.max(jobKeywords.length, 1)) * 100) : Math.min(100, 45 + Math.min(resumeWords.size, 55));
    const skillsScore = hasJobDescription ? (jobSkills.length ? Math.round(matchedSkills.length / jobSkills.length * 100) : keywordScore) : Math.min(100, detectedSkills.length * 12 + 35);
    const issues = [];
    if (!resume) issues.push({ priority: "High", issue: "No resume text was provided.", explanation: "A score cannot be calculated without readable resume content." });
    if (resume && resume.length < 250) issues.push({ priority: "High", issue: "Resume content is very short.", explanation: "Add enough detail for the parser to identify experience, skills, and education." });
    if (!contactChecks.email) issues.push({ priority: "High", issue: "Email address not detected.", explanation: "A clear email helps recruiters contact you and improves parsing reliability." });
    if (detectedSections.length < 3) issues.push({ priority: "Medium", issue: "Few standard sections detected.", explanation: "Use clear headings such as Summary, Experience, Skills, and Education." });
    if (resume.length > 12000) issues.push({ priority: "Low", issue: "Resume is unusually long.", explanation: "Review repetition and keep the most relevant content for the target role." });
    if (bullets.length && measurableCount === 0) issues.push({ priority: "Medium", issue: "No measurable outcomes detected.", explanation: "Where accurate, include scope, volume, time, or other real outcomes." });
    const suggestions = issues.map((item) => ({ ...item, suggestedImprovement: item.issue === "No measurable outcomes detected." ? "Rewrite selected bullets with factual results or scope." : item.explanation }));
    if (hasJobDescription && missingSkills.length) suggestions.unshift({ priority: "High", issue: "Relevant skills are missing from the resume.", explanation: "These skills appeared in the job description but were not detected in the resume.", suggestedImprovement: `Add ${missingSkills.slice(0, 5).map((skill) => skill.name).join(", ")} only if supported by your actual experience.` });
    const categoryScores = {
        keywordMatch: keywordScore,
        skillsMatch: skillsScore,
        structure: Math.min(100, sectionsScore),
        experienceQuality: experienceScore,
        contactInformation: contactScore,
        educationAndCertifications: educationScore
    };
    const overallScore = Math.round(Object.entries(ATS_WEIGHTS).reduce((total, [key, weight]) => total + categoryScores[key] * weight, 0));
    return {
        overallScore,
        categoryScores,
        analysisType: hasJobDescription ? "Job-specific compatibility analysis" : "General resume analysis",
        matchedKeywords: hasJobDescription ? matchedKeywords : [],
        missingKeywords: hasJobDescription ? missingKeywords : [],
        detectedSkills,
        detectedSections,
        strengths: [contactScore >= 75 && "Contact information is easy to identify.", detectedSections.length >= 4 && "The resume uses several standard sections.", actionVerbCount >= 2 && "Experience includes clear action verbs.", hasJobDescription && matchedSkills.length > 0 && "Relevant job skills were found in the resume."].filter(Boolean),
        issues,
        suggestions,
        scoringMethodology: ATS_WEIGHTS,
        formattingIssues: issues.map((item) => item.issue),
        atsScore: overallScore,
        keywordMatch: keywordScore,
        skillsMatch: skillsScore
    };
}

function analyzeSkills(userSkills, jobDescription) {
    const user = new Set(getKeywords(userSkills));
    const requested = [...new Set(getKeywords(jobDescription))];
    const matchedSkills = requested.filter((skill) => user.has(skill));
    const missingSkills = requested.filter((skill) => !user.has(skill));
    const matchPercentage = requested.length ? Math.round((matchedSkills.length / requested.length) * 100) : 0;
    return {
        matchPercentage,
        matchedSkills,
        missingSkills,
        recommendedSkills: missingSkills.slice(0, 10)
    };
}

function parseJson(value, fallback) {
    try { return JSON.parse(value); } catch (error) { return fallback; }
}

function getResumeForUser(resumeId, userId, callback) {
    db.get("SELECT * FROM resumes WHERE id = ? AND user_id = ?", [resumeId, userId], callback);
}

app.get("/api/resume", authenticateToken, (req, res) => {
    db.all("SELECT id, title, data, created_at, updated_at FROM resumes WHERE user_id = ? ORDER BY updated_at DESC", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to load resumes." });
        res.json({ success: true, resumes: rows.map((row) => ({ ...row, data: parseJson(row.data, {}) })) });
    });
});

app.get("/api/resume/:id", authenticateToken, (req, res) => {
    getResumeForUser(req.params.id, req.user.id, (err, resume) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to load resume." });
        if (!resume) return res.status(404).json({ success: false, message: "Resume not found." });
        res.json({ success: true, resume: { ...resume, data: parseJson(resume.data, {}) } });
    });
});

app.post("/api/resume/save", authenticateToken, (req, res) => {
    const { id, title, data } = req.body || {};
    if (!data || typeof data !== "object") return res.status(400).json({ success: false, message: "Resume data is required." });
    const resumeTitle = String(title || "My Resume").trim().slice(0, 120) || "My Resume";
    const resumeText = getResumeText(data);
    const serialized = JSON.stringify(data);
    const finish = (resumeId) => {
        db.run("DELETE FROM resume_sections WHERE resume_id = ?", [resumeId], () => {
            const sections = Object.entries(data).filter(([, value]) => value !== undefined && value !== null);
            const statement = db.prepare("INSERT INTO resume_sections (resume_id, section_type, content) VALUES (?, ?, ?)");
            sections.forEach(([section, value]) => statement.run(resumeId, section, JSON.stringify(value)));
            statement.finalize(() => res.status(200).json({ success: true, resume: { id: resumeId, title: resumeTitle, data } }));
        });
    };
    if (id) {
        db.run("UPDATE resumes SET title = ?, data = ?, resume_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", [resumeTitle, serialized, resumeText, id, req.user.id], function (err) {
            if (err) return res.status(500).json({ success: false, message: "Failed to update resume." });
            if (!this.changes) return res.status(404).json({ success: false, message: "Resume not found." });
            finish(id);
        });
    } else {
        db.run("INSERT INTO resumes (user_id, title, data, resume_text) VALUES (?, ?, ?, ?)", [req.user.id, resumeTitle, serialized, resumeText], function (err) {
            if (err) return res.status(500).json({ success: false, message: "Failed to save resume." });
            finish(this.lastID);
        });
    }
});

app.delete("/api/resume/:id", authenticateToken, (req, res) => {
    db.run("DELETE FROM resumes WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ success: false, message: "Failed to delete resume." });
        if (!this.changes) return res.status(404).json({ success: false, message: "Resume not found." });
        res.json({ success: true, message: "Resume deleted." });
    });
});

app.post("/api/resume/upload", authenticateToken, (req, res) => {
    upload.single("resume")(req, res, async (uploadError) => {
        try {
            if (uploadError) return res.status(uploadError instanceof multer.MulterError && uploadError.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ success: false, message: uploadError.message });
            if (!req.file || !req.file.buffer.length) return res.status(400).json({ success: false, message: "Please choose a non-empty PDF or DOCX file." });
            let text = "";
            if (path.extname(req.file.originalname).toLowerCase() === ".pdf") {
                const parser = new PDFParse({ data: req.file.buffer });
                const result = await parser.getText();
                text = result.text;
                await parser.destroy();
            } else {
                const result = await mammoth.extractRawText({ buffer: req.file.buffer });
                text = result.value;
            }
            if (!text.trim()) return res.status(422).json({ success: false, message: "The file did not contain extractable text." });
            res.json({ success: true, filename: req.file.originalname, text: text.trim() });
        } catch (error) {
            console.error("Resume extraction failed:", error.message);
            res.status(422).json({ success: false, message: "The resume could not be read. Try another PDF or DOCX file." });
        }
    });
});

app.post("/api/ats/analyze", authenticateToken, (req, res) => {
    upload.single("resume")(req, res, async (uploadError) => {
        try {
            if (uploadError) {
                const status = uploadError instanceof multer.MulterError && uploadError.code === "LIMIT_FILE_SIZE" ? 413 : 400;
                return res.status(status).json({ success: false, message: uploadError.message || "Resume upload failed." });
            }

            let resumeText = String(req.body?.resumeText || "").trim();
            let filename = "";
            if (req.file) {
                filename = req.file.originalname;
                const extension = path.extname(filename).toLowerCase();
                const isPdf = extension === ".pdf" && req.file.buffer.subarray(0, 5).toString("ascii") === "%PDF-";
                const isDocx = extension === ".docx" && req.file.buffer.subarray(0, 2).toString("ascii") === "PK";
                if (!isPdf && !isDocx) return res.status(400).json({ success: false, message: "The uploaded file content does not match a supported PDF or DOCX file." });
                if (isPdf) {
                    const parser = new PDFParse({ data: req.file.buffer });
                    const parsed = await parser.getText();
                    resumeText = String(parsed.text || "").trim();
                    await parser.destroy();
                } else {
                    const parsed = await mammoth.extractRawText({ buffer: req.file.buffer });
                    resumeText = String(parsed.value || "").trim();
                }
            }

            if (!resumeText) return res.status(422).json({ success: false, message: "Text could not be extracted from this resume. Please upload a text-based PDF or paste your resume content." });
            const jobDescription = String(req.body?.jobDescription || "").trim();
            const targetJobTitle = String(req.body?.jobTitle || "").trim().slice(0, 160);
            const result = analyzeText(resumeText, jobDescription);
            db.run(
                "INSERT INTO ats_results (user_id, resume_id, target_title, job_description, result) VALUES (?, ?, ?, ?, ?)",
                [req.user.id, req.body?.resumeId || null, targetJobTitle, jobDescription, JSON.stringify(result)],
                (err) => {
                    if (err) return res.status(500).json({ success: false, message: "Analysis could not be saved." });
                    return res.json({ success: true, data: { ...result, filename } });
                }
            );
        } catch (error) {
            console.error("ATS analysis failed:", error?.message || error);
            return res.status(422).json({ success: false, message: "The resume could not be analyzed. Try another PDF or DOCX file, or paste the resume text." });
        }
    });
});

app.post("/api/resume/ats-check", authenticateToken, (req, res) => {
    try {
        const { resumeText, jobDescription, targetJobTitle, resumeId } = req.body || {};
        if (!String(resumeText || "").trim() || !String(jobDescription || "").trim()) return res.status(400).json({ success: false, message: "Resume text and job description are required." });
        const result = analyzeText(String(resumeText), String(jobDescription));
        db.run("INSERT INTO ats_results (user_id, resume_id, target_title, job_description, result) VALUES (?, ?, ?, ?, ?)", [req.user.id, resumeId || null, targetJobTitle || "", jobDescription, JSON.stringify(result)], (err) => {
            if (err) return res.status(500).json({ success: false, message: "Analysis could not be saved." });
            res.json({ success: true, ...result });
        });
    } catch (error) { res.status(500).json({ success: false, message: "ATS analysis failed." }); }
});

app.post("/api/resume/skills-check", authenticateToken, (req, res) => {
    try {
        const { userSkills, jobDescription, resumeId } = req.body || {};
        if (!String(userSkills || "").trim() || !String(jobDescription || "").trim()) return res.status(400).json({ success: false, message: "Your skills and job description are required." });
        const result = analyzeSkills(String(userSkills), String(jobDescription));
        db.run("INSERT INTO skills_results (user_id, resume_id, job_description, result) VALUES (?, ?, ?, ?)", [req.user.id, resumeId || null, jobDescription, JSON.stringify(result)], (err) => {
            if (err) return res.status(500).json({ success: false, message: "Skills analysis could not be saved." });
            res.json({ success: true, ...result });
        });
    } catch (error) { res.status(500).json({ success: false, message: "Skills analysis failed." }); }
});

app.post("/api/resume/enhance", authenticateToken, async (req, res) => {
    try {
        const { type = "summary", text } = req.body || {};
        const cleanedText = String(text || "").trim();

        if (!cleanedText) {
            return res.status(400).json({ success: false, message: "Please enter content to enhance." });
        }

        if (!OPENAI_API_KEY || !openaiClient) {
            return res.status(500).json({
                success: false,
                configured: false,
                original: cleanedText,
                enhanced: cleanedText,
                message: "AI service is not configured. Add OPENAI_API_KEY to the backend .env file."
            });
        }

        const typeLabel = String(type || "summary");
        const promptMap = {
            summary: "Create a concise, professional resume summary that preserves the candidate's actual experience and skills while improving clarity, grammar, and recruiter-facing phrasing.",
            project: "Rewrite this project description into achievement-focused, professional resume language without inventing responsibilities, metrics, or facts. Preserve the real project details.",
            experience: "Rephrase this experience description into polished professional resume language, improving clarity and impact without fabricating duties, achievements, or company details.",
            achievement: "Rewrite this achievement into concise professional resume language without inventing numbers, outcomes, or claims. Keep the facts accurate and polished."
        };

        const completion = await openaiClient.chat.completions.create({
            model: OPENAI_MODEL,
            temperature: 0.4,
            messages: [
                {
                    role: "system",
                    content: "You are a resume-writing assistant. Preserve the user's factual meaning, improve grammar and readability, and write concise professional resume language optimized for recruiters and ATS. Do not invent experience, skills, metrics, companies, or achievements. Return only the rewritten text."
                },
                {
                    role: "user",
                    content: `${promptMap[typeLabel] || promptMap.summary}\n\nType: ${typeLabel}\nText: ${cleanedText}`
                }
            ]
        });

        const enhanced = completion?.choices?.[0]?.message?.content?.trim();

        if (!enhanced) {
            return res.status(502).json({ success: false, message: "AI enhancement service returned no text." });
        }

        db.run("INSERT INTO ai_enhancements (user_id, enhancement_type, original, enhanced) VALUES (?, ?, ?, ?)", [req.user.id, typeLabel, cleanedText, enhanced]);
        res.json({ success: true, configured: true, original: cleanedText, enhanced });
    } catch (error) {
        console.error("AI enhancement failed:", error?.message || error);
        return res.status(500).json({
            success: false,
            message: "AI enhancement service is temporarily unavailable."
        });
    }
});

app.listen(PORT, () => {

    console.log("--------------------------------");
    console.log("JobTrack Backend Started");
    console.log("--------------------------------");
    console.log(
        `Server: http://localhost:${PORT}`
    );

});

app.get("/api/settings", authenticateToken, (req, res) => {
    db.get(`SELECT u.id, u.name, u.email, p.* FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`, [req.user.id], (settingsErr, settings) => {
        if (settingsErr) return res.status(500).json({ success: false, message: "Unable to load settings." });
        const profile = settings ? Object.fromEntries(Object.entries(settings).filter(([key]) => key !== "id" && key !== "name" && key !== "email")) : {};
        db.get("SELECT * FROM user_preferences WHERE user_id = ?", [req.user.id], (preferenceErr, preferences) => {
            if (preferenceErr) return res.status(500).json({ success: false, message: "Unable to load preferences." });
            res.json({
            success: true,
            user: { id: req.user.id, name: settings?.name || "", email: settings?.email || req.user.email },
            profile,
            preferences: preferences || { notifications_enabled: 1, weekly_digest: 0, compact_view: 0 },
            notificationsEnabled: preferences ? Boolean(preferences.notifications_enabled) : true,
            aiEnabled: Boolean(process.env.OPENAI_API_KEY || process.env.AI_API_KEY)
            });
        });
    });
});

app.put("/api/settings/preferences", authenticateToken, (req, res) => {
    const payload = req.body || {};
    const values = [
        payload.notificationsEnabled === false ? 0 : 1,
        payload.weeklyDigest === true ? 1 : 0,
        payload.compactView === true ? 1 : 0,
        req.user.id
    ];
    db.run(`INSERT INTO user_preferences (notifications_enabled, weekly_digest, compact_view, user_id) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET notifications_enabled = excluded.notifications_enabled, weekly_digest = excluded.weekly_digest, compact_view = excluded.compact_view`, values, (err) => {
        if (err) return res.status(500).json({ success: false, message: "Unable to save preferences." });
        res.json({ success: true, preferences: { notificationsEnabled: Boolean(values[0]), weeklyDigest: Boolean(values[1]), compactView: Boolean(values[2]) }, message: "Preferences saved." });
    });
});