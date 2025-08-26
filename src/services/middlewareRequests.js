require("dotenv").config();
const axios = require("axios");
const { getVendaById, getItensVendaByPedido } = require("../utils/dbCommands");
const { sendVendaToMiddleware } = require("./sendVendaToMiddleware");

const API_URL = "http://localhost:5000";
const API_DB_URL = "http://localhost:5001/api/database";

async function VendaMiddleware(connection, vendaId, codContato) {
  const venda = await getVendaById(connection, vendaId);
  const itens = await getItensVendaByPedido(connection, vendaId);
  return await sendVendaToMiddleware(venda, itens, codContato);
}

async function validateToken(token) {
  try {
    const response = await axios.get(`${API_URL}/api/validar-token`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("✅ Token válido:", response.data.token);
    return response.data.token;
  } catch (error) {
    const msg = error?.response?.data || error.message;
    console.error("❌ Erro ao validar token:", msg);
    throw new Error(`Falha ao validar token: ${JSON.stringify(msg)}`);
  }
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

module.exports = {
  VendaMiddleware,
  validateToken,
  setToken,
};
