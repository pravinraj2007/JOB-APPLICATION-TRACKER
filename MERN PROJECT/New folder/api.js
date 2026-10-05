(function () {
    const API_BASE_URL = window.API_BASE_URL || "";

    function getStoredAuthToken() {
        const rawToken = localStorage.getItem("jobtrackToken");
        if (!rawToken || typeof rawToken !== "string") return null;

        const token = rawToken.trim();
        if (!token || token === "undefined" || token === "null") {
            localStorage.removeItem("jobtrackToken");
            localStorage.removeItem("jobtrackUser");
            return null;
        }

        const parts = token.split(".");
        if (parts.length !== 3) {
            localStorage.removeItem("jobtrackToken");
            localStorage.removeItem("jobtrackUser");
            return null;
        }

        return token;
    }

    async function request(path, options) {
        const config = options || {};
        const headers = new Headers(config.headers || {});
        const token = getStoredAuthToken();

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        if (!(config.body instanceof FormData) && config.body !== undefined) headers.set("Content-Type", "application/json");

        const response = await fetch(`${API_BASE_URL}${path}`, { ...config, headers });
        const text = await response.text();
        let payload = {};
        try { payload = text ? JSON.parse(text) : {}; } catch (error) { payload = { message: text }; }

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem("jobtrackToken");
                localStorage.removeItem("jobtrackUser");
            }
            const requestError = new Error(payload.message || payload.error?.message || `Request failed (${response.status}).`);
            requestError.code = payload.code || payload.error?.code || "REQUEST_FAILED";
            requestError.status = response.status;
            requestError.retryAfterSeconds = payload.retryAfterSeconds;
            throw requestError;
        }

        return payload;
    }

    window.jobtrackApi = {
        get: (path) => request(path),
        post: (path, body) => request(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
        put: (path, body) => request(path, { method: "PUT", body: body instanceof FormData ? body : JSON.stringify(body) }),
        delete: (path) => request(path, { method: "DELETE" })
    };
})();