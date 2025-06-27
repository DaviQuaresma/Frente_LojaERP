/** @format */

const fs = require("fs");
const extractFromPfx = require("./extractPfx");

const {
	getEmpresaData,
	getVendaById,
	getItensVendaByPedido,
} = require("../utils/dbCommands");

const { getNewClient } = require("../db/getNewClient");

module.exports = async function fiscalMain(vendaID, certificadoManual) {
	const emp_codigo = 1;
	const connection = await getNewClient();

	// 📦 Coleta de dados
	const empresa = await getEmpresaData(connection, emp_codigo);
	const venda = await getVendaById(connection, vendaID);
	const itens = await getItensVendaByPedido(connection, vendaID);
	const { caminho, senha } = certificadoManual;
	const { getAmbienteAtual } = require("../config/envControl");

	// 🔐 Leitura e extração do certificado
	const pfxBuffer = fs.readFileSync(caminho);
	const { privateKeyPem, certificatePem } = extractFromPfx(
		pfxBuffer,
		senha.trim()
	);

	// 🧱 Geração do XML base
	const xml = generateXml(dados).trim();

	// 🔐 Assinatura do XML
	const assinado = assinarXml(xml, privateKeyPem, certificatePem, dados.chave);

	// 📡 Envio para SEFAZ
	const resposta = await enviarXmlParaSefaz(
		conteudoFinal,
		certificatePem,
		privateKeyPem
	);

};
