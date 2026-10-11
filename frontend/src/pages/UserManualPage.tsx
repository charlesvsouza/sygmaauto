import { Children, isValidElement, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText, ListTree, Loader2, Printer, Search, X } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarketingShell } from '../components/marketing/MarketingShell';

const MANUAL_URL = '/manual/MANUAL_USUARIO.md';
const INTRO_TITLE = 'Como usar este manual';

type Sub = { id: string; title: string };
type Chapter = { id: string; num: string; title: string; part: string; subs: Sub[]; text: string };

type ParsedManual = {
  title: string;
  meta: { version: string; support: string };
  body: string;
  chapters: Chapter[];
};

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function nodeText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child);
      if (isValidElement<{ children?: ReactNode }>(child)) return nodeText(child.props.children);
      return '';
    })
    .join('')
    .trim();
}

/** Separa cabeçalho, sumário textual (descartado) e corpo, e monta o índice a partir dos títulos. */
function parseManual(md: string): ParsedManual {
  const lines = md.replace(/\r/g, '').split('\n');
  const title = (lines.find((l) => l.startsWith('# ')) ?? '# Manual do Usuário').replace(/^#\s+/, '');
  const version = lines.find((l) => l.startsWith('**Versão:**'))?.replace(/\*\*Versão:\*\*\s*/, '').trim() ?? '';
  const support = lines.find((l) => l.startsWith('**Suporte:**'))?.replace(/\*\*Suporte:\*\*\s*/, '').trim() ?? '';

  // Corpo: da introdução em diante, sem o sumário textual (o índice lateral e o impresso o substituem).
  const introAt = lines.findIndex((l) => l.trim() === `## ${INTRO_TITLE}`);
  const summaryAt = lines.findIndex((l) => /^##\s+Sum[aá]rio$/i.test(l.trim()));
  const firstPartAt = lines.findIndex((l, i) => i > Math.max(introAt, summaryAt) && /^#\s+/.test(l));
  const bodyLines: string[] = [];
  lines.forEach((line, i) => {
    if (i < Math.max(introAt, 0)) return;
    if (summaryAt >= 0 && i >= summaryAt && i < firstPartAt) return;
    bodyLines.push(line);
  });

  const chapters: Chapter[] = [];
  let part = '';
  let current: Chapter | null = null;
  const textByChapter = new Map<Chapter, string[]>();
  for (const line of bodyLines) {
    const h1 = line.match(/^#\s+(.*)$/);
    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    if (h1) {
      part = h1[1].trim();
      current = null;
    } else if (h2) {
      const heading = h2[1].trim();
      const m = heading.match(/^(\d+)\.\s+(.*)$/);
      current = {
        id: slugify(heading),
        num: m ? m[1] : '',
        title: m ? m[2] : heading,
        part: m ? part : '',
        subs: [],
        text: '',
      };
      chapters.push(current);
      textByChapter.set(current, []);
    } else if (h3 && current) {
      current.subs.push({ id: slugify(h3[1].trim()), title: h3[1].trim() });
    }
    if (current) textByChapter.get(current)!.push(line);
  }
  chapters.forEach((c) => {
    c.text = plain((textByChapter.get(c) ?? []).join(' ').replace(/[*_`>|#]/g, ' '));
  });

  return { title, meta: { version, support }, body: bodyLines.join('\n'), chapters };
}

/* ------------------------------------------------------------------ */
/* Impressão: formato de livro (capa, sumário, um capítulo por página) */
/* ------------------------------------------------------------------ */

const PRINT_CSS = `
@media print {
 @page {
 size: A4; margin: 24mm 22mm 22mm 22mm;
 @bottom-center { content: counter(page); font: 9pt Georgia, "Times New Roman", serif; color: #555; }
 @bottom-right { content: "SigmaAuto · Manual do Usuário"; font: 7.5pt Georgia, "Times New Roman", serif; color: #888; }
 }
 @page :first { @bottom-center { content: none; } @bottom-right { content: none; } }
 html, body { background: #ffffff !important; }
 body * { visibility: hidden !important; }
 .manual-print, .manual-print * { visibility: visible !important; }
 .manual-print {
 position: absolute; left: 0; top: 0; width: 100%;
 color: #1b1b1b !important; background: #ffffff !important;
 font-family: Georgia, "Times New Roman", serif !important;
 font-size: 11pt; line-height: 1.55;
 }
 .manual-noprint { display: none !important; }
 .manual-print h1, .manual-print h2, .manual-print h3, .manual-print h4, .manual-print strong, .manual-print p, .manual-print li, .manual-print td, .manual-print th {
 color: #1b1b1b !important; font-family: Georgia, "Times New Roman", serif !important;
 }
 .manual-print .manual-h1 { break-before: page; page-break-before: always; border: 0 !important; font-size: 11pt !important; letter-spacing: .2em; text-transform: uppercase; color: #6b551d !important; margin: 0 0 8mm !important; }
 .manual-print .manual-h2 { break-before: page; page-break-before: always; border-bottom: 1px solid #999 !important; }
 .manual-print .manual-h1 + .manual-h2 { break-before: avoid; page-break-before: avoid; }
 .manual-print .manual-h2 span { color: #6b551d !important; }
 .manual-print .manual-h3 { break-after: avoid; }
 .manual-print .manual-intro-h2 { break-before: page; }
 .manual-print a { color: #1b1b1b !important; text-decoration: none !important; }
 .manual-print .manual-ui { background: transparent !important; border: 1px solid #999 !important; color: #111 !important; }
 .manual-print .manual-note { background: #f4f1e8 !important; border: 1px solid #cdbf94 !important; }
 .manual-print .manual-note * { color: #2a2a2a !important; }
 .manual-print table { break-inside: avoid; }
 .manual-print th { background: #eee !important; }
 .manual-print td, .manual-print th { border: 1px solid #ccc !important; }
 .manual-print .manual-table-wrap { border: 0 !important; background: none !important; overflow: visible !important; }
 .manual-print .manual-cover { break-after: page; page-break-after: always; }
 .manual-print .manual-toc { break-after: page; page-break-after: always; }
 .manual-print .manual-toc li { break-inside: avoid; }
 .manual-print li, .manual-print .manual-note { break-inside: avoid; }
 .manual-print code { background: #f1f1f1 !important; color: #111 !important; }
}
`;

/* ------------------------------------------------------------------ */
/* Renderização do Markdown                                           */
/* ------------------------------------------------------------------ */

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1
      id={slugify(nodeText(children))}
      className="manual-h1 scroll-mt-28 pt-14 text-xs font-bold uppercase tracking-wide text-accent-ink"
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => {
    const heading = nodeText(children);
    const m = heading.match(/^(\d+)\.\s+(.*)$/);
    return (
      <h2
        id={slugify(heading)}
        className={`manual-h2 ${m ? '' : 'manual-intro-h2'} scroll-mt-28 mt-2 flex items-baseline gap-3 border-b border-line pb-3 pt-6 text-[1.7rem] font-bold leading-tight text-surface-50`}
      >
        {m ? <span className="text-accent-ink">{m[1]}.</span> : null}
        {m ? m[2] : heading}
      </h2>
    );
  },
  h3: ({ children }) => (
    <h3 id={slugify(nodeText(children))} className="manual-h3 scroll-mt-28 pt-6 text-lg font-bold leading-snug text-surface-50">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="text-[0.98rem] leading-7 text-surface-50">{children}</p>,
  a: ({ href, children }) => {
    const internal = href?.startsWith('#');
    return (
      <a
        href={href}
        className="font-medium text-accent-ink underline decoration-[#33b6bf]/50 underline-offset-4 hover:text-surface-50"
        target={internal ? undefined : '_blank'}
        rel={internal ? undefined : 'noreferrer'}
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => (
    <ul className="list-disc space-y-1.5 pl-6 text-[0.98rem] leading-7 text-surface-50 marker:text-accent-ink">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-2 pl-6 text-[0.98rem] leading-7 text-surface-50 marker:font-semibold marker:text-accent-ink">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  hr: () => null,
  // **Termo curto** = nome de botão/campo/menu da tela (chip); frases longas ou terminadas em ":" = negrito comum.
  strong: ({ children }) => {
    const text = nodeText(children);
    const isUi = text.length <= 40 && !text.endsWith(':') && text.split(/\s+/).length <= 5;
    return isUi ? (
      <strong className="manual-ui rounded border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-[0.86em] font-semibold text-accent-ink">
        {children}
      </strong>
    ) : (
      <strong className="font-bold text-surface-50">{children}</strong>
    );
  },
  blockquote: ({ children }) => {
    const first = nodeText(Children.toArray(children).find((c) => isValidElement(c)) as ReactNode);
    const isPlan = /^planos?\b/i.test(first);
    return (
      <aside className="manual-note rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm [&_p]:text-sm [&_p]:leading-6">
        <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-wide text-accent-ink">{isPlan ? 'Planos' : 'Dica'}</p>
        {children}
      </aside>
    );
  },
  table: ({ children }) => (
    <div className="manual-table-wrap overflow-x-auto rounded-lg border border-line">
      <table className="min-w-full border-collapse text-left text-[0.92rem] leading-6">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-panel text-surface-50">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-line">{children}</tbody>,
  th: ({ children }) => <th className="px-4 py-2.5 font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-4 py-2.5 align-top text-surface-50">{children}</td>,
  code: ({ children }) => (
    <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-[0.88em] text-surface-50">{children}</code>
  ),
};

/* ------------------------------------------------------------------ */
/* Página                                                             */
/* ------------------------------------------------------------------ */

export function UserManualPage() {
  const [manualMd, setManualMd] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [indexOpen, setIndexOpen] = useState(false);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch(MANUAL_URL, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error('Não foi possível carregar o manual neste momento.');
        return r.text();
      })
      .then((text) => mounted && setManualMd(text))
      .catch((e) => mounted && setError(e instanceof Error ? e.message : 'Erro inesperado ao carregar o manual.'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const manual = useMemo(() => (manualMd ? parseManual(manualMd) : null), [manualMd]);

  // Abre direto na seção do link (#id) depois que o conteúdo existe.
  useEffect(() => {
    if (!manual || !window.location.hash) return;
    const el = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    el?.scrollIntoView();
  }, [manual]);

  // Destaca no índice o capítulo e a subseção que estão na tela.
  useEffect(() => {
    if (!manual) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const headings = document.querySelectorAll<HTMLElement>('.manual-print h2[id], .manual-print h3[id]');
      let current = '';
      headings.forEach((h) => {
        if (h.getBoundingClientRect().top <= 150) current = h.id;
      });
      setActiveId(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [manual]);

  const activeChapterId = useMemo(() => {
    if (!manual) return '';
    const hit = manual.chapters.find((c) => c.id === activeId || c.subs.some((s) => s.id === activeId));
    return hit?.id ?? '';
  }, [manual, activeId]);

  const visibleChapters = useMemo(() => {
    if (!manual) return [];
    const q = plain(query.trim());
    if (!q) return manual.chapters;
    return manual.chapters.filter((c) => plain(`${c.num} ${c.title}`).includes(q) || c.text.includes(q));
  }, [manual, query]);

  const grouped = useMemo(() => {
    const groups: { part: string; items: Chapter[] }[] = [];
    visibleChapters.forEach((c) => {
      const last = groups[groups.length - 1];
      if (last && last.part === c.part) last.items.push(c);
      else groups.push({ part: c.part, items: [c] });
    });
    return groups;
  }, [visibleChapters]);

  const searching = query.trim().length > 0;

  return (
    <MarketingShell>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="mx-auto max-w-6xl px-6 pb-20">
        {/* Barra de ações (não imprime) */}
        <div className="manual-noprint mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-accent-ink">
              <ArrowLeft size={15} /> Voltar
            </Link>
            <p className="text-xs font-bold uppercase tracking-wide text-accent-ink">Guia do usuário</p>
            <h1 className="mt-2 text-3xl font-bold text-surface-50 lg:text-4xl">Manual do SigmaAuto</h1>
            {manual?.meta.version ? <p className="mt-1 text-sm text-surface-500">Versão {manual.meta.version}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIndexOpen((v) => !v)}
              aria-expanded={indexOpen}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-bold text-surface-50 hover:border-accent/30 lg:hidden"
            >
              <ListTree size={16} /> {indexOpen ? 'Fechar índice' : 'Índice'}
            </button>
            <a
              href={MANUAL_URL}
              download="MANUAL_USUARIO.md"
              className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-bold text-surface-50 hover:border-accent/30 hover:text-surface-50"
            >
              <FileText size={16} /> Baixar .md
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!manual}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
            >
              <Printer size={16} /> Salvar como PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-surface-500">
            <Loader2 size={18} className="animate-spin" /> Carregando manual...
          </div>
        ) : null}
        {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}

        {manual ? (
          <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
            {/* ---------- Índice lateral ---------- */}
            <aside className={`manual-noprint ${indexOpen ? 'block' : 'hidden'} lg:block`}>
              <nav
                aria-label="Índice do manual"
                className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2"
              >
                <div className="relative mb-4">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar no manual"
                    aria-label="Buscar no manual"
                    className="w-full rounded-xl border border-line bg-panel py-2.5 pl-9 pr-9 text-sm text-surface-50 placeholder:text-surface-500 focus:border-accent/30 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Limpar busca"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-surface-500 hover:text-surface-50"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>

                {grouped.length === 0 ? (
                  <p className="text-sm text-surface-500">Nada encontrado para “{query}”.</p>
                ) : (
                  grouped.map((group) => (
                    <div key={group.part || 'intro'} className="mb-4">
                      {group.part ? (
                        <p className="mb-1 text-[0.68rem] font-bold uppercase tracking-wide text-surface-500">{group.part}</p>
                      ) : null}
                      <ul className="border-l border-line text-sm">
                        {group.items.map((c) => {
                          const active = c.id === activeChapterId;
                          return (
                            <li key={c.id}>
                              <a
                                href={`#${c.id}`}
                                onClick={() => setIndexOpen(false)}
                                aria-current={active ? 'true' : undefined}
                                className={`-ml-px block border-l py-1.5 pl-4 transition-colors ${
 active
 ? 'border-accent/30 font-bold text-surface-50'
 : 'border-transparent text-surface-500 hover:border-accent/30 hover:text-surface-50'
 }`}
                              >
                                {c.num ? <span className="text-accent-ink">{c.num}.</span> : null} {c.title}
                              </a>
                              {c.subs.length > 0 && (active || searching) ? (
                                <ul className="mb-1">
                                  {c.subs.map((s) => (
                                    <li key={s.id}>
                                      <a
                                        href={`#${s.id}`}
                                        onClick={() => setIndexOpen(false)}
                                        className={`block py-1 pl-8 text-[0.8rem] leading-5 transition-colors ${
 s.id === activeId ? 'font-semibold text-accent-ink' : 'text-surface-500 hover:text-surface-50'
 }`}
                                      >
                                        {s.title}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </nav>
            </aside>

            {/* ---------- Conteúdo (e versão impressa) ---------- */}
            <article className="manual-print min-w-0 max-w-[46rem] space-y-4">
              {/* Capa (só na impressão) */}
              <div className="manual-cover hidden print:block" aria-hidden="true">
                <div style={{ paddingTop: '6cm', textAlign: 'center' }}>
                  <p style={{ letterSpacing: '0.3em', fontSize: '12pt' }}>SIGMAAUTO</p>
                  <p style={{ fontSize: '30pt', margin: '1.5cm 0 0.4cm' }}>Manual do Usuário</p>
                  <p style={{ fontSize: '13pt', fontStyle: 'italic' }}>Gestão de oficina mecânica, da entrada à entrega</p>
                  <p style={{ marginTop: '4cm', fontSize: '11pt' }}>Versão {manual.meta.version}</p>
                  {manual.meta.support ? <p style={{ fontSize: '10pt' }}>Suporte: {manual.meta.support}</p> : null}
                </div>
              </div>

              {/* Sumário (só na impressão — o índice lateral não imprime) */}
              <div className="manual-toc hidden print:block" aria-hidden="true">
                <h2 style={{ fontSize: '20pt', marginBottom: '1cm', textAlign: 'center' }}>Sumário</h2>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: '11pt', lineHeight: 1.6 }}>
                  {manual.chapters.map((c) => (
                    <li key={c.id} style={{ marginBottom: '0.15cm' }}>
                      <strong>{c.num ? `${c.num}. ` : ''}{c.title}</strong>
                      {c.part ? <span style={{ opacity: 0.6 }}> — {c.part}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>

              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {manual.body}
              </ReactMarkdown>

              <p className="manual-noprint flex items-center gap-2 pt-10 text-sm text-surface-500">
                <Download size={14} /> Precisa do manual offline? Use <strong className="font-bold text-surface-50">Salvar como PDF</strong> no topo.
              </p>
            </article>
          </div>
        ) : null}
      </div>
    </MarketingShell>
  );
}
