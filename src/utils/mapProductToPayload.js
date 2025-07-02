function mapProductToPayload(produto) {
    return {
        descricao: produto.pro_descricao,
        codigoProprio: String(produto.pro_codigo),
        codCategoria: 1,
        estoque: parseFloat(produto.estoque),
        estoqueMinimo: 0,
        controlarEstoque: true,
        margemLucro: Number(produto.pro_lucro) || 0,
        precoCusto: parseFloat(produto.pro_preco_custo),
        precoVenda: parseFloat(produto.pro_preco_venda),
        origemFiscal: 0,
        unidadeTributada: produto.pro_unidade || 'UN',
        refEanGtin: produto.pro_codigo_ean || '',
        ncm: produto.pro_codigo_fiscal || '',
        codigoCEST: '',
        excecaoIPI: 7,
        codigoGrupoTributos: 0,
        anotacoesNFE: '',
        anotacoesInternas: '',
        pesoBruto: parseFloat(produto.pro_peso_bruto) || 0,
        pesoLiquido: parseFloat(produto.pro_peso) || 0,
        tags: ['sincronizado'],
    };
}

module.exports = mapProductToPayload