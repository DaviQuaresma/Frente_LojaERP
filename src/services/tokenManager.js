const axios = require("axios");
require("dotenv").config();

const { getDatabaseConfig } = require("../config/dbControl");

const API_URL = process.env.API_URL;

// 🔐 Carrega o token diretamente da config do banco ativo
async function carregarTokenLocal() {
    const config = await getDatabaseConfig();
    const ativo = config?.ativo;
    const token = config?.salvos?.[ativo]?.token;

    if (!token) {
        throw new Error("Token não encontrado na configuração do banco ativo");
    }

    return token;
}

// ✅ Valida se o token salvo está funcional
async function validateToken() {
    const response = await axios.get(`${API_URL}/api/validar-token`);
    return response.data.token;
}

// 🔄 Salva o token na API e valida
async function setToken() {
    const token = await carregarTokenLocal();

    await axios.post(`${API_URL}/api/config/token`, { token });

    const accessToken = await validateToken();
    return accessToken;
}

module.exports = { setToken };
