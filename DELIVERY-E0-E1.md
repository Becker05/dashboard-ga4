# Entregas E0 e E1 — implementação e operação

## Uso

Entre pelo Google. Cada propriedade autorizada mostra a seção **Metas e resultado mensal**. Selecione um mês; o resumo consulta dias completos até ontem no fuso da propriedade, independentemente dos filtros dos gráficos antigos.

Gestores e administradores podem salvar receita, orçamento, pedidos, ROAS mínimo e CPA máximo; campos vazios significam meta não definida. Visualizadores somente consultam. Copiar mês anterior preenche o formulário sem salvar automaticamente. Toda gravação gera uma versão imutável no histórico. Se outra pessoa já alterou a meta, recarregue antes de salvar.

O administrador da plataforma encontra **Administração de clientes e acessos** ao final da página. Cada cadastro associa um e-mail a um cliente e a uma propriedade. Não concede permissão no GA4; essa autorização continua sendo gerenciada no Google Analytics. Usuários existentes migrados começam como visualizadores, com o operador autenticado do projeto como administrador.

A moeda e o fuso de propriedades migradas são consultados no GA4 antes de apresentar metas. A Administração permite confirmar esses campos. Custo completo inicia como não confirmado: no resumo de metas, ROAS, CPA e gasto realizado ficam indisponíveis até o administrador verificar a cobertura real do custo GA4.

## Estrutura

- clients/{clientId}: cliente, plano e situação.
- clients/{clientId}/members/{email}: papel e situação no cliente.
- clients/{clientId}/properties/{propertyId}: configuração autorizada.
- clients/{clientId}/properties/{propertyId}/goals/{YYYY-MM}: meta atual.
- .../goals/{YYYY-MM}/history/{version}: versões anteriores.
- users/{email}: diretório de clientes e situação global.
- platformAdmins/{email}: administradores; só configuração privilegiada pode criar esse documento.

O cadastro legado allowed_users é preservado na migração e fica restrito a leitura autenticada do próprio registro ou pelo administrador.

## Validação

- Testes de cálculo: ausência/zero, metas negativas, pedidos fracionados, meses futuros e bissextos.
- Testes de relatórios: not set preservado, sete etapas e fallback sem taxa fictícia de conversão.
- Firestore Emulator: leitura entre clientes negada, visualizador sem escrita, promoção própria negada, histórico obrigatório, versão obsoleta negada, suspensão e identidade não verificada bloqueadas.
- Navegador com respostas controladas: gravação, troca de cliente, visualizador, logout e telas desktop/mobile.
- Verificação sintática dos scripts e módulos.

Esses testes não substituem o aceite do login Google e a conferência do resultado com dados reais no aplicativo publicado.

## Implantação e reversão

1. `node scripts/migrate-clients.cjs`: simulação sem gravação.
2. `node scripts/migrate-clients.cjs --apply`: cria documentos novos atomicamente, com precondição de inexistência; salva backup privado da configuração e das regras. Nunca versionar .private.
3. Implantar `firestore.rules` no projeto dashboard-ga4-98b00 junto da nova versão do aplicativo. Não usar estas regras em outro projeto.
4. Publicar código e validar login, seleção da propriedade e uma meta real preenchida pelo gestor.
5. Em caso de falha de autenticação, restaurar versão anterior do aplicativo e regras salvas no backup. Não apagar metas nem cadastros migrados.

## Limites e próximos critérios de aceite

- Esta primeira tela compara um mês por vez; consolidação de metas de vários meses e rateio para intervalos arbitrários permanecem no roadmap.
- Projeção é linear e não incorpora sazonalidade.
- Sem integração nova de custos; gráficos antigos continuam consultando o que existe no GA4. Não representam garantia de investimento multicanal completo.
- O formulário administrativo salva um vínculo por vez; convites automáticos e cobrança ficam para E4.
- Teste funcional com login do gestor e conciliação real continuam necessários para marcar o aceite integral de E0/E1.
- Revisão econômica de receita aprovada/líquida e conciliação de pedidos pertencem a E5.
