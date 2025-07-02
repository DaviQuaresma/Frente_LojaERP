/** @format */

const botao = document.getElementById("botaoCriar");
const inputValor = document.getElementById("valor");
const resultado = document.getElementById("resultado");
const erroEstoqueLista = document.getElementById("errosEstoque");
const bancoSelect = document.getElementById("selectBancoSalvo");
const btnAtivarBanco = document.getElementById("btnAtivarBanco");

let paginaAtual = 1;
const limitePorPagina = 10;
let produtosSemEstoque = [];

// Atualiza nome da empresa no topo
async function atualizarTituloEmpresa() {
	try {
		const config = await window.electronAPI.getDatabaseConfig();
		const nomeBanco = config?.ativo || "Painel ERP";
		document.getElementById("tituloEmpresa").textContent = nomeBanco;
	} catch (e) {
		console.warn("⚠️ Erro ao atualizar nome do banco:", e);
	}
}

document
	.getElementById("salvar-config-banco")
	.addEventListener("click", async () => {
		const host = document.getElementById("cfg-host").value.trim();
		const port = parseInt(document.getElementById("cfg-port").value.trim());
		const user = document.getElementById("cfg-user").value.trim();
		const password = document.getElementById("cfg-password").value.trim();
		const database = document.getElementById("cfg-database").value.trim();
		const statusDiv = document.getElementById("configStatus");

		if (!host || !port || !user || !password || !database) {
			statusDiv.textContent = "❌ Preencha todos os campos.";
			statusDiv.className = "text-danger fw-bold text-center mt-3";
			return;
		}

		const config = { host, port, user, password, database };

		// Testa a conexão
		const resultado = await window.electronAPI.salvarConfigBanco(config);

		if (!resultado.success) {
			statusDiv.textContent = `❌ Erro: ${resultado.error}`;
			statusDiv.className = "text-danger fw-bold text-center mt-3";
			return;
		}

		// Busca configuração atual do arquivo db_settings.json
		const configAtual = await window.electronAPI.getDatabaseConfig();

		// Salva como novo banco e define como ativo
		const novoConfig = {
			salvos: {
				...(configAtual.salvos || {}),
				[database]: config,
			},
			ativo: database,
		};

		await window.electronAPI.setDatabaseConfig(novoConfig);

		statusDiv.textContent = "✅ Conexão testada e salva com sucesso!";
		statusDiv.className = "text-success fw-bold text-center mt-3";

		await atualizarTituloEmpresa(); // <- aqui

		setTimeout(() => {
			ativacaoStatus.textContent = "";
			ativacaoStatus.classList.remove("text-success");
		}, 4000);

		// Atualiza o select de bancos
		const select = document.getElementById("selectBancoSalvo");
		select.innerHTML = "";
		Object.entries(novoConfig.salvos).forEach(([nome, dados]) => {
			const option = document.createElement("option");
			option.value = nome;
			option.textContent = `${nome} (${dados.database})`;
			select.appendChild(option);
		});
	});

// Busca dados de um produto no banco
async function buscarProduto(pro_codigo) {
	try {
		const resultado = await window.electronAPI.buscarProduto(pro_codigo);
		if (resultado?.rows?.length) {
			return resultado.rows[0];
		}
	} catch (e) {
		console.warn("⚠️ Erro ao buscar produto:", e);
	}
	return null;
}

// Processar vendas
botao.addEventListener("click", async () => {
	const valoresStr = inputValor.value;
	resultado.classList.remove("text-danger", "text-success", "text-warning");
	resultado.innerHTML = "";
	erroEstoqueLista.innerHTML = "";
	produtosSemEstoque = [];

	if (!valoresStr.trim()) {
		resultado.innerHTML = "❌ Informe ao menos um valor válido.";
		resultado.classList.add("text-danger");
		return;
	}

	const valores = valoresStr
		.split(",")
		.map((v) => parseFloat(v.trim()))
		.filter((v) => !isNaN(v) && v > 0);

	if (!valores.length) {
		resultado.innerHTML = "❌ Nenhum valor válido detectado.";
		resultado.classList.add("text-danger");
		return;
	}

	botao.disabled = true;
	resultado.innerHTML = "<ul class='list-unstyled'>";

	for (const valor of valores) {
		try {
			const resposta = await window.electronAPI.criarVenda(valor);

			if (resposta?.success === true) {
				resultado.innerHTML += `<li class="text-success">✅ <strong>Venda de R$ ${valor.toFixed(
					2
				)}</strong> criada com sucesso!</li>`;
			} else if (resposta?.semEstoque?.length) {
				produtosSemEstoque.push(...resposta.semEstoque);
				resultado.innerHTML += `<li class="text-warning">⚠️ <strong>Sem estoque</strong> para R$ ${valor.toFixed(
					2
				)}: ${resposta?.message || "Produto(s) insuficientes"}</li>`;

				await window.electronAPI.registrarHistoricoFalha({
					total: valor,
					itens: 0,
					tipo: "falha",
					produtos: resposta.semEstoque?.map((p) => p.descricao) || [],
					data: new Date().toISOString(),
				});
			} else {
				resultado.innerHTML += `<li class="text-danger">❌ <strong>Erro</strong> ao criar R$ ${valor.toFixed(
					2
				)}: ${resposta?.message || "Erro desconhecido"}</li>`;
			}
		} catch (err) {
			resultado.innerHTML += `<li class="text-danger">❌ <strong>Erro inesperado</strong> ao gerar R$ ${valor.toFixed(
				2
			)}: ${err.message || err}</li>`;
		}
	}

	resultado.innerHTML += `</ul><div class="alert alert-success mt-3">✅ <strong>Processamento finalizado.</strong></div>`;
	botao.disabled = false;

	if (produtosSemEstoque.length) {
		const codigosUnicos = [
			...new Set(produtosSemEstoque.map((p) => p.pro_codigo)),
		];

		erroEstoqueLista.innerHTML = `
			<div class="alert alert-warning mt-4">
				<h5 class="mb-3">⚠️ Produtos sem estoque suficiente:</h5>
				<div class="table-responsive">
					<table class="table table-sm table-bordered">
						<thead class="table-light">
							<tr>
								<th>Código</th>
								<th>Descrição</th>
								<th>Estoque atual</th>
							</tr>
						</thead>
						<tbody id="tabelaSemEstoque"></tbody>
					</table>
				</div>
			</div>`;

		const tbody = document.getElementById("tabelaSemEstoque");
		for (const codigo of codigosUnicos) {
			const produto = await buscarProduto(codigo);
			if (produto) {
				tbody.innerHTML += `<tr>
					<td>${produto.pro_codigo}</td>
					<td>${produto.pro_descricao}</td>
					<td>${produto.estoque}</td>
				</tr>`;
			} else {
				tbody.innerHTML += `<tr>
					<td>${codigo}</td>
					<td colspan="2">Produto não encontrado</td>
				</tr>`;
			}
		}
	}

	await carregarHistorico();
});

// Atualiza histórico exibindo também falhas
async function carregarHistorico() {
	const tabela = document.getElementById("tabelaVendas");
	const orderBy = document.getElementById("filtroOrderBy")?.value || "data";
	const direction = document.getElementById("filtroDirection")?.value || "desc";

	tabela.innerHTML = `<tr><td colspan="4" class="text-center">Carregando...</td></tr>`;

	try {
		const { total, vendas } = await window.electronAPI.listarVendas({
			orderBy,
			direction,
			page: paginaAtual,
			limit: limitePorPagina,
		});

		if (!vendas.length) {
			tabela.innerHTML = `<tr><td colspan="4" class="text-center">Nenhuma venda encontrada.</td></tr>`;
			return;
		}

		tabela.innerHTML = vendas
			.map((v) => {
				if (v.tipo === "falha") {
					return `
					<tr class="table-warning">
						<td>⚠️</td>
						<td>R$ ${v.total.toFixed(2)}</td>
						<td colspan="2">Falha: sem estoque para ${v.produtos?.join(", ")}</td>
					</tr>`;
				} else {
					return `
					<tr>
						<td>${v.id}</td>
						<td>R$ ${v.total}</td>
						<td>${v.qtdItens}</td>
						<td>${v.data}</td>
					</tr>`;
				}
			})
			.join("");

		renderizarPaginacao(total);
	} catch (err) {
		console.error(err);
		tabela.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erro ao carregar histórico.</td></tr>`;
	}
}

// 🔢 Paginação
function renderizarPaginacao(total) {
	const container = document.getElementById("paginacaoContainer");
	const totalPaginas = Math.ceil(total / limitePorPagina);

	let html = "";

	if (paginaAtual > 1) {
		html += `<button class="btn btn-sm btn-outline-primary me-2" onclick="mudarPagina(${paginaAtual - 1
			})">Anterior</button>`;
	}

	for (let i = 1; i <= totalPaginas; i++) {
		html += `<button class="btn btn-sm ${i === paginaAtual ? "btn-primary" : "btn-outline-secondary"
			} mx-1" onclick="mudarPagina(${i})">${i}</button>`;
	}

	if (paginaAtual < totalPaginas) {
		html += `<button class="btn btn-sm btn-outline-primary ms-2" onclick="mudarPagina(${paginaAtual + 1
			})">Próxima</button>`;
	}

	container.innerHTML = html;
}

window.mudarPagina = function (novaPagina) {
	paginaAtual = novaPagina;
	carregarHistorico();
};

// 🧭 Inicializa
carregarHistorico();
atualizarTituloEmpresa();

document.addEventListener("DOMContentLoaded", async () => {
	const label = document.getElementById("ambienteLabel");
	const botao = document.getElementById("botaoAmbiente");

	const ambiente = await window.electronAPI.getAmbienteAtual();

	if (ambiente === "production") {
		label.textContent = "Produção";
		botao.classList.remove("btn-warning");
		botao.classList.add("btn-success");
	} else {
		label.textContent = "Homologação";
		botao.classList.remove("btn-success");
		botao.classList.add("btn-warning");
	}

	botao.addEventListener("click", async () => {
		const novo = ambiente === "production" ? "development" : "production";
		await window.electronAPI.setAmbiente(novo);
		window.location.reload();
	});
});

document.addEventListener("DOMContentLoaded", async () => {
	const selectBanco = document.getElementById("selectBancoSalvo");
	const btnAtivar = document.getElementById("btnAtivarBanco");
	const ativacaoStatus = document.getElementById("ativacaoStatus");

	const configAtual = await window.electronAPI.getDatabaseConfig();

	if (configAtual && configAtual.salvos) {
		selectBanco.innerHTML = "";
		Object.entries(configAtual.salvos).forEach(([nome, dados]) => {
			const option = document.createElement("option");
			option.value = nome;
			option.textContent = `${nome} (${dados.database})`;
			selectBanco.appendChild(option);
		});
	} else {
		selectBanco.innerHTML = `<option disabled>Nenhum banco salvo</option>`;
	}

	btnAtivar.addEventListener("click", async () => {
		const selecionado = selectBanco.value;
		if (!selecionado) return;

		const novoConfig = {
			...(await window.electronAPI.getDatabaseConfig()),
			ativo: selecionado,
		};

		await window.electronAPI.setDatabaseConfig(novoConfig);

		await atualizarTituloEmpresa();

		ativacaoStatus.textContent = `✅ Banco "${selecionado}" ativado com sucesso.`;
		ativacaoStatus.classList.add("text-success");
	});
});

document.getElementById('btnSyncProducts').addEventListener('click', async () => {
	const btn = document.getElementById('btnSyncProducts');
	const status = document.getElementById('syncStatus');

	btn.disabled = true;
	status.textContent = '🔄 Sincronizando produtos...';

	try {
		const result = await window.electronAPI.syncProducts();
		if (result.ok) {
			status.textContent = '✅ Produtos sincronizados com sucesso!';
			status.classList.remove('text-danger');
			status.classList.add('text-success');
		} else {
			status.textContent = `❌ Erro: ${result.error || 'Falha desconhecida'}`;
			status.classList.remove('text-success');
			status.classList.add('text-danger');
		}
	} catch (err) {
		status.textContent = `❌ Erro inesperado: ${err.message}`;
		status.classList.add('text-danger');
	} finally {
		btn.disabled = false;
	}
});