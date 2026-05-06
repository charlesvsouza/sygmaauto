# Status do Sistema — SigmaAuto
**Atualizado em:** 05/05/2026  
**Responsável:** charlesvsouza

---

## 1. Visão Geral

| Componente | URL | Status |
|---|---|---|
| Site Institucional | https://sigmaauto.com.br | ✅ Online |
| App (sistema) | https://www.sigmaauto.com.br | ✅ Online |
| API Backend | https://sygmaauto-api-production.up.railway.app | ✅ Online |
| Google Search Console | https://sigmaauto.com.br | ✅ Verificado e indexando |

---

## 2. Site Institucional (`c:\sygmaauto-site`)

### Stack
- **Framework:** Next.js 16.2.4 (App Router)
- **Deploy:** Vercel — projeto `sigmaauto-site` (charlesvsouzas-projects)
- **Domínio:** `sigmaauto.com.br` (sem www)
- **Design:** fundo `#060608`, gradiente âmbar/laranja, Tailwind CSS v3

### Páginas
| Rota | Descrição |
|---|---|
| `/` | Home institucional — Hero, Features, Demo, Planos, Depoimentos, FAQ, Contato |
| `/manual/` | Manual do usuário — 22 capítulos com sidebar e índice clicável |
| `/suporte/` | Central de suporte — canais de atendimento e FAQ |
| `/blog/` | Blog institucional — 6 artigos |
| `/bem-vindo/` | Página pós-cadastro — countdown 10s → redireciona para login |

### Componentes principais
- `Navbar` — links `/#funcionalidades`, `/#retifica`, `/#planos`, `/suporte`, `/#contato`
- `Hero` — CTA "Escolha seu plano" → `/#planos` | "Entrar no sistema" → `www/login`
- `Features` — 6 funcionalidades com `id="funcionalidades"`
- `Pricing` — 3 planos + Retífica; todos os botões → `www.sigmaauto.com.br/planos?plan=SLUG`
- `Demo` — CTA → `www.sigmaauto.com.br/planos`
- `Contact` — formulário de fale-conosco
- `Footer` — e-mail, telefone (21) 97933-0093, Rio de Janeiro

### Planos e slugs (checkout MercadoPago)
| Plano | Preço/mês | URL de Checkout |
|---|---|---|
| Start | R$ 149 | `www.sigmaauto.com.br/planos?plan=START` |
| Pro | R$ 299 | `www.sigmaauto.com.br/planos?plan=PRO` |
| Rede | R$ 599 | `www.sigmaauto.com.br/planos?plan=REDE` |
| Retífica Pro | R$ 499 | `www.sigmaauto.com.br/planos?plan=RETIFICA_PRO` |
| Retífica Rede | R$ 899 | `www.sigmaauto.com.br/planos?plan=RETIFICA_REDE` |

---

## 3. App (`c:\sygmaauto\frontend`)

- **Framework:** React + Vite
- **Deploy:** Vercel — projeto `sygmaauto` (prj_kcpcdmLKe6Zhmiok2RVrOxlVx0VQ)
- **Domínio:** `www.sigmaauto.com.br`
- **Backend:** NestJS no Railway

### Rotas públicas (sem login)
| Rota | Descrição |
|---|---|
| `/planos` | Seleção de plano + checkout MercadoPago |
| `/checkout/success` | Confirmação de pagamento |
| `/checkout/cancel` | Cancelamento de pagamento |
| `/login` | Login |

---

## 4. SEO e Indexação Google

### Configurações ativas
- `robots.txt` — `Allow: /` + referência ao sitemap
- `sitemap.xml` — 4 páginas com prioridade e changefreq
- Meta tags OpenGraph, Twitter Card e canonical no `layout.tsx`
- GoogleBot autorizado com `max-snippet: -1`, `max-image-preview: large`

### Verificação de propriedade (dupla)
| Método | Status |
|---|---|
| Arquivo HTML `/googlec996a50765ba3bb6.html` | ✅ Ativo |
| Meta tag `google-site-verification` no `<head>` | ✅ Ativo |
| Registro DNS TXT `google-site-verification=xBtr33...` | ✅ Ativo |

### Sitemap enviado
- URL: `https://sigmaauto.com.br/sitemap.xml`
- Status no Search Console: **Processado ✅**
- Páginas encontradas: **4**
- Última leitura: 05/05/2026

---

## 5. DNS (`sigmaauto.com.br` — Vercel Nameservers)

| Tipo | Nome | Valor |
|---|---|---|
| ALIAS | @ | Vercel (site institucional) |
| ALIAS | www | Vercel (app) |
| MX | @ | `mx1.hostinger.com` (prio 5) |
| MX | @ | `mx2.hostinger.com` (prio 10) |
| TXT | @ | `v=spf1 include:_spf.mail.hostinger.com ~all` |
| TXT | @ | `google-site-verification=xBtr33_I8_nwpCwaqtISjJM36vSw-A5RytLCloYkHwA` |
| TXT | `_dmarc` | `v=DMARC1; p=none` |
| CNAME | `hostingermail-a._domainkey` | Hostinger DKIM |
| CNAME | `hostingermail-b._domainkey` | Hostinger DKIM |
| CNAME | `hostingermail-c._domainkey` | Hostinger DKIM |

---

## 6. Problemas resolvidos nesta sessão

| Problema | Causa | Solução |
|---|---|---|
| Botões do menu não navegavam corretamente em páginas internas | Links com âncora relativa (`#...`) | Trocado para `/#...` |
| Clique em "Retífica" no menu não rolava para a seção | `id="retifica"` ausente | Adicionado no bloco de retífica dentro de Pricing |
| Índice do manual não era clicável | Lista estática sem âncoras reais | Geração dinâmica de slugs a partir dos `## títulos` do markdown |
| ERR_TOO_MANY_REDIRECTS em `www.sigmaauto.com.br/planos` | `www` estava redirecionando para apex (conflito de domínio) | Alias do `www` forçado para o deployment do app via `vercel alias set` |
| 404 em `sigmaauto.com.br/planos` | Rota só existe no app, não no site | Redirects no `vercel.json` do site institucional |
| CTAs de planos apontavam para `#contato` | Links não configurados | Atualizados para `www.sigmaauto.com.br/planos?plan=SLUG` |
| Sitemap "Não foi possível buscar" | Google rastreou antes do deploy propagar | Reenvio após deploy; agora "Processado ✅" |

---

## 7. Próximos passos sugeridos

- [ ] Solicitar indexação manual de cada URL no Google Search Console (Inspeção de URL → Solicitar indexação)
- [ ] Adicionar dados estruturados JSON-LD (Organization + FAQ) para rich results no Google
- [ ] Criar OG Image (1200×630) para preview ao compartilhar no WhatsApp/redes sociais
- [ ] Adicionar seção dedicada "Retífica" na home (`id="retifica"`) com conteúdo próprio
- [ ] Configurar Google Analytics (GA4) para acompanhar tráfego
