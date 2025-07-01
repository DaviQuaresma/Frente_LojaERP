const axios = require("axios");
const { getVendaById, getItensVendaByPedido } = require("../utils/dbCommands");

async function VendaMiddleware(connection) {
  const venda = await getVendaById(connection);
  const itens = await getItensVendaByPedido(connection);

  const payload = {
    venda,
    itens
  };

  const response = await axios.post("http://localhost:3000/api/venda", payload);
  return response.data;
}

async function validateToken() {
  try {
    const response = await axios.get("http://localhost:3000/api/validar-token");

    console.log(" Token válido:", response.data.token);
    return response.data.token;

  } catch (error) {
    console.error(" Erro ao validar token:", error?.response?.data || error.message);
    throw error;
  }
}


async function setToken() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHAiOiIxNzUxY2JlZDIxNmFlMGEwMzMxMjAxOTRiM2U5ZDU5ZCIsInN1YmRvbWluaW8iOiJyb2RyaWdvYXJhdWpvY29udGFiaWxpZGFkZTIiLCJjbGllbnQiOiI2Nzc4ODZjMTQ3ZGVkYjViNzkyNjNmY2E1M2QzMzVmNTNkNWE0ZjczIiwiY3JlYXRlZCI6MTc1MDg2MDg0MH0=.6OBNxCwZOf3XRzXStdk4NqURbuJVC0MCamtZYCKpLfs="

  if (!token) throw new Error("Token não fornecido");

  try {
    // 1. Salva no config.json
    await axios.post("http://localhost:3000/api/config/token", { token });

    // 2. Valida com a API e retorna o access_token
    const accessToken = await validateToken();

    return accessToken; // <-- isso é o token que precisa ser usado
  } catch (error) {
    console.error(" Token incorreto:", error?.response?.data || error.message);
    throw error;
  }
}



module.exports = { VendaMiddleware, validateToken, setToken }