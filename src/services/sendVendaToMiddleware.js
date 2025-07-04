const axios = require("axios");

async function sendVendaToMiddleware(venda, itens) {

    console.log("Cliente da venda:", venda.cod_cliente);
    console.log("Itens da venda:", itens);
    
    try {
        const payload = {
            codContato: venda.cod_cliente || 1,
            codVendedor: venda.cod_vendedor || 1,
            dtVenda: venda.data,
            situacao: 50,
            valorDesc: venda.desconto,
            valorFrete: 0,
            clienteFinal: 1,
            tags: ["VENDA_VIA_ELECTRON"],
            produtos: itens.map((item) => ({
                codProduto: item.codProduto,
                quant: item.quantidade,
                preco: item.preco,
                obs: item.obs || "",
            })),
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

        const { data } = await axios.post("http://localhost:3000/api/venda", payload);
        return data;

    } catch (error) {
        console.error("[sendVendaToMiddleware] Erro ao enviar venda:", error?.response?.data || error.message);
        throw error;
    }
}

module.exports = { sendVendaToMiddleware };
