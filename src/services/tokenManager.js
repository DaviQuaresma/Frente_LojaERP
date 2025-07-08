const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const API_URL = process.env.API_URL;

function carregarTokenLocal() {
    const tokenPath = path.resolve(__dirname, "../main/config/token.json");

    if (!fs.existsSync(tokenPath)) {
        throw new Error("Arquivo token.json não encontrado");
    }

    const tokenData = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));

    if (!tokenData.token) {
        throw new Error("Token não encontrado no arquivo token.json");
    }

    return tokenData.token;
}

async function validateToken() {
    const response = await axios.get(`${API_URL}/api/validar-token`);
    return response.data.token;
}

async function setToken() {
    const token = carregarTokenLocal();

    await axios.post(`http://localhost:3000/api/config/token`, { token });

    const accessToken = await validateToken();
    return accessToken;
}

module.exports = { setToken };
