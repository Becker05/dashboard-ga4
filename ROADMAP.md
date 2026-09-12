# Dashboard GA4 — plano de evolução do produto

Atualizado em 12/09/2026. Documento de referência para escopo, prioridades e aceite.

## Objetivo

Entregar um aplicativo comercial de consulta e apoio à decisão de investimento em tráfego, com acesso por cliente, metas por propriedade e período, resultados comparáveis e indicação da confiabilidade dos dados. Servir tanto clientes de tracking quanto compradores independentes do relatório.

O produto deve responder: como estamos perante a meta, o que mudou, onde está a oportunidade ou perda e qual ação merece avaliação. Recomendações são apoio ao gestor; o aplicativo não altera orçamento de anúncios automaticamente.

## Decisões já definidas

- Uma aplicação e um repositório para todos os clientes.
- GitHub guarda código, documentação e configuração de implantação; metas, usuários e dados comerciais ficam no banco.
- Um cliente pode ter várias propriedades GA4 e vários usuários; um usuário pode participar de mais de um cliente.
- Metas pertencem à combinação cliente + propriedade + mês, nunca somente ao e-mail.
- Papéis: administrador da plataforma, gestor do cliente e visualizador.
- Gestor edita metas autorizadas; visualizador consulta; administrador gerencia clientes, propriedades e acesso.
- Cadastro e liberação comercial manuais na primeira versão; cobrança automática fica para depois.
- Uso independente com GA4 nativo; recursos de atribuição auxiliar dependem das dimensões disponíveis.
- Valores ausentes não equivalem a zero. Metas e custos ausentes não recebem avaliação positiva ou negativa.
- Atribuição auxiliar e nativa são perspectivas diferentes; suas receitas não são somadas.
- Investimento dividido por compras será chamado CPA. CAC exige novos clientes identificados.

## Estado atual e limites da evidência

O código da versão ef19dd3 contém relatórios nativos, quatro tabelas de atribuição auxiliar e chamada ao funil sequencial. A versão foi publicada e passou em verificação de sintaxe. Isso não equivale a validação funcional completa com API e navegador.

O app consulta allowed_users no Firestore e usa OAuth Google para consultar GA4. As regras de segurança efetivas do banco não foram auditadas neste escopo. Antes de habilitar edição de metas, autenticação e autorização no banco precisam estar testadas.

As seis dimensões auxiliares foram identificadas pela API na propriedade 294956299. Isso não confirma preenchimento histórico ou disponibilidade de todos os relatórios em outras propriedades.

## Sequência de entregas

| Entrega | Resultado | Dependência | Estado |
| --- | --- | --- | --- |
| E0 — Confiabilidade | Métricas e falhas não induzem decisões erradas | Revisão do código e testes das consultas | Implementação inicial testada; conciliação real pendente |
| E1 — Clientes e metas | Acesso isolado, metas mensais compartilhadas e resumo executivo | E0; Firebase Auth e regras testadas | Versão mensal implementada; aceite do gestor pendente |
| E2 — Análise operacional | Campanhas, funis e produtos com filtros e comparações úteis | E0 e E1 | Planejada |
| E3 — Investimento | Custos completos e recomendações explicáveis | Fonte e cobertura dos custos confirmadas | Planejada |
| E4 — Operação comercial | Administração, planos, suporte e distribuição sustentável | E1 e piloto validado | Planejada |
| E5 — Rentabilidade | Receita conciliada, novos clientes e margem | Integrações com pedidos e custos do negócio | Evolução futura |

## E0 — Correções e validação da base

- [ ] Corrigir o KPI de abandono: não usar volume de add_to_cart menos compras como abandono de pessoas. Consultar sequência carrinho → compra especificamente para esse indicador.
- [ ] Quando a API de funil falhar, identificar a alternativa como volume de eventos e remover taxas e título de conversão sequencial.
- [ ] Renomear First Click/Last Click nativos conforme o escopo real das consultas: primeiro usuário e sessão. Não apresentar sessão como modelo de último clique.
- [ ] Alterar CAC atual para CPA; revisar numeradores, denominadores, devoluções e definição de compra em todos os KPIs.
- [ ] Remover limites universais de ROAS e conversão dos insights; usar metas configuradas ou indicar ausência de referência.
- [ ] Mostrar zero, sem dados, sem permissão, dimensão inexistente e erro de consulta como estados distintos.
- [ ] Consultar disponibilidade das dimensões por propriedade; falha em recurso opcional não impede relatório nativo.
- [ ] Paginar consultas quando necessário; mostrar truncamento, limiares e amostragem quando informados pela API.
- [ ] Revisar agregações: usuários não são somáveis indiscriminadamente; taxas devem usar denominadores corretos; custo não pode ser duplicado no cruzamento por região/produto.
- [ ] Proteger renderizações HTML contra conteúdo recebido de campanhas, produtos e demais dimensões.
- [ ] Validar cache por propriedade, período e consulta; limpar dados ao trocar cliente/logout; testar atualização do service worker.
- [ ] Testar consultas reais, erros parciais e renderização desktop/mobile; marcar implantação no histórico.

Aceite: cenários de API indisponível não geram ROAS zero ou falso funil; indicadores têm definição legível; valores de amostra são conciliados com consultas equivalentes do GA4.

## E1 — Primeira entrega de produto

### Modelo proposto

Coleções lógicas (o esquema definitivo será versionado junto da implementação):

- clients: nome, situação, plano e configurações comerciais.
- memberships: usuário autenticado, cliente e papel. Alteração de papel restrita à administração.
- clientProperties: propriedade GA4 autorizada dentro do cliente; moeda e fuso de referência.
- goals: cliente, propriedade, mês YYYY-MM, receita, orçamento de mídia, pedidos, ROAS mínimo e CPA máximo; versão, autor e datas.
- goalHistory: histórico das alterações com valores anteriores e novos.

Autorização da aplicação e permissão de leitura no GA4 são verificações separadas. Cadastro no produto não concede acesso ao Google Analytics. Identidade será verificada por autenticação, não por e-mail arbitrário enviado pelo navegador.

### Funcionalidades

- [ ] Login integrado à autenticação do banco, preservando o consentimento de leitura do GA4.
- [ ] Cadastro administrativo de cliente, usuários, papéis e propriedades.
- [ ] Migração controlada de allowed_users sem perder os acessos atuais; dry-run e cópia de segurança.
- [ ] Seleção de cliente/propriedade mostrando apenas os acessos autorizados.
- [ ] Tela Metas: selecionar mês, preencher campos, salvar, editar e copiar do mês anterior.
- [ ] Campos opcionais, números não negativos, moeda/fuso explícitos, estado sem meta e validação de inconsistências entre receita, orçamento e ROAS.
- [ ] Histórico de alterações e proteção contra sobrescrita simultânea.
- [ ] Resumo: realizado, meta, percentual atingido, desvio absoluto, comparação anterior e data da atualização.
- [ ] Orçamento realizado e ritmo de gasto; não avaliar cobertura incompleta como orçamento total consumido.
- [x] Comparar mês atual até hoje com igual número de dias do mês anterior; hoje parcial sinalizado. Ajustado por solicitação do gestor: esperado proporcional e desvio até a data, sem ratear ROAS/CPA. Meses anteriores completos.
- [ ] Para vários meses, somar metas monetárias e de pedidos; não somar ROAS/CPA. Para períodos parciais, apresentar rateio por dias explicitamente ou não comparar até definir a regra.
- [ ] Projeção mensal simples baseada em dias completos, apresentada como estimativa, sem garantia.
- [ ] Regras no banco impedem leitura/escrita entre clientes e edição por visualizador, mesmo por requisição direta.

Aceite: dois clientes com metas diferentes não veem nem alteram dados um do outro; dois gestores do mesmo cliente compartilham a meta; troca de propriedade muda todos os indicadores; metas anteriores permanecem consultáveis; campos não preenchidos não são convertidos em zero.

Fora desta entrega: cobrança automática, conexão direta com anúncios, credenciais de serviço no navegador e recomendações automáticas de verba.

## E2 — Relatório para consulta e diagnóstico

- [ ] Organizar navegação: Resumo, Campanhas, Funil, Produtos, Atribuição e Metas; Administração conforme papel.
- [ ] Filtros consistentes por período, origem/mídia, campanha e dispositivo; indicar filtros não aplicáveis em cada visão.
- [ ] Tabela pesquisável, ordenável e exportável; exportações preservam período, fonte e filtros.
- [ ] Campanhas: sessões, compras, receita, CPA e ROAS quando houver custo, conversão e participação.
- [ ] Separar compras por sessão de percentual de sessões com compra; nomear corretamente.
- [ ] Dois funis: jornada completa e carrinho → compra. Detalhar por dispositivo e dimensões compatíveis com a API.
- [ ] Produtos/categorias: visualizações, adições, compras e receita; validar compatibilidade de métricas item/evento antes do cruzamento com campanha.
- [ ] Atribuição auxiliar: first, last e matriz; detalhamento do funil quando suportado.
- [ ] Qualidade: cobertura dos parâmetros, not set por dimensão e período, frescor e divergências entre perspectivas.
- [ ] Histórico de mudanças de tracking e campanhas para explicar rupturas.
- [ ] Reduzir gráficos redundantes e disponibilizar detalhes sob demanda.

Aceite: cada visão responde a uma pergunta de negócio; filtros produzem resultados reproduzíveis; dados anteriores à implantação não são apresentados como falha da nova configuração.

## E3 — Investimento e decisão

- [ ] Definir fonte de custo por canal: API de mídia, importação no GA4 ou importação manual controlada.
- [ ] Mostrar origem, cobertura e última sincronização dos custos; nenhum canal ausente será interpretado como custo zero.
- [ ] Relacionar custos por IDs estáveis e dimensões compatíveis; tratar nomes alterados, moeda, fuso e intervalos de datas.
- [ ] Distinguir ROAS por atribuição do GA4, retorno informado pela mídia e receita total/investimento total; não somar receitas atribuídas entre plataformas.
- [ ] Tabela de decisão: candidato a escalar, manter, investigar ou dados insuficientes.
- [ ] Explicar cada indicação com meta, período, volume observado e qualidade dos dados.
- [ ] Exigir critérios configuráveis de amostra e janela de conversão antes de recomendar alteração; não usar uma compra isolada como prova.
- [ ] Quadrante eficiência × volume, ritmo de orçamento e tendências.
- [ ] Alertas de gasto sem resultado, queda de conversão e perda de cobertura; começar dentro do app.
- [ ] Integrações que exigem segredos/renovação persistente de tokens executam no servidor.

Aceite: total de custo concilia com fonte definida; recomendações ficam indisponíveis quando os requisitos não são atendidos; nenhuma indicação executa mudança em mídia.

## E4 — Comercialização e operação

- [ ] Planos e recursos independentes de cópias do código; acesso manual inicialmente.
- [ ] Suspensão/reativação de acesso, convites e desligamento de usuários.
- [ ] Onboarding verifica acesso GA4, moeda, fuso, dimensões e custos; orienta ausência de recursos opcionais.
- [ ] Venda apenas do relatório funciona sem attr_* e sem contrato de tracking.
- [ ] Regras de acesso a dados históricos após encerramento definidas antes da operação comercial.
- [ ] Ambiente de teste, implantação versionada, reversão, logs sem tokens/dados pessoais desnecessários e monitoramento de erros.
- [ ] Controle de custos da infraestrutura e de quotas por cliente; carregamento sob demanda.
- [ ] Documentação de uso, suporte, exportação e procedimento de backup/restauração.
- [ ] Definir política comercial, privacidade e responsabilidades sobre dados antes de lançamento público.
- [ ] Automatizar cobrança somente após validar piloto, operação e preços.

Aceite: novo cliente é liberado sem editar código ou criar repositório; atualização preserva metas e acessos; suspensão impede acesso na camada de dados.

## E5 — Rentabilidade e crescimento

- [ ] Conciliar pedidos com Tray/ERP: aprovados, cancelados, devolvidos e receita líquida.
- [ ] Identificar novos clientes para CAC; separar recorrência e aquisição.
- [ ] Incorporar custo do produto, impostos, taxas, frete subsidiado e margem de contribuição.
- [ ] Calcular limite econômico de CPA e ROAS com premissas explícitas.
- [ ] Coortes, recompra e LTV quando houver histórico e identidade adequados.

## Dependências e decisões a resolver durante a execução

1. Verificar regras publicadas e acesso ao projeto Firebase antes da migração/autorização.
2. Definir quem pode editar metas em cada cliente (padrão proposto: administrador e gestor).
3. Confirmar definição de receita, compra e custos disponíveis por cliente; sem presumir cobertura.
4. Configurar metas reais no onboarding; não inventar valores padrão de negócio.
5. Definir primeira propriedade piloto e validar acessos de gestor/visualizador com usuários de teste.
6. Confirmar canais e fonte de custo antes de iniciar E3.

## Governança do roadmap

O detalhamento da entrega inicial, testes, migração e limites está em DELIVERY-E0-E1.md. As listas acima permanecem como escopo completo: itens não contemplados nesta versão não devem ser considerados concluídos apenas pela publicação. Consolidação de vários meses, rateio arbitrário e auditoria completa das métricas antigas continuam pendentes.

- Estados: planejado, em execução, bloqueado com motivo, implementado aguardando validação e validado.
- Código publicado só encerra um item após seu critério de aceite.
- Cada entrega registra versão, mudanças, testes e limitações.
- Pedidos novos entram neste documento antes de expandir a entrega ativa.
- Próxima execução: E0 e E1. Demais etapas permanecem no backlog e não são descartadas.
