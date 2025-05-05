<!-- @format -->

# 🛒 Projeto de Automação de Vendas ERP (PostgreSQL + Node.js)

## ✨ Objetivo Geral

Desenvolver uma automação local que:

- Insere vendas automáticas no ERP (`vendas` e `itens_venda`)
- Atualiza estoque corretamente (`estoque_empresa_saldo`)
- Garante emissão de NFC-e sem interação manual
- Controla ajustes de valor de venda (acréscimo/desconto)

## 💡 Fluxo Geral Atualizado

- Selecionar valor-alvo de venda (valor fornecido via script)
- Buscar produtos com estoque disponível (qualquer saldo positivo)
- Formar venda combinando produtos aleatoriamente para atingir o valor-alvo
- Inserir venda na tabela `vendas` (incluindo campos de ajuste)
- Inserir itens na tabela `itens_venda`
- Atualizar estoque auxiliar (`estoque_empresa_saldo`)
- Exportar venda gerada em formato `.json` para registro
- Repetir ciclo para o próximo valor disponível

## 📊 Tabelas Envolvidas

| Tabela                | Função                          |
| --------------------- | ------------------------------- |
| vendas                | Registro principal da venda     |
| itens_venda           | Registro dos produtos vendidos  |
| estoque_empresa_saldo | Controle de estoque auxiliar    |
| produto               | Consulta de preços e descrições |

## 🛠️ Tecnologias Utilizadas

- **Node.js**: Backend da automação
- **PostgreSQL**: Banco de dados principal
- **pg**: Biblioteca de acesso ao PostgreSQL no Node.js
- **fs (Node)**: Exportação de logs e arquivos JSON
- **Jest**: Testes automatizados
- **Electron.js** (planejado): Painel Desktop futuramente

## 📦 Funcionalidades Atuais

- Seleção de produtos aleatória para a formação da venda
- Controle de quantidades múltiplas por produto
- Ajuste automático de valores:
  - Se faltar valor → `ven_arredonda` (acréscimo)
  - Se ultrapassar valor → `ven_desconto`
- Exportação automática de cada venda para `/exports` em `.json`
- Rollback automático caso não seja possível montar a venda
- Log de cada venda gerada na pasta `/logs`
- Testes de integração automatizados (Jest)

## 🔥 Plano de Desenvolvimento

### ✅ Fase 1: Core do Projeto (Concluído)

- Conectar ao banco PostgreSQL
- Buscar produtos disponíveis
- Selecionar valor de venda
- Montar combinação de venda aleatória
- Inserir pedido em `vendas`
- Inserir itens em `itens_venda`
- Atualizar estoque
- Exportar logs e JSONs
- Testes automatizados básicos com Jest

### ⏳ Fase 2: Painel Desktop (Em breve)

- Construir painel de controle com Electron.js
- Interface gráfica para:
  - Inserir valores de venda
  - Verificar produtos disponíveis
  - Consultar vendas geradas
  - Monitorar logs e status

### ⏳ Fase 3: Aprimoramentos futuros

- Configurar conexões múltiplas
- Agendamento automático de vendas
- Controle manual de ajustes
- Dashboards simples de acompanhamento

## 🔧 Observações Técnicas

- Estoque precisa ser positivo (> 10) para vender.
- Venda deve ser criada com relacionamento correto (`ven_cod_pedido` →
  `itens_venda`).
- Se não for possível atingir o valor-alvo, a venda é cancelada e não deixa lixo
  no banco (rollback).
- Todas as inserções respeitam constraints, triggers e regras do ERP.

## 📌 Primeira Ação de Interface (próximos passos)

- Iniciar estrutura base do Electron.js
- Conectar frontend (Electron) ao backend (Node.js)
- Começar com uma tela simples de controle de vendas

## 📚 Histórico de Atualizações Recentes

- ✅ Correção de trigger `p999_trg_computed_itens_venda` 
'./trigger_blindagem_padrao.md'

- ✅ Ajustes de proteção contra divisões por zero
- ✅ Adição de exportação em JSON automático
- ✅ Rollback automático em falhas
- ✅ Suporte a múltiplas quantidades por produto
- ✅ Seleção de produtos aleatória
- ✅ Arredondamento e desconto automático no pedido
- ✅ Testes unitários e integração inicial com Jest

## 🚀 Resumo Executivo Atual

| Ordem | Etapa                                        |
| ----- | -------------------------------------------- |
| 1     | Inserir venda em `vendas`                    |
| 2     | Inserir produtos em `itens_venda`            |
| 3     | Atualizar estoque em `estoque_empresa_saldo` |
| 4     | Exportar log e JSON                          |
| 5     | Repetir para próximo valor-alvo              |
