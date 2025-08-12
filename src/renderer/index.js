/** @format */

const botao = document.getElementById("botaoCriar");
const inputValor = document.getElementById("valor");
const resultado = document.getElementById("resultado");
const erroEstoqueLista = document.getElementById("errosEstoque");
const bancoSelect = document.getElementById("selectBancoSalvo");
const btnAtivarBanco = document.getElementById("btnAtivarBanco");
const btnDeletarBanco = document.getElementById("btnDeletarBanco");

let paginaAtual = 1;
const limitePorPagina = 10;
let produtosSemEstoque = [];

// Atualiza nome da empresa no topo
async function atualizarTituloEmpresa(databaseName) {
	try {
		const nomeBanco = databaseName || "Painel ERP";
		document.getElementById("tituloEmpresa").textContent = nomeBanco;
	} catch (e) {
		console.warn("⚠️ Erro ao atualizar nome do banco:", e);
	}
}

document.getElementById("btnSalvarTudo").addEventListener("click", async () => {
	await salvarBancoEToken();
});

async function salvarBancoEToken() {
	const host = document.getElementById("cfg-host").value.trim();
	const port = parseInt(document.getElementById("cfg-port").value.trim());
	const user = document.getElementById("cfg-user").value.trim();
	const password = document.getElementById("cfg-password").value.trim();
	const database = document.getElementById("cfg-database").value.trim();
	const token = document.getElementById("cfg-token").value.trim();
	const name = database;

	const statusDiv = document.getElementById("configStatus");
	const config = { host, port, user, password, database };
	const resultado = await window.electronAPI.salvarConfigBanco(config);

	if (!name, !host || !port || !user || !password || !database || !token) {
		statusDiv.textContent = "❌ Preencha todos os campos do banco.";
		statusDiv.className = "text-danger fw-bold text-center mt-3";
		return;
	}

	if (!resultado.success) {
		statusDiv.textContent = `❌ Erro ao conectar no banco: ${resultado.error}`;
		statusDiv.className = "text-danger fw-bold text-center mt-3";
		return;
	}

	const result = await window.electronAPI.testarTokenParaBancoAtivo(token);
	if (!result.ok) {
		statusDiv.textContent = `❌ Erro ao validar token: ${result.error}`;
		statusDiv.className = "text-danger fw-bold text-center mt-3";
		return;
	}

	await fetch("http://localhost:5001/api/database", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, host, port, user, password, database, token }),
	});

	statusDiv.textContent = "✅ Configuração salva com sucesso!";
	statusDiv.className = "text-success fw-bold text-center mt-3";

	await atualizarTituloEmpresa(name);
	await atualizarDropdownBancos();
}

async function atualizarDropdownBancos() {
	const select = document.getElementById("selectBancoSalvo");
	select.innerHTML = "";

	try {
		const bancos = await fetch("http://localhost:5001/api/database").then(res => res.json());

		bancos.forEach(c => {
			const option = document.createElement("option");
			option.value = c.database;
			option.textContent = `${c.database}`;
			select.appendChild(option);
		});
	} catch (e) {
		select.innerHTML = `<option disabled>Erro ao carregar bancos</option>`;
	}
}

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

const btnSync = document.getElementById('btnSyncProducts');
const status = document.getElementById('syncStatus');
const btnCancelar = document.getElementById('cancelSync');

function showStatus(message, type = 'muted') {
	status.textContent = message;
	status.classList.remove('text-muted', 'text-success', 'text-danger');
	status.classList.add(`text-${type}`);
	status.style.opacity = 1;
}

function hideStatus() {
	status.style.opacity = 0;
	setTimeout(() => {
		status.textContent = '';
	}, 300);
}

btnSync.addEventListener('click', async () => {
	btnSync.disabled = true;
	btnCancelar.disabled = false;

	showStatus('🔄 Sincronizando produtos...', 'muted');

	try {
		const result = await window.electronAPI.syncProducts();

		if (result.ok) {
			showStatus('✅ Produtos sincronizados com sucesso!', 'success');
		} else {
			showStatus(`❌ Erro: ${result.error || 'Falha desconhecida'}`, 'danger');
		}
	} catch (err) {
		showStatus(`❌ Erro inesperado: ${err.message}`, 'danger');
	} finally {
		btnSync.disabled = false;
		btnCancelar.disabled = true;

		setTimeout(hideStatus, 4000);
	}
});

btnCancelar.addEventListener('click', () => {
	window.electronAPI.cancelSync();
	showStatus('⚠️ Sincronização cancelada pelo usuário.', 'danger');
});

document.addEventListener("DOMContentLoaded", async () => {
	const selectBanco = document.getElementById("selectBancoSalvo");
	const btnAtivar = document.getElementById("btnAtivarBanco");
	const btnDeletar = document.getElementById("btnDeletarBanco");
	const ativacaoStatus = document.getElementById("ativacaoStatus");

	await atualizarDropdownBancos();

	btnAtivar.addEventListener("click", async () => {
		const databaseLocal = selectBanco.value;
		if (!databaseLocal) return;

		const databaseId = await fetch(`http://localhost:5001/api/database/${databaseLocal}`).then(res => res.json());

		if (!databaseId) console.log('Banco id não encontrado', databaseId)

		const bancoSelecionado = databaseId.database;

		if (!bancoSelecionado) {
			ativacaoStatus.textContent = "❌ Banco selecionado não encontrado.";
			ativacaoStatus.className = "text-danger fw-bold text-center mt-3";
			return;
		}

		const resElectron = await window.electronAPI.setBancoAtivo(bancoSelecionado);
		if (!resElectron?.success) {
			ativacaoStatus.textContent = `Erro ao ativar banco: ${resElectron.message}`;
			ativacaoStatus.className = "text-danger fw-bold text-center mt-3";
			return;
		}

		await atualizarTituloEmpresa(bancoSelecionado);

		ativacaoStatus.textContent = `✅ Banco "${bancoSelecionado}" ativado com sucesso.`;
		ativacaoStatus.className = "text-success fw-bold text-center mt-3";
	});

	btnDeletar.addEventListener("click", async () => {
		const databaseLocal = selectBanco.value;
		if (!databaseLocal) return;

		try {
			const res = await fetch(`http://localhost:5001/api/database/${databaseLocal}`);
			const database = await res.json();

			if (!database || !database.database) {
				console.log('Banco id não existe ou não encontrado');
				return;
			}

			const databaseName = database.database;

			const databaseDelete = await fetch(`http://localhost:5001/api/database/${databaseName}`, {
				method: 'DELETE'
			});

			if (!databaseDelete.ok) {
				throw new Error(`Erro ao deletar o banco ${databaseName}.`);
			}

			console.log(`Banco ${databaseName} apagado com sucesso`);

			await atualizarTituloEmpresa(databaseName);
			ativacaoStatus.textContent = `✅ Banco "${databaseName}" apagado com sucesso.`;
			ativacaoStatus.className = "text-success fw-bold text-center mt-3";

		} catch (err) {
			console.error("Erro ao deletar banco:", err);
			ativacaoStatus.textContent = `❌ Erro ao apagar o banco: ${err.message}`;
			ativacaoStatus.className = "text-danger fw-bold text-center mt-3";
		}
	});

});