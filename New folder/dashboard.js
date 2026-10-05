const token = localStorage.getItem("jobtrackToken");
const savedUser = JSON.parse(localStorage.getItem("jobtrackUser") || "null");

if (!token) {
    window.location.href = "/login";
}

document.getElementById("userName").textContent = savedUser ? savedUser.name : "Your dashboard";
document.getElementById("logoutButton").addEventListener("click", function () {
    localStorage.removeItem("jobtrackToken");
    localStorage.removeItem("jobtrackUser");
    window.location.href = "/login";
});

document.querySelectorAll(".module-link").forEach(function (button) {
    button.addEventListener("click", function () {
        document.querySelectorAll(".module-link").forEach(function (item) { item.classList.remove("active"); });
        document.querySelectorAll(".dashboard-section").forEach(function (section) { section.classList.remove("active"); });
        button.classList.add("active");
        document.getElementById(button.dataset.section).classList.add("active");
    });
});

const toolModal = document.getElementById("toolModal");
const toolTitle = document.getElementById("toolTitle");
const toolEyebrow = document.getElementById("toolEyebrow");
const toolContent = document.getElementById("toolContent");

const toolDefinitions = {
    builder: {
        eyebrow: "RESUME BUILDER",
        title: "Draft your resume profile",
        content: '<form class="tool-form" id="builderForm"><label>Target role<input name="role" required placeholder="e.g. Frontend Developer"></label><label>Professional summary<textarea name="summary" rows="4" required placeholder="Describe your experience and strengths"></textarea></label><label>Key achievements<textarea name="achievements" rows="4" required placeholder="Add measurable achievements"></textarea></label><button class="primary-button" type="submit">Generate draft</button><div class="tool-result"></div></form>'
    },
    ats: {
        eyebrow: "ATS CHECKER",
        title: "Check your resume keywords",
        content: '<form class="tool-form" id="atsForm"><label>Resume text<textarea name="resume" rows="7" required placeholder="Paste your resume text"></textarea></label><label>Job keywords<input name="keywords" required placeholder="JavaScript, SQL, teamwork"></label><button class="primary-button" type="submit">Run ATS check</button><div class="tool-result" id="atsResult"></div></form>'
    },
    skills: {
        eyebrow: "SKILLS CHECK",
        title: "Compare your skills",
        content: '<form class="tool-form" id="skillsForm"><label>Your skills<input name="current" required placeholder="JavaScript, Excel, communication"></label><label>Required skills<input name="required" required placeholder="JavaScript, React, SQL"></label><button class="primary-button" type="submit">Compare skills</button><div class="tool-result" id="skillsResult"></div></form>'
    },
    interview: {
        eyebrow: "INTERVIEW QUESTIONS",
        title: "Practice your answer",
        content: '<div class="question-card"><strong>Tell me about a challenging project you worked on.</strong><p>Use the STAR method: situation, task, action, and result.</p></div><form class="tool-form" id="answerForm"><label>Your answer<textarea name="answer" rows="6" required placeholder="Write your answer here"></textarea></label><button class="primary-button" type="submit">Save practice answer</button><div class="tool-result"></div></form>'
    },
    technical: {
        eyebrow: "TECHNICAL PREP",
        title: "Build a focused study plan",
        content: '<form class="tool-form" id="planForm"><label>Target role<input name="role" required placeholder="e.g. Backend Engineer"></label><label>Available days<input name="days" type="number" min="1" max="30" required value="7"></label><button class="primary-button" type="submit">Create plan</button><div class="tool-result" id="planResult"></div></form>'
    },
    guidance: {
        eyebrow: "CAREER GUIDANCE",
        title: "Choose your next focus",
        content: '<div class="guidance-list"><button class="guidance-option" type="button">Improve my resume</button><button class="guidance-option" type="button">Prepare for interviews</button><button class="guidance-option" type="button">Find more opportunities</button></div><div class="tool-result" id="guidanceResult"></div>'
    }
};

function openTool(toolName) {
    const definition = toolDefinitions[toolName];
    toolEyebrow.textContent = definition.eyebrow;
    toolTitle.textContent = definition.title;
    toolContent.innerHTML = definition.content;
    toolModal.hidden = false;
    bindTool(toolName);
}

function bindTool(toolName) {
    const form = toolContent.querySelector("form");
    if (toolName === "ats") form.addEventListener("submit", runAtsCheck);
    if (toolName === "skills") form.addEventListener("submit", runSkillsCheck);
    if (toolName === "builder") form.addEventListener("submit", function (event) { showToolResult(event, "Resume draft created. You can now tailor it to the job description."); });
    if (toolName === "interview") form.addEventListener("submit", function (event) { showToolResult(event, "Practice answer saved for this session."); });
    if (toolName === "technical") form.addEventListener("submit", createStudyPlan);
    toolContent.querySelectorAll(".guidance-option").forEach(function (button) {
        button.addEventListener("click", function () { document.getElementById("guidanceResult").textContent = `${button.textContent} selected. Start with one small action today.`; });
    });
}

function showToolResult(event, message) {
    event.preventDefault();
    event.target.querySelector(".tool-result").textContent = message;
}

function splitValues(value) {
    return value.toLowerCase().split(",").map(function (item) { return item.trim(); }).filter(Boolean);
}

function runAtsCheck(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const resume = formData.get("resume").toLowerCase();
    const keywords = splitValues(formData.get("keywords"));
    const matches = keywords.filter(function (keyword) { return resume.includes(keyword); });
    document.getElementById("atsResult").textContent = `${matches.length}/${keywords.length} keywords found. Missing: ${keywords.filter(function (keyword) { return !matches.includes(keyword); }).join(", ") || "none"}.`;
}

function runSkillsCheck(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const current = splitValues(formData.get("current"));
    const required = splitValues(formData.get("required"));
    const missing = required.filter(function (skill) { return !current.includes(skill); });
    document.getElementById("skillsResult").textContent = missing.length ? `Focus next on: ${missing.join(", ")}.` : "Great match. You listed every required skill.";
}

function createStudyPlan(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const days = Number(formData.get("days"));
    document.getElementById("planResult").textContent = `Your ${days}-day ${formData.get("role")} plan: fundamentals, one practical exercise daily, and a final mock interview.`;
}

document.querySelectorAll(".tool-button").forEach(function (button) {
    button.addEventListener("click", function () { openTool(button.dataset.tool); });
});

document.getElementById("closeToolButton").addEventListener("click", function () { toolModal.hidden = true; });
toolModal.addEventListener("click", function (event) { if (event.target === toolModal) toolModal.hidden = true; });

const jobModal = document.getElementById("jobModal");
const jobForm = document.getElementById("jobForm");
const jobsTable = document.getElementById("jobsTable");
const jobsMessage = document.getElementById("jobsMessage");

async function loadDashboardSummary() {
    try {
        const dashboard = await window.jobtrackApi.get('/api/dashboard');
        const stats = dashboard.stats || {};
        document.getElementById("totalJobs").textContent = Number(stats.total || 0);
        document.getElementById("savedJobs").textContent = Number(stats.saved || 0);
        document.getElementById("appliedJobs").textContent = Number(stats.applied || 0);
        document.getElementById("interviewJobs").textContent = Number(stats.interview || 0);
        document.getElementById("offerJobs").textContent = Number(stats.offer || 0);
        document.getElementById("rejectedJobs").textContent = Number(stats.rejected || 0);

        const profilePercent = Number(dashboard.profileCompletion || 0);
        const statusText = profilePercent >= 80 ? 'Profile ready' : profilePercent >= 50 ? 'Almost there' : 'Needs updates';
        const meta = document.querySelector('.panel-heading');
        if (meta && !meta.querySelector('.profile-status')) {
            const badge = document.createElement('span');
            badge.className = 'profile-status';
            badge.textContent = `${statusText} • ${profilePercent}%`;
            meta.appendChild(badge);
        }

        const deadlineList = document.getElementById('deadlinesList');
        const deadlines = dashboard.upcomingDeadlines || [];
        if (deadlineList) {
            deadlineList.innerHTML = deadlines.length
                ? deadlines.map((job) => `<article class="deadline-item"><strong>${job.company}</strong><span>${job.role}</span><time datetime="${job.deadline}">${job.deadline}</time></article>`).join('')
                : '<p class="tool-muted">No upcoming deadlines.</p>';
        }
        const resumeStatus = document.getElementById('resumeStatus');
        if (resumeStatus) resumeStatus.textContent = dashboard.resumeStatus || 'No resume yet';

        const notifications = dashboard.notifications || [];
        const list = document.getElementById('notificationsList');
        if (list) {
            list.innerHTML = notifications.length
                ? notifications.map((item) => `<article class="notification-item ${item.is_read ? '' : 'unread'}"><strong>${item.title}</strong><p>${item.message}</p><small>${new Date(item.created_at).toLocaleString()}</small></article>`).join('')
                : '<p class="tool-muted">You are all caught up.</p>';
        }
    } catch (error) {
        if (jobsMessage) jobsMessage.textContent = error.message;
    }
}

document.getElementById('markNotificationsRead')?.addEventListener('click', async () => {
    try {
        await window.jobtrackApi.put('/api/notifications/read-all', {});
        await loadDashboardSummary();
    } catch (error) {
        if (jobsMessage) jobsMessage.textContent = error.message;
    }
});

function apiRequest(url, options) {
    return fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options && options.headers)
        }
    }).then(async function (response) {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Request failed.");
        return result;
    });
}

function statusClass(status) {
    return status.toLowerCase().replace("assessment", "assessment");
}

function renderJobs(jobs) {
    if (!jobs.length) {
        jobsTable.innerHTML = '<tr><td colspan="5">No jobs yet. Add your first application.</td></tr>';
        return;
    }
    jobsTable.innerHTML = jobs.map(function (job) {
        return `<tr><td><strong>${job.company}</strong></td><td>${job.role}</td><td><span class="status ${statusClass(job.status)}">${job.status}</span></td><td>${job.application_date || "-"}</td><td><button class="delete-button" data-id="${job.id}" type="button">Delete</button></td></tr>`;
    }).join("");
    document.querySelectorAll(".delete-button").forEach(function (button) {
        button.addEventListener("click", function () { deleteJob(button.dataset.id); });
    });
}

async function loadJobs() {
    try {
        const jobs = await apiRequest("/api/jobs", { method: "GET" });
        renderJobs(jobs);
        const stats = await apiRequest("/api/jobs/stats", { method: "GET" });
        document.getElementById("totalJobs").textContent = stats.total || 0;
        document.getElementById("appliedJobs").textContent = stats.applied || 0;
        document.getElementById("interviewJobs").textContent = stats.interview || 0;
        document.getElementById("offerJobs").textContent = stats.offer || 0;
    } catch (error) {
        jobsMessage.textContent = error.message;
    }
}

async function deleteJob(id) {
    try {
        await apiRequest(`/api/jobs/${id}`, { method: "DELETE" });
        await loadJobs();
    } catch (error) {
        jobsMessage.textContent = error.message;
    }
}

document.getElementById("addJobButton").addEventListener("click", function () { jobModal.hidden = false; });
document.getElementById("closeJobButton").addEventListener("click", function () { jobModal.hidden = true; });

jobForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const details = Object.fromEntries(new FormData(jobForm).entries());
    document.getElementById("jobFormMessage").textContent = "Saving...";
    try {
        await apiRequest("/api/jobs", { method: "POST", body: JSON.stringify(details) });
        jobForm.reset();
        jobModal.hidden = true;
        await loadJobs();
    } catch (error) {
        document.getElementById("jobFormMessage").textContent = error.message;
    }
});

loadJobs();
loadDashboardSummary();
