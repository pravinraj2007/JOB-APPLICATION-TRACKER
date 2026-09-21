/* =========================================
   MOBILE MENU
========================================= */

const menuButton = document.getElementById("menuButton");
const navLinks = document.getElementById("navLinks");

if (menuButton && navLinks) {
    menuButton.addEventListener("click", function () {
        navLinks.classList.toggle("active");
    });
}


/* =========================================
   CLOSE MOBILE MENU AFTER CLICK
========================================= */

const navigationItems = document.querySelectorAll(".nav-links a");

navigationItems.forEach(function (item) {
    item.addEventListener("click", function () {
        if (navLinks) {
            navLinks.classList.remove("active");
        }
    });
});


/* =========================================
   SCROLL ANIMATION
========================================= */

const animatedElements = document.querySelectorAll(
    ".feature-card, .step, .resource-card, .journey-card"
);

const observer = new IntersectionObserver(
    function (entries) {

        entries.forEach(function (entry) {

            if (entry.isIntersecting) {

                entry.target.classList.add("visible");

            }

        });

    },
    {
        threshold: 0.15
    }
);


animatedElements.forEach(function (element) {

    observer.observe(element);

});


/* =========================================
   GET STARTED BUTTON
========================================= */

const getStartedButton = document.getElementById("getStartedButton");
const authModal = document.getElementById("authModal");
const authClose = document.getElementById("authClose");
const registerForm = document.getElementById("registerForm");
const modalAuthMessage = document.getElementById("authMessage");
const authLinks = document.querySelectorAll('a[href="#cta"]');
const authTitle = document.getElementById("authTitle");
const authSubmit = document.getElementById("authSubmit");
const nameField = document.getElementById("nameField");
const verificationCodeField = document.getElementById("verificationCodeField");
const verificationCodeInput = document.getElementById("verificationCode");
const registerMode = document.getElementById("registerMode");
const loginMode = document.getElementById("loginMode");
let authMode = "register";
let modalPendingVerificationEmail = "";

if (getStartedButton) {
    getStartedButton.addEventListener("click", function () {
        openAuthModal();
    });
}

async function parseApiResponse(response) {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(text || "Something went wrong.");
    }
}

function openAuthModal() {

    authModal.hidden = false;

}

function closeAuthModal() {

    authModal.hidden = true;

}

function setAuthMode(mode) {

    authMode = mode;
    const isLogin = mode === "login";

    authTitle.textContent = isLogin ? "Welcome back to JobTrack" : "Create your JobTrack account";
    authSubmit.textContent = isLogin ? "Login" : "Create account";
    modalAuthMessage.textContent = isLogin ? "Continue organizing your job search." : "Start organizing your job search today.";
    nameField.hidden = isLogin;
    verificationCodeField.hidden = true;
    modalPendingVerificationEmail = "";
    verificationCodeInput.value = "";
    document.getElementById("name").required = !isLogin;
    registerMode.classList.toggle("active", !isLogin);
    loginMode.classList.toggle("active", isLogin);

}

if (getStartedButton && authClose && registerMode && loginMode && authModal && registerForm) {
getStartedButton.addEventListener("click", function () {

    openAuthModal();

});

authClose.addEventListener("click", closeAuthModal);
registerMode.addEventListener("click", function () { setAuthMode("register"); });
loginMode.addEventListener("click", function () { setAuthMode("login"); });

authLinks.forEach(function (link) {

    link.addEventListener("click", function (event) {
        event.preventDefault();
        openAuthModal();
    });

});

authModal.addEventListener("click", function (event) {

    if (event.target === authModal) {
        closeAuthModal();
    }

});

registerForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const formData = new FormData(registerForm);
    const details = Object.fromEntries(formData.entries());

    try {

        if (authMode === "register" && modalPendingVerificationEmail) {
            modalAuthMessage.textContent = "Verifying your email...";

            const verifyResponse = await fetch("/api/verify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: modalPendingVerificationEmail,
                    code: details.verificationCode
                })
            });
            const verifyResult = await parseApiResponse(verifyResponse);

            if (!verifyResponse.ok) {
                throw new Error(verifyResult.message || "Verification failed.");
            }

            modalAuthMessage.textContent = "Email verified. Signing you in...";
        }

        if (authMode === "register" && !modalPendingVerificationEmail) {
            modalAuthMessage.textContent = "Creating your account...";

            const registerResponse = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(details)
            });
            const registerResult = await parseApiResponse(registerResponse);

            if (!registerResponse.ok) {
                throw new Error(registerResult.message || "Registration failed.");
            }

            modalPendingVerificationEmail = details.email;
            verificationCodeField.hidden = false;
            authSubmit.textContent = "Verify & continue";
            modalAuthMessage.textContent = `A verification code was sent to ${details.email}. Enter it below to complete your registration.`;
            verificationCodeInput.required = true;
            verificationCodeInput.focus();
            return;
        }

        if (authMode === "login") {
            modalAuthMessage.textContent = "Signing you in...";
        }

        const loginResponse = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: details.email,
                password: details.password
            })
        });
        const loginResult = await parseApiResponse(loginResponse);

        if (!loginResponse.ok) {
            throw new Error(loginResult.message || "Login failed.");
        }

        localStorage.setItem("jobtrackToken", loginResult.token);
        localStorage.setItem("jobtrackUser", JSON.stringify(loginResult.user));
        window.location.href = "/dashboard";

    } catch (error) {

        modalAuthMessage.textContent = error.message;

    }

});


/* =========================================
   ACTIVE NAVIGATION
========================================= */

const sections = document.querySelectorAll("section[id]");

window.addEventListener("scroll", function () {

    let currentSection = "";

    sections.forEach(function (section) {

        const sectionTop = section.offsetTop - 100;

        if (window.scrollY >= sectionTop) {

            currentSection = section.getAttribute("id");

        }

    });

    navigationItems.forEach(function (link) {

        link.classList.remove("active-link");

        const href = link.getAttribute("href");

        if (href === "#" + currentSection) {

            link.classList.add("active-link");

        }

    });

});
}