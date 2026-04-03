// js/auth.js

const USERS = ["externo", "satelite", "adm"];
const PASSWORD = "Almox";

function login(username, password) {
    if (USERS.includes(username) && password === PASSWORD) {
        localStorage.setItem("auth", "true");
        localStorage.setItem("user", username);
        return true;
    }
    return false;
}

function logout() {
    localStorage.clear();
    window.location.href = "/pages/login.html";
}

function checkAuth() {
    if (localStorage.getItem("auth") !== "true") {
        window.location.href = "/pages/login.html";
    }
}

function getUser() {
    return localStorage.getItem("user");
}