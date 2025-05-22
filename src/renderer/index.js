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

// 🔁 XMLs - Inicialização
const tabelaXmls = document.getElementById("tabelaXmls");
const checkAllXmls = document.getElementById("checkAllXmls");
const btnBaixar = document.getElementById("baixarSelecionados");
const btnExcluir = document.getElementById("excluirSelecionados");
const btnExcluirTodos = document.getElementById("excluirTodos");

// Chama carregarXmls ao clicar na aba XMLs Geradas
document.querySelector("#xml-tab")?.addEventListener("click", carregarXmls);

function atualizarBotoesXml() {
  const selecionados = document.querySelectorAll(".check-xml:checked");
  const algumMarcado = selecionados.length > 0;
  btnBaixar.disabled = !algumMarcado;
  btnExcluir.disabled = !algumMarcado;
}

function renderizarXmls(xmls) {
  if (!xmls.length) {
    tabelaXmls.innerHTML = `
      <tr>
        <td colspan="5" class="text-center">Nenhum XML encontrado.</td>
      </tr>
    `;
    return;
  }

  tabelaXmls.innerHTML = xmls
    .map((xml) => {
      const data = new Date(xml.data).toLocaleString("pt-BR");
      const tamanhoKB = (xml.tamanho / 1024).toFixed(1) + " KB";
      return `
        <tr>
          <td><input type="checkbox" class="check-xml" value="${xml.nome}" /></td>
          <td>${xml.nome}</td>
          <td>${tamanhoKB}</td>
          <td>${data}</td>
          <td>
            <button class="btn btn-sm btn-outline-danger btnExcluirUnico" data-nome="${xml.nome}">
              Excluir
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll(".check-xml").forEach((el) => {
    el.addEventListener("change", atualizarBotoesXml);
  });

  document.querySelectorAll(".btnExcluirUnico").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const nome = btn.dataset.nome;
      await window.electronAPI.excluirXmls([nome]);
      await carregarXmls();
    });
  });
}

async function carregarXmls() {
  const lista = await window.electronAPI.listarXmls();
  renderizarXmls(lista);
  checkAllXmls.checked = false;
  atualizarBotoesXml();
}

checkAllXmls?.addEventListener("change", () => {
  const marcar = checkAllXmls.checked;
  document.querySelectorAll(".check-xml").forEach((el) => {
    el.checked = marcar;
  });
  atualizarBotoesXml();
});

btnBaixar?.addEventListener("click", async () => {
  const arquivos = Array.from(
    document.querySelectorAll(".check-xml:checked")
  ).map((el) => el.value);

  const sucesso = await window.electronAPI.baixarXmls(arquivos);

  const status =
    document.getElementById("statusXml") || document.createElement("div");
  status.id = "statusXml";
  status.className = "text-center fw-bold mt-3";
  status.textContent = sucesso
    ? "✅ XMLs baixados com sucesso!"
    : "❌ Erro ao baixar XMLs.";
  status.classList.add(sucesso ? "text-success" : "text-danger");

  tabelaXmls.parentElement.appendChild(status);

  setTimeout(() => status.remove(), 4000);
});

btnExcluir?.addEventListener("click", async () => {
  const arquivos = Array.from(
    document.querySelectorAll(".check-xml:checked")
  ).map((el) => el.value);
  await window.electronAPI.excluirXmls(arquivos);
  await carregarXmls();
});

btnExcluirTodos?.addEventListener("click", async () => {
  await window.electronAPI.excluirTodosXmls();
  await carregarXmls();
});

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
    html += `<button class="btn btn-sm btn-outline-primary me-2" onclick="mudarPagina(${
      paginaAtual - 1
    })">Anterior</button>`;
  }

  for (let i = 1; i <= totalPaginas; i++) {
    html += `<button class="btn btn-sm ${
      i === paginaAtual ? "btn-primary" : "btn-outline-secondary"
    } mx-1" onclick="mudarPagina(${i})">${i}</button>`;
  }

  if (paginaAtual < totalPaginas) {
    html += `<button class="btn btn-sm btn-outline-primary ms-2" onclick="mudarPagina(${
      paginaAtual + 1
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

document
  .getElementById("btnSelecionarCertificado")
  ?.addEventListener("click", async () => {
    const caminho = await window.electronAPI.selecionarCertificado();
    if (caminho) {
      document.getElementById("cfg-certificado").value = caminho;
    }
  });

document
  .getElementById("salvar-config-certificado")
  .addEventListener("click", async () => {
    const caminho = document.getElementById("cfg-certificado").value;
    const senha = document.getElementById("cfg-cert-senha").value;
    const status = document.getElementById("certStatus");

    status.textContent = "";
    status.className = "text-center fw-bold mt-3";

    if (!caminho || !senha) {
      status.textContent = "⚠️ Preencha caminho e senha.";
      status.classList.add("text-danger");
      return;
    }

    const resultado = await window.electronAPI.definirCertificado({
      caminho,
      senha,
    });

    if (resultado?.success) {
      status.textContent = "✅ Certificado válido!";
      status.classList.add("text-success");
    } else {
      status.textContent = `❌ ${
        resultado?.message || "Erro ao validar certificado."
      }`;
      status.classList.add("text-danger");
    }
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
