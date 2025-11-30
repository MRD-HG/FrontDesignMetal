// js/auth.js
// Simple auth helper using localStorage to persist token and user

const Auth = (function () {
    const TOKEN_KEY = 'wm_token';
    const USER_KEY = 'wm_user';

    function saveToken(token) {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    }
    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    async function fetchMe() {
        try {
            const res = await API.Auth.me();
            // API may return { data: { ... } } or user object
            const user = res?.data ?? res;
            if (user) {
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                return user;
            }
            return null;
        } catch (err) {
            // token invalid or expired
            localStorage.removeItem(USER_KEY);
            return null;
        }
    }

    async function login(usernameOrPayload, password) {
        // Supports (username, password) or (payload object)
        const payload = typeof usernameOrPayload === 'object' ? usernameOrPayload : { username: usernameOrPayload, password };
        const res = await API.Auth.login(payload);
        const token = res?.data?.token ?? res?.token ?? res?.accessToken ?? res?.access_token;
        if (!token) throw new Error('No token received');
        saveToken(token);
        // try fetch me
        await fetchMe();
        return token;
    }

    async function register(payload) {
        return API.Auth.register(payload);
    }

    function logout() {
        saveToken(null);
        localStorage.removeItem(USER_KEY);
        // redirect to login if exists
        try { window.location.href = 'login.html'; } catch (e) { /* ignore */ }
    }

    function isAuthenticated() {
        return !!getToken();
    }

    function getUser() {
        const s = localStorage.getItem(USER_KEY);
        if (!s) return null;
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    async function init() {
        // If token exists, attempt to refresh user info (non-blocking)
        const t = getToken();
        if (t) {
            await fetchMe();
        }
    }

    return {
        init,
        login,
        register,
        logout,
        isAuthenticated,
        getUser,
        fetchMe,
        getToken
    };
})();
