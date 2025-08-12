const axios = require("axios");
require("dotenv").config();

const API_URL = process.env.API_URL || "http://localhost:5000";
const API_DB_URL = "http://localhost:5001/api/database";

async function validateToken(token) {
    const response = await axios.get(`${API_URL}/api/validar-token`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    return response.data.token;
}

async function setToken() {
    try {
        const data = await fetch(`${API_DB_URL}/active/data`).then(r => r.json());
        const { token, id } = data.data;

        const saveResp = await axios.post(`${API_URL}/api/config/token`, { token });
        if (saveResp.status !== 200 || !saveResp.data) {
            throw new Error(`Falha ao salvar token na API. Status: ${saveResp.status}`);
        }

        const accessToken = await validateToken(token);

        const updateResp = await axios.put(`${API_DB_URL}/${id}`, { accessToken });
        if (updateResp.status !== 200 || !updateResp.data) {
            throw new Error(`Falha ao atualizar access token na API. Status: ${updateResp.status}`);
        }

        return accessToken;
    } catch (err) {
        const msg = err?.response?.data ?? err?.message ?? String(err);
        console.error("❌ Erro no setToken:", msg);
        throw new Error(`setToken falhou: ${JSON.stringify(msg)}`);
    }
}


module.exports = { setToken };
