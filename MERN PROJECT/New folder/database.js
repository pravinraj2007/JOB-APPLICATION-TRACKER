const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./jobtrack.db", (err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
    } else {
        console.log("SQLite database connected.");
    }
});

db.serialize(() => {

    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email_verified INTEGER DEFAULT 0,
            verification_code TEXT,
            verification_expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            return console.error("Unable to inspect users table:", err.message);
        }

        const availableColumns = new Set((columns || []).map((column) => column.name));
        const migrations = [
            ["email_verified", "INTEGER DEFAULT 0"],
            ["verification_code", "TEXT"],
            ["verification_expires_at", "DATETIME"]
        ];

        migrations.forEach(([columnName, definition]) => {
            if (!availableColumns.has(columnName)) {
                db.run(`ALTER TABLE users ADD COLUMN ${columnName} ${definition}`);
            }
        });
    });

    // Jobs table
    db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            full_name TEXT,
            email TEXT,
            phone TEXT,
            location TEXT,
            linkedin TEXT,
            github TEXT,
            portfolio TEXT,
            current_role TEXT,
            target_role TEXT,
            experience TEXT,
            preferred_location TEXT,
            work_mode TEXT,
            skills TEXT,
            education TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `);

    db.all("PRAGMA table_info(profiles)", (err, columns) => {
        if (err) {
            return console.error("Unable to inspect profiles table:", err.message);
        }

        const availableColumns = new Set((columns || []).map((column) => column.name));
        const profileMigrations = [
            ["full_name", "TEXT"],
            ["email", "TEXT"],
            ["phone", "TEXT"],
            ["location", "TEXT"],
            ["linkedin", "TEXT"],
            ["github", "TEXT"],
            ["portfolio", "TEXT"],
            ["current_role", "TEXT"],
            ["target_role", "TEXT"],
            ["experience", "TEXT"],
            ["preferred_location", "TEXT"],
            ["work_mode", "TEXT"],
            ["skills", "TEXT"],
            ["education", "TEXT"],
            ["updated_at", "DATETIME"]
        ];

        profileMigrations.forEach(([columnName, definition]) => {
            if (!availableColumns.has(columnName)) {
                db.run(`ALTER TABLE profiles ADD COLUMN ${columnName} ${definition}`);
            }
        });
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            company TEXT NOT NULL,
            role TEXT NOT NULL,
            location TEXT,
            job_type TEXT,
            salary TEXT,
            date_applied TEXT,
            deadline TEXT,
            status TEXT DEFAULT 'Applied',
            job_link TEXT,
            notes TEXT,
            contact_person TEXT,
            contact_email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `);

    db.all("PRAGMA table_info(jobs)", (err, columns) => {
        if (err) {
            return console.error("Unable to inspect jobs table:", err.message);
        }

        const availableColumns = new Set((columns || []).map((column) => column.name));
        const jobMigrations = [
            ["location", "TEXT"],
            ["job_type", "TEXT"],
            ["salary", "TEXT"],
            ["date_applied", "TEXT"],
            ["deadline", "TEXT"],
            ["contact_person", "TEXT"],
            ["contact_email", "TEXT"],
            ["updated_at", "DATETIME"]
        ];

        jobMigrations.forEach(([columnName, definition]) => {
            if (!availableColumns.has(columnName)) {
                db.run(`ALTER TABLE jobs ADD COLUMN ${columnName} ${definition}`);
            }
        });
    });

        db.run(`
            CREATE TABLE IF NOT EXISTS resumes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL DEFAULT 'My Resume',
                data TEXT NOT NULL,
                resume_text TEXT NOT NULL DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);

    db.run(`
        CREATE TABLE IF NOT EXISTS career_resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT NULL,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            resource_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, resource_id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(resource_id) REFERENCES career_resources(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'info',
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS user_preferences (
            user_id INTEGER PRIMARY KEY,
            notifications_enabled INTEGER NOT NULL DEFAULT 1,
            weekly_digest INTEGER NOT NULL DEFAULT 0,
            compact_view INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `);

    db.run(`
        INSERT OR IGNORE INTO career_resources (id, user_id, category, title, summary, content)
        VALUES
            (1, NULL, 'Resume', 'Resume Structure', 'Build a clear and ATS-friendly resume structure.', 'Use a simple resume flow: summary, experience, skills, education, projects, achievements. Keep formatting consistent and avoid large blocks of text.'),
            (2, NULL, 'Interview', 'STAR Method', 'Answer behavioral interview questions confidently.', 'Use the STAR method: Situation, Task, Action, Result. Keep your examples focused on outcomes and learning.'),
            (3, NULL, 'Career Planning', 'Career Roadmap', 'Plan your next move with clearer priorities.', 'Define your target role, identify gaps, create a 90-day action plan, and review progress weekly.'),
            (4, NULL, 'Technical Skills', 'System Design Thinking', 'Strengthen the way you reason about technical tradeoffs.', 'Break big problems into requirements, tradeoffs, constraints, interfaces, and validation steps.'),
            (5, NULL, 'Soft Skills', 'Communication', 'Improve clarity and consistency in your communication.', 'Practice concise updates, active listening, and structured explanations tailored to the audience.'),
            (6, NULL, 'Job Search', 'Networking', 'Use networking intentionally to increase reach.', 'Reach out with context, specific interest, and a clear ask. Follow up respectfully and keep your outreach concise.'),
            (7, NULL, 'Networking', 'Portfolio Strategy', 'Make your portfolio easier to trust.', 'Show your process, link to real projects, and explain the problem, solution, and impact without fluff.'),
            (8, NULL, 'Resume', 'ATS Optimization', 'Improve keyword and formatting alignment.', 'Match job keywords naturally, keep headings consistent, and include measurable outcomes and relevant skills.')
    `);

        db.run(`
            CREATE TABLE IF NOT EXISTS resume_sections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resume_id INTEGER NOT NULL,
                section_type TEXT NOT NULL,
                content TEXT NOT NULL DEFAULT '',
                FOREIGN KEY(resume_id) REFERENCES resumes(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS ats_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                resume_id INTEGER,
                target_title TEXT,
                job_description TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(resume_id) REFERENCES resumes(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS skills_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                resume_id INTEGER,
                job_description TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(resume_id) REFERENCES resumes(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS ai_enhancements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                enhancement_type TEXT NOT NULL,
                original TEXT NOT NULL,
                enhanced TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);

});

module.exports = db;