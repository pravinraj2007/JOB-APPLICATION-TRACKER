(function () {
    const tools = {
        builder: { title: "Resume Builder", render: renderBuilder },
        ats: { title: "ATS Resume Checker", render: renderAts },
        enhance: { title: "AI Enhancement", render: renderEnhance },
        skills: { title: "Skills Check", render: renderSkills }
    };
    let activeResume = null;

    document.querySelectorAll(".tool-button").forEach((button) => button.addEventListener("click", () => openTool(button.dataset.tool)));

    function openTool(name) {
        const tool = tools[name];
        if (!tool) return;
        let modal = document.getElementById("resumeToolModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "resumeToolModal";
            modal.className = "resume-tool-modal";
            document.body.appendChild(modal);
        }
        modal.innerHTML = `<div class="resume-tool-panel"><button class="modal-close" type="button" aria-label="Close">&times;</button><div class="tool-heading"><p class="eyebrow">RESUME AI</p><h2>${tool.title}</h2></div><div id="resumeToolContent"></div></div>`;
        modal.hidden = false;
        modal.querySelector(".modal-close").addEventListener("click", () => { modal.hidden = true; });
        tool.render(modal.querySelector("#resumeToolContent"));
    }

    function field(label, name, type = "text", required = false) {
        return `<label>${label}<input name="${name}" type="${type}" ${required ? "required" : ""}></label>`;
    }

    function textField(label, name, rows = 4, required = false) {
        return `<label>${label}<textarea name="${name}" rows="${rows}" ${required ? "required" : ""}></textarea></label>`;
    }

    function repeatable(title, key, fields) {
        return `<section class="resume-form-section"><div class="section-heading"><h3>${title}</h3><button class="link-button add-entry" type="button" data-key="${key}">+ Add</button></div><div class="repeatable-list" data-list="${key}"><div class="repeatable-entry">${fields}<button class="link-button remove-entry" type="button">Remove</button></div></div></section>`;
    }

    function renderBuilder(root) {
        root.innerHTML = `<form id="builderForm" class="resume-form">
            <div class="saved-resumes" id="savedResumes"></div>
            <section class="resume-form-section"><h3>Personal Information</h3><div class="form-grid">${field("Full Name", "fullName", "text", true)}${field("Email", "email", "email")}${field("Phone", "phone")}${field("Location", "location")}${field("LinkedIn", "linkedin")}${field("GitHub", "github")}${field("Portfolio", "portfolio")}</div></section>
            <section class="resume-form-section"><h3>Professional Summary</h3>${textField("Summary", "summary", 5)}</section>
            ${repeatable("Education", "education", `${field("Degree", "degree")}${field("Institution", "institution")}${field("Start Year", "startYear")}${field("End Year", "endYear")}${field("CGPA/Percentage", "grade")}`)}
            ${repeatable("Experience", "experience", `${field("Company", "company")}${field("Role", "role")}${field("Start Date", "startDate")}${field("End Date", "endDate")}${textField("Description", "description", 3)}`)}
            ${repeatable("Projects", "projects", `${field("Project Name", "name")}${textField("Description", "description", 3)}${field("Technologies", "technologies")}${field("Project Link", "link", "url")}`)}
            <section class="resume-form-section"><h3>Skills & Languages</h3><div class="form-grid">${field("Programming Languages", "languages")}${field("Frameworks", "frameworks")}${field("Databases", "databases")}${field("Tools", "tools")}${field("Soft Skills", "softSkills")}${field("Languages", "spokenLanguages")}</div></section>
            <section class="resume-form-section form-grid">${textField("Certifications", "certifications", 3)}${textField("Achievements", "achievements", 3)}</section>
            <div class="tool-actions"><button class="primary-button" type="submit">Save Resume</button><button class="secondary-button" id="previewResume" type="button">Preview Resume</button><button class="secondary-button" id="downloadPdfBtn" type="button">Download PDF</button><button class="link-button" id="clearResume" type="button">Clear</button></div><p class="tool-message" id="builderMessage"></p>
        </form><div id="resumePdfPreview" class="resume-preview-panel" hidden></div>`;
        const form = root.querySelector("#builderForm");
        loadSavedResumes(root, form);
        root.addEventListener("click", (event) => {
            const add = event.target.closest(".add-entry");
            if (add) addEntry(add.dataset.key);
            if (event.target.closest(".remove-entry")) event.target.closest(".repeatable-entry").remove();
        });
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const data = collectBuilder(form);
            try {
                const result = await window.jobtrackApi.post("/api/resume/save", { id: activeResume?.id, title: data.fullName ? `${data.fullName} Resume` : "My Resume", data });
                activeResume = result.resume;
                root.querySelector("#builderMessage").textContent = "Resume saved successfully.";
                loadSavedResumes(root, form);
            } catch (error) { root.querySelector("#builderMessage").textContent = error.message; }
        });
        root.querySelector("#previewResume").addEventListener("click", () => generateResumePreview(root, form));
        root.querySelector("#downloadPdfBtn").addEventListener("click", () => downloadResumePDF(root, form));
        root.querySelector("#clearResume").addEventListener("click", () => { activeResume = null; form.reset(); root.querySelector("#builderMessage").textContent = "Resume form cleared."; });
    }

    function addEntry(key) {
        const list = document.querySelector(`[data-list="${key}"]`);
        const copy = list.firstElementChild.cloneNode(true);
        copy.querySelectorAll("input, textarea").forEach((input) => input.value = "");
        list.appendChild(copy);
    }

    function collectBuilder(form) {
        const values = Object.fromEntries(new FormData(form).entries());
        ["education", "experience", "projects"].forEach((key) => {
            values[key] = [...form.querySelectorAll(`[data-list="${key}"] .repeatable-entry`)].map((entry) => Object.fromEntries([...entry.querySelectorAll("input, textarea")].map((input) => [input.name, input.value])));
        });
        return values;
    }

    function fillBuilder(form, data) {
        Object.entries(data || {}).forEach(([key, value]) => {
            if (Array.isArray(value)) return;
            const input = form.elements[key];
            if (input) input.value = value || "";
        });
        ["education", "experience", "projects"].forEach((key) => (data[key] || []).slice(1).forEach(() => addEntry(key)));
        ["education", "experience", "projects"].forEach((key) => {
            (data[key] || []).forEach((item, index) => {
                Object.entries(item).forEach(([name, value]) => {
                    const input = form.querySelectorAll(`[data-list="${key}"] .repeatable-entry`)[index]?.querySelector(`[name="${name}"]`);
                    if (input) input.value = value || "";
                });
            });
        });
    }

    async function loadSavedResumes(root, form) {
        try {
            const result = await window.jobtrackApi.get("/api/resume");
            const resumes = result.resumes || [];
            root.querySelector("#savedResumes").innerHTML = resumes.length ? `<label>Saved resume<select id="savedResumeSelect"><option value="">Choose a saved resume</option>${resumes.map((resume) => `<option value="${resume.id}">${escapeHtml(resume.title)}</option>`).join("")}</select></label><button class="link-button danger-link" id="deleteSavedResume" type="button" disabled>Delete selected resume</button>` : "<p class='tool-muted'>No resume data available yet.</p>";
            const select = root.querySelector("#savedResumeSelect");
            const deleteButton = root.querySelector("#deleteSavedResume");
            if (select) select.addEventListener("change", async () => { deleteButton.disabled = !select.value; if (!select.value) return; const result = await window.jobtrackApi.get(`/api/resume/${select.value}`); activeResume = result.resume; form.reset(); fillBuilder(form, activeResume.data); });
            if (deleteButton) deleteButton.addEventListener("click", async () => { if (!select.value || !window.confirm("Delete this saved resume?")) return; await window.jobtrackApi.delete(`/api/resume/${select.value}`); activeResume = null; form.reset(); root.querySelector("#builderMessage").textContent = "Resume deleted."; loadSavedResumes(root, form); });
        } catch (error) { root.querySelector("#savedResumes").textContent = error.message; }
    }

    function getValue(form, name) {
        const element = form.elements[name];
        return element ? String(element.value || "").trim() : "";
    }

    function sectionHtml(title, content) {
        return content ? `<section><h2>${title}</h2>${content}</section>` : "";
    }

    function entryHtml(entry, labels) {
        const values = labels.map(([name, label]) => {
            const value = String(entry[name] || "").trim();
            return value ? `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>` : "";
        }).join("");
        return values ? `<div class="resume-pdf-entry">${values}</div>` : "";
    }

    function generateResumePreview(root, form) {
        const preview = root.querySelector("#resumePdfPreview");
        if (!preview) return;
        const data = collectBuilder(form);
        const fullName = getValue(form, "fullName");
        const contact = ["email", "phone", "location"].map((name) => getValue(form, name)).filter(Boolean).join(" | ");
        const links = ["linkedin", "github", "portfolio"].map((name) => getValue(form, name)).filter(Boolean).join(" | ");
        const education = (data.education || []).map((entry) => entryHtml(entry, [["degree", "Degree"], ["institution", "Institution"], ["startYear", "Start Year"], ["endYear", "End Year"], ["grade", "CGPA/Percentage"]])).join("");
        const experience = (data.experience || []).map((entry) => entryHtml(entry, [["role", "Role"], ["company", "Company"], ["startDate", "Start Date"], ["endDate", "End Date"], ["description", "Description"]])).join("");
        const projects = (data.projects || []).map((entry) => entryHtml(entry, [["name", "Project Name"], ["description", "Description"], ["technologies", "Technologies"], ["link", "Project Link"]])).join("");
        const skills = [["Programming Languages", data.languages], ["Frameworks", data.frameworks], ["Databases", data.databases], ["Tools", data.tools], ["Soft Skills", data.softSkills], ["Languages", data.spokenLanguages]].filter(([, value]) => String(value || "").trim()).map(([label, value]) => `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`).join("");
        const certifications = getValue(form, "certifications");
        const achievements = getValue(form, "achievements");
        const content = [fullName, contact, links, getValue(form, "summary"), education, experience, projects, skills, certifications, achievements].some(Boolean);
        preview.innerHTML = content ? `<div class="resume-pdf"><header class="resume-header"><h1>${escapeHtml(fullName || "Your Name")}</h1>${contact ? `<div class="contact">${escapeHtml(contact)}</div>` : ""}${links ? `<div class="links">${escapeHtml(links)}</div>` : ""}</header>${sectionHtml("Professional Summary", getValue(form, "summary") ? `<p>${escapeHtml(getValue(form, "summary"))}</p>` : "")}${sectionHtml("Education", education)}${sectionHtml("Experience", experience)}${sectionHtml("Projects", projects)}${sectionHtml("Skills", skills)}${sectionHtml("Certifications", certifications ? `<p>${escapeHtml(certifications)}</p>` : "")}${sectionHtml("Achievements", achievements ? `<p>${escapeHtml(achievements)}</p>` : "")}</div>` : "";
        preview.hidden = !content;
        return preview;
    }

    async function downloadResumePDF(root, form) {
        const preview = root.querySelector("#resumePdfPreview");
        if (!preview) {
            alert("Resume preview element not found.");
            return;
        }
        generateResumePreview(root, form);
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!preview.innerHTML.trim()) {
            alert("Please enter your resume information before downloading.");
            return;
        }
        if (typeof window.html2pdf !== "function") {
            alert("PDF generation is unavailable. Please check your internet connection and try again.");
            return;
        }
        const options = {
            margin: [10, 10, 10, 10],
            filename: "JobTrack_Resume.pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["css", "legacy"] }
        };
        const oldDisplay = preview.style.display;
        const oldPosition = preview.style.position;
        try {
            preview.style.display = "block";
            preview.style.position = "relative";
            await window.html2pdf().set(options).from(preview).save();
        } catch (error) {
            console.error("PDF generation failed:", error);
            alert("Unable to generate the PDF. Please check the browser console.");
        } finally {
            preview.style.display = oldDisplay;
            preview.style.position = oldPosition;
        }
    }

    function renderAts(root) {
        root.innerHTML = `<form id="atsForm" class="resume-form"><div class="form-grid">${field("Target Job Title", "targetJobTitle")}${field("Upload PDF or DOCX", "resumeFile", "file")}</div>${textField("Resume Text", "resumeText", 8, true)}${textField("Job Description", "jobDescription", 8, true)}<div class="tool-actions"><button class="primary-button" type="submit">Analyze Resume</button><button class="secondary-button" id="useSavedResume" type="button">Use Saved Resume</button></div><div id="atsResult" class="analysis-result"></div></form>`;
        const form = root.querySelector("#atsForm");
        form.resumeFile.addEventListener("change", async () => { if (!form.resumeFile.files[0]) return; const body = new FormData(); body.append("resume", form.resumeFile.files[0]); try { const result = await window.jobtrackApi.post("/api/resume/upload", body); form.resumeText.value = result.text; } catch (error) { root.querySelector("#atsResult").textContent = error.message; } });
        root.querySelector("#useSavedResume").addEventListener("click", async () => { try { const result = await window.jobtrackApi.get("/api/resume"); if (!result.resumes?.length) return root.querySelector("#atsResult").textContent = "No resume data available yet."; activeResume = result.resumes[0]; form.resumeText.value = activeResume.data ? getText(activeResume.data) : ""; } catch (error) { root.querySelector("#atsResult").textContent = error.message; } });
        form.addEventListener("submit", async (event) => { event.preventDefault(); const button = form.querySelector("button[type=submit]"); button.disabled = true; try { const result = await window.jobtrackApi.post("/api/resume/ats-check", { resumeText: form.resumeText.value, jobDescription: form.jobDescription.value, targetJobTitle: form.targetJobTitle.value, resumeId: activeResume?.id }); renderResult(root.querySelector("#atsResult"), result, ["atsScore", "keywordMatch", "skillsMatch", "matchedKeywords", "missingKeywords", "formattingIssues", "suggestions"]); } catch (error) { root.querySelector("#atsResult").textContent = error.message; } finally { button.disabled = false; } });
    }

    function renderEnhance(root) {
        root.innerHTML = `<form id="enhanceForm" class="resume-form"><label>Content type<select name="type"><option value="summary">Professional Summary</option><option value="project">Project Description</option><option value="experience">Experience Description</option><option value="achievement">Achievement</option></select></label>${textField("Content", "text", 8, true)}<div class="tool-actions"><button class="primary-button" type="submit">Enhance</button><button class="secondary-button" id="regenerateEnhance" type="button">Regenerate</button><button class="secondary-button" id="copyEnhance" type="button">Copy</button></div><div id="enhanceResult" class="analysis-result"></div></form>`;
        const form = root.querySelector("#enhanceForm");
        const enhanceButton = form.querySelector("button[type='submit']");
        const regenerateButton = root.querySelector("#regenerateEnhance");
        const copyButton = root.querySelector("#copyEnhance");
        const result = root.querySelector("#enhanceResult");

        const getFriendlyError = (errorMessage) => {
            const message = String(errorMessage || "").toLowerCase();
            if (message.includes("expired") || message.includes("invalid or expired token") || message.includes("access denied") || message.includes("login required")) return "Your session has expired. Please log in again.";
            if (message.includes("permission")) return "You do not have permission to use this feature.";
            if (message.includes("not configured")) return "AI service is not configured.";
            if (message.includes("temporarily unavailable") || message.includes("failed")) return "AI enhancement service is temporarily unavailable.";
            return errorMessage || "Unable to process the request.";
        };

        const enhance = async () => {
            if (!window.jobtrackAuth || !window.jobtrackAuth.isAuthenticated()) {
                result.textContent = "Your session has expired. Please log in again.";
                setTimeout(() => window.location.href = "/login", 1000);
                return;
            }

            const text = String(form.text.value || "").trim();
            if (!text) {
                result.textContent = "Please enter content to enhance.";
                result.dataset.copy = "";
                return;
            }

            enhanceButton.disabled = true;
            enhanceButton.textContent = "Enhancing...";
            regenerateButton.disabled = true;
            result.textContent = "";

            try {
                const response = await window.jobtrackApi.post("/api/resume/enhance", { type: form.type.value, text });
                const enhancedText = response.configured === false ? response.message : response.enhanced;
                result.textContent = enhancedText;
                result.dataset.copy = enhancedText || "";
            } catch (error) {
                result.textContent = getFriendlyError(error.message);
                result.dataset.copy = "";
            } finally {
                enhanceButton.disabled = false;
                enhanceButton.textContent = "Enhance";
                regenerateButton.disabled = false;
            }
        };

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            enhance();
        });

        regenerateButton.addEventListener("click", enhance);
        copyButton.addEventListener("click", async () => {
            const textToCopy = result.dataset.copy || "";
            if (!textToCopy) {
                result.textContent = "There is no enhanced text to copy yet.";
                return;
            }

            try {
                await navigator.clipboard.writeText(textToCopy);
                copyButton.textContent = "Copied!";
                setTimeout(() => { copyButton.textContent = "Copy"; }, 1200);
            } catch (error) {
                result.textContent = "Unable to copy the enhanced text.";
            }
        });
    }

    function renderSkills(root) {
        root.innerHTML = `<form id="skillsForm" class="resume-form">${textField("Your Skills", "userSkills", 6, true)}${textField("Job Description", "jobDescription", 8, true)}<button class="primary-button" type="submit">Review Skills</button><div id="skillsResult" class="analysis-result"></div></form>`;
        root.querySelector("#skillsForm").addEventListener("submit", async (event) => { event.preventDefault(); const form = event.currentTarget; try { const result = await window.jobtrackApi.post("/api/resume/skills-check", { userSkills: form.userSkills.value, jobDescription: form.jobDescription.value, resumeId: activeResume?.id }); renderResult(root.querySelector("#skillsResult"), result, ["matchPercentage", "matchedSkills", "missingSkills", "recommendedSkills"]); } catch (error) { root.querySelector("#skillsResult").textContent = error.message; } });
    }

    function renderResult(root, result, keys) { root.innerHTML = keys.map((key) => `<p><strong>${key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())}:</strong> ${escapeHtml(Array.isArray(result[key]) ? result[key].join(", ") || "None" : String(result[key] ?? "None"))}</p>`).join(""); }
    function getText(data) { return Object.values(data || {}).flatMap((value) => Array.isArray(value) ? value.map((item) => Object.values(item).join(" ")) : value).join(" "); }
    function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character])); }
})();