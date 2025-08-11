require("dotenv").config();
const axios = require("axios");
const { getVendaById, getItensVendaByPedido } = require("../utils/dbCommands");
const { sendVendaToMiddleware } = require("./sendVendaToMiddleware");
const { getDatabaseConfig } = require("../config/dbControl");

const API_URL = "http://localhost:5000";
const API_DB_URL = "http://localhost:5002/api/database";

async function VendaMiddleware(connection, vendaId) {
  const venda = await getVendaById(connection, vendaId);
  const itens = await getItensVendaByPedido(connection, vendaId);
  return await sendVendaToMiddleware(venda, itens);
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

async function carregarTokenLocal() {
  try {
    const { ativo } = await getDatabaseConfig();

    if (!ativo) {
      throw new Error("Banco ativo não definido");
    }

    const res = await fetch(`http://localhost:5002/api/database/${ativo}`);

    if (!res.ok) {
      throw new Error(`Erro ao buscar banco "${ativo}" na API: ${res.statusText}`);
    }

    const banco = await res.json();

    if (!banco || banco.database !== ativo) {
      throw new Error(`Banco ativo "${ativo}" não encontrado entre os bancos disponíveis.`);
    }

    const { database, token } = banco;
    if (!database || !token) {
      throw new Error(`Token não encontrado para banco ativo: ${ativo}`);
    }

    console.log("[carregarTokenLocal] banco ativo:", database);
    console.log("[carregarTokenLocal] token encontrado:", token);

    return token;

  } catch (err) {
    console.error("Erro ao carregar o token:", err);
    throw new Error("Erro ao carregar o token local: " + err.message);
  }
}

async function setToken() {
  try {
    const token = await carregarTokenLocal();

    console.log("Token carregado:", token);

    const res = await axios.post(`${API_URL}/api/config/token`, { token });

    console.log("resposta da api:", res.data);

    if (res.status !== 200) {
      throw new Error(`Falha ao salvar token na API. Status: ${res.status}`);
    }

    console.log("Token salvo na API com sucesso!");
    const accessToken = await validateToken(token);

    return accessToken;
  } catch (error) {
    const msg = error?.response?.data || error.message;
    console.error("❌ Erro no setToken:", msg);
    throw new Error(`setToken falhou: ${JSON.stringify(msg)}`);
  }
}

module.exports = {
  VendaMiddleware,
  validateToken,
  setToken,
};
