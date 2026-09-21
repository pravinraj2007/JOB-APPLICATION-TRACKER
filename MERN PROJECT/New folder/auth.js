(function () {
    const USER_KEY = 'jobtrackUsers';
    const TOKEN_KEY = 'jobtrackToken';
    const USER_SESSION_KEY = 'jobtrackUser';

    function readUsers() {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY) || '[]');
        } catch (error) {
            return [];
        }
    }

    function writeUsers(users) {
        localStorage.setItem(USER_KEY, JSON.stringify(users));
    }

    function routeForPage(page) {
        const routes = {
            home: '/',
            dashboard: '/dashboard',
            login: '/login',
            signup: '/signup',
            jobTracker: '/job-tracker',
            resumeAi: '/resume-ai',
            careerResources: '/career-resources',
            interviewPrep: '/interview-prep',
            profile: '/profile',
            settings: '/settings'
        };
        return routes[page] || '/';
    }

    window.jobtrackAuth = {
        readUsers,
        writeUsers,
        isAuthenticated() {
            const token = localStorage.getItem(TOKEN_KEY);
            if (!token || typeof token !== 'string') return false;
            const trimmed = token.trim();
            if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false;
            return trimmed.split('.').length === 3;
        },
        getCurrentUser() {
            try {
                return JSON.parse(localStorage.getItem(USER_SESSION_KEY) || 'null');
            } catch (error) {
                return null;
            }
        },
        setSession(user) {
            localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
            const existingToken = localStorage.getItem(TOKEN_KEY);
            if (existingToken && existingToken.trim().split('.').length === 3) {
                return existingToken.trim();
            }
            return null;
        },
        clearSession() {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_SESSION_KEY);
        },
        logout() {
            this.clearSession();
            window.location.href = '/';
        },
        requireAuth() {
            if (!this.isAuthenticated()) {
                window.location.href = routeForPage('login');
                return false;
            }
            return true;
        },
        requireGuest() {
            if (this.isAuthenticated()) {
                window.location.href = routeForPage('dashboard');
                return false;
            }
            return true;
        },
        guardProtectedPage({ requireAuth = false, redirectTo = routeForPage('login') } = {}) {
            const isAuth = this.isAuthenticated();

            if (requireAuth && !isAuth) {
                window.location.href = redirectTo;
                return false;
            }

            if (!requireAuth && isAuth) {
                const currentPath = window.location.pathname;
                if (currentPath === routeForPage('login') || currentPath === routeForPage('signup')) {
                    window.location.href = routeForPage('dashboard');
                    return false;
                }
            }

            return true;
        },
        syncNavigation() {
            const currentPath = window.location.pathname;
            const authLinks = document.querySelectorAll('[data-auth-link]');
            if (!authLinks.length) {
                return;
            }

            const isAuth = this.isAuthenticated();
            authLinks.forEach((link) => {
                const page = link.dataset.authLink;
                const target = routeForPage(page);
                if (isAuth) {
                    if (page === 'login') {
                        link.textContent = 'Logout';
                        link.href = '#';
                        link.onclick = function (event) {
                            event.preventDefault();
                            window.jobtrackAuth.logout();
                        };
                    }
                    if (page === 'signup') {
                        link.textContent = 'Logout';
                        link.href = '#';
                        link.onclick = function (event) {
                            event.preventDefault();
                            window.jobtrackAuth.logout();
                        };
                    }
                } else {
                    link.textContent = page === 'login' ? 'Login' : 'Get Started';
                    link.href = target;
                    link.onclick = null;
                }

                if (currentPath === target) {
                    link.classList.add('active-link');
                } else {
                    link.classList.remove('active-link');
                }
            });
        },
        signup(user) {
            const users = readUsers();
            if (users.some((item) => item.email.toLowerCase() === user.email.toLowerCase())) {
                return { success: false, message: 'An account already exists with this email.' };
            }
            const nextUser = {
                id: Date.now().toString(),
                name: user.name.trim(),
                email: user.email.trim(),
                password: user.password,
                createdAt: new Date().toISOString()
            };
            users.push(nextUser);
            writeUsers(users);
            return { success: true, message: 'Account created successfully!' };
        },
        login(email, password) {
            const users = readUsers();
            const foundUser = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
            if (!foundUser) {
                return { success: false, message: 'Invalid email or password.' };
            }
            if (foundUser.password !== password) {
                return { success: false, message: 'Invalid email or password.' };
            }
            const safeUser = { id: foundUser.id, name: foundUser.name, email: foundUser.email };
            this.clearSession();
            localStorage.setItem(USER_SESSION_KEY, JSON.stringify(safeUser));
            return { success: true, user: safeUser };
        },
        isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }
    };
})();
