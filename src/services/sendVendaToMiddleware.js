const { getCodigoEgestorPorCodigoProprio } = require("../cache/cacheProdutos.js");
const { setToken } = require("./tokenManager.js");
const axios = require("axios");

async function sendVendaToMiddleware(venda, itens) {
    const token = await setToken();

    if (!token) {
        throw new Error("Token não retornado após chamada ao setToken()");
    }

    const produtosPayload = [];

    for (const item of itens) {
        const codProprio = (item.pro_codigo || item.pro_codigo_or || item.codProduto || "").toString();

        const codEgestor = await getCodigoEgestorPorCodigoProprio(codProprio, token);

        if (!codEgestor) {
            console.error("❌ Código próprio não encontrado:", codProprio);
            console.error("📦 Cache atual:", [...require("../cache/cacheProdutos").cache.entries()]);
            throw new Error(`Produto não encontrado no eGestor: ${codProprio}`);
        }

        const precoUnit = parseFloat(item.ite_valor_unit);
        produtosPayload.push({
            codProduto: codEgestor,
            quant: Number(item.ite_qtd) || 1,
            preco: isNaN(precoUnit) ? 1 : precoUnit,
            vDesc: 0,
            deducao: 0,
            obs: item.obs || "",
        });
    }

    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split("T")[0];

    // Opcionalmente você pode calcular um dia à frente:
    const dataCompensacao = new Date(hoje);
    dataCompensacao.setDate(dataCompensacao.getDate() + 1);
    const dtComp = dataCompensacao.toISOString().split("T")[0];

    const totalVenda = produtosPayload.reduce((acc, item) => acc + (item.quant * item.preco), 0);

    const payload = {
        codContato: 1,
        codVendedor: venda.cod_vendedor || 1,
        dtVenda: dataFormatada,
        dtEntrega: dataFormatada,
        situacao: 50,
        tags: ["VENDA_VIA_ELECTRON"],
        valorFrete: 0,
        valorDesc: venda.desconto || 0,
        valorDespesasAcessorias: 0,
        clienteFinal: 1,
        enderecoEntrega: 1,
        situacaoOS: "Em espera",
        customizado: {
            xCampo1: "",
            xCampo2: "",
            xCampo3: "",
            xCampo4: "",
        },
        produtos: produtosPayload,
        financeiros: [
            {
                dtVenc: dataFormatada,
                dtComp: dtComp,
                pago: true,
                codFormaPgto: 1,
                codPlanoContas: 1,
                codCaixa: 1,
                valor: totalVenda,
                tags: ["AUTOMATICA", "API"],
                descricao: "Cobrança da venda via Electron",
            },
        ],
        despesas: [],
    };

    console.log("Payload montado:");
    console.log(JSON.stringify(payload, null, 2));
    try {

        const { data } = await axios.post("http://localhost:5000/api/venda", payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            }
        });

        return data;
    } catch (err) {
        const msg = err?.response?.data || err.message;
        console.error("❌ Erro ao enviar venda para API:", msg);
        throw new Error(`Erro no envio da venda: ${JSON.stringify(msg)}`);
    }
}

module.exports = { sendVendaToMiddleware };
