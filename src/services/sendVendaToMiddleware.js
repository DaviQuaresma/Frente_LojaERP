const { getCodigoEgestorPorCodigoProprio } = require("../cache/cacheProdutos.js");
const { setToken } = require("./tokenManager.js");
const axios = require("axios");

async function sendVendaToMiddleware(venda, itens) {
    const token = await setToken();

    const produtosPayload = [];

    for (const item of itens) {
        console.log("Item bruto:", item);


        const codProprio = (item.pro_codigo || item.pro_codigo_or || item.codProduto || "").toString();

        if (!codProprio) {
            console.warn("[ERRO] Item sem código próprio:", item);
            throw new Error("Item sem código próprio (produto inválido)");
        }

        const codEgestor = await getCodigoEgestorPorCodigoProprio(codProprio, token);

        console.log("codProprio:", codProprio);
        console.log("codEgestor:", codEgestor);

        if (!codEgestor) {
            console.warn(`[WARN] Produto não encontrado no eGestor: ${codProprio}`);
            throw new Error(`Produto não encontrado no eGestor: ${codProprio}`);
        }

        produtosPayload.push({
            codProduto: codEgestor,
            codProprio: codProprio,
            quant: item.quantidade,
            preco: item.preco,
            obs: item.obs || "",
        });
    }

    const payload = {
        codContato: venda.cod_cliente || 1,
        codVendedor: venda.cod_vendedor || 1,
        dtVenda: venda.data,
        situacao: 50,
        valorDesc: venda.desconto,
        valorFrete: 0,
        clienteFinal: 1,
        tags: ["VENDA_VIA_ELECTRON"],
        produtos: produtosPayload,
        financeiros: [
            {
                dtVenc: venda.data,
                dtComp: venda.data,
                pago: true,
                codFormaPgto: 1,
                codPlanoContas: 1,
                codCaixa: 1,
                valor: venda.total,
                descricao: "Venda via Electron",
                tags: ["AUTOMATICA", "API"],
            },
        ],
    };

    const { data } = await axios.post("http://localhost:3000/api/venda", payload, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        }
    });

    return data;
}

module.exports = { sendVendaToMiddleware };