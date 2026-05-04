# Diretrizes — Limites da Vercel (janela de 24h)

## Contexto
Quando a Vercel informa que os recursos estão limitados e pede para aguardar 24h, normalmente significa **rate limit / quota de build/deploy** no plano atual.

Isso **não indica erro de código necessariamente**. Pode ser apenas limite operacional da conta/projeto/time.

---

## O que essa mensagem significa
- A conta/projeto atingiu algum limite de uso (build minutes, deploys, execuções, ou limite anti-abuso).
- Novos deploys podem falhar temporariamente.
- Após a janela (geralmente 24h), os deploys voltam a funcionar.

---

## Plano de ação recomendado (prático)

### 1) Durante o bloqueio (0–24h)
- Evitar disparar novos deploys automáticos desnecessários.
- Consolidar correções localmente.
- Validar localmente antes de publicar:
  - `cd frontend`
  - `npm run build`
- Preparar 1 único commit limpo para deploy quando liberar.

### 2) Após liberar a janela
- Fazer apenas 1 push com mudanças consolidadas.
- Confirmar no log da Vercel o commit/hash correto.
- Validar URL final e cache do navegador (`Ctrl+F5`).

### 3) Prevenção para não repetir
- Evitar sequência de commits pequenos só para “testar deploy”.
- Garantir build local antes do push.
- Manter o workflow enxuto para reduzir execuções redundantes.
- Se necessário, avaliar upgrade de plano da Vercel para maior folga.

---

## Checklist rápido antes do próximo deploy
- [ ] Build local do frontend ok (`npm run build`)
- [ ] Commit final único com as correções
- [ ] Hash do commit conferido
- [ ] Janela de 24h já passou
- [ ] Após deploy, conferir rota crítica (ex.: `/kpis`)

---

## Procedimento de Deploy Seguro (adotado no workflow)

1. O pipeline agora detecta se houve mudança em `frontend/**` e/ou `backend/**`.
2. Só executa check/deploy do que realmente mudou.
3. Execuções antigas em paralelo são canceladas automaticamente (`concurrency`).
4. Existe execução manual (`workflow_dispatch`) para deploy forçado quando necessário.

Benefício esperado: menos builds redundantes, menor chance de atingir limite diário da Vercel.

---

## Diagnóstico resumido para o time
"Bloqueio temporário de recursos na Vercel (janela de 24h). Código local validado; deploy aguardando liberação de quota."
