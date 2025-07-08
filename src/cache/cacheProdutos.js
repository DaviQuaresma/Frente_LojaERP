const axios = require("axios");
const { setToken } = require("../services/tokenManager");

let cache = new Map();
let lastSync = 0;
const TTL = 1000 * 60 * 5; // 5 minutos de validade

async function atualizarCacheProdutos() {
    const token = await setToken();

    const res = await axios.get("http://localhost:3000/api/produtos", {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    const produtos = res.data || [];
    const novoCache = new Map();

    produtos.forEach((p) => {
        if (p.codigoProprio && p.codigo) {
            novoCache.set(p.codigoProprio.toString(), p.codigo);
        }
    });

    cache = novoCache;
    console.log("📦 Cache final:", [...cache.entries()]);
    lastSync = Date.now();
}

async function getCodigoEgestorPorCodigoProprio(codigoProprio) {
    const agora = Date.now();

    if (agora - lastSync > TTL || cache.size === 0) {
        console.log("[CACHE] Atualizando cache de produtos do eGestor...");
        await atualizarCacheProdutos();
    }

    return cache.get(codigoProprio.toString());
}

module.exports = {
    getCodigoEgestorPorCodigoProprio,
    atualizarCacheProdutos,
};
