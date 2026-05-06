import { Children, isValidElement, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BookOpenText, Download, FileText, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarketingPageHero } from '../components/marketing/MarketingPageHero';
import { MarketingShell } from '../components/marketing/MarketingShell';

const MANUAL_URL = '/manual/MANUAL_USUARIO.md';

type ManualSection = {
  slug: string;
  title: string;
};

function slugifyHeading(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractNodeText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child);
      }

      if (isValidElement<{ children?: ReactNode }>(child)) {
        return extractNodeText(child.props.children);
      }

      return '';
    })
    .join('')
    .trim();
}

function normalizeMarkdownLine(rawLine: string): string {
  return rawLine
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/^\s*[-+]\s+/g, '- ')
    .trimEnd();
}

function splitAndDrawText(doc: jsPDF, text: string, fontSize: number, margin: number, lineHeight: number, yRef: { value: number }) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  const chunks = doc.splitTextToSize(text, maxWidth);

  for (const chunk of chunks) {
    if (yRef.value + lineHeight > pageHeight - margin) {
      doc.addPage();
      yRef.value = margin;
    }

    doc.setFontSize(fontSize);
    doc.text(chunk, margin, yRef.value);
    yRef.value += lineHeight;
  }
}

export function UserManualPage() {
  const [manualMd, setManualMd] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadManual = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(MANUAL_URL, { cache: 'no-cache' });
        if (!response.ok) {
          throw new Error('Nao foi possivel carregar o manual neste momento.');
        }

        const content = await response.text();
        if (mounted) {
          setManualMd(content);
        }
      } catch (loadError) {
        if (mounted) {
          const message = loadError instanceof Error ? loadError.message : 'Erro inesperado ao carregar o manual.';
          setError(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadManual();

    return () => {
      mounted = false;
    };
  }, []);

  const manualSectionsCount = useMemo(() => {
    return manualMd
      .split('\n')
      .filter((line) => /^##\s+\d+\./.test(line.trim())).length;
  }, [manualMd]);

  const manualSections = useMemo<ManualSection[]>(() => {
    return manualMd
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^##\s+/.test(line) && !/^##\s+Sum[aá]rio$/i.test(line))
      .map((line) => line.replace(/^##\s+/, '').trim())
      .map((title) => ({
        title,
        slug: slugifyHeading(title),
      }));
  }, [manualMd]);

  const markdownComponents = useMemo<Components>(() => ({
    h1: ({ children }) => {
      const heading = extractNodeText(children);

      return (
        <h1
          id={slugifyHeading(heading)}
          className="scroll-mt-28 text-center font-semibold text-[2.2rem] leading-tight tracking-[0.02em] text-[#211b17]"
        >
          {children}
        </h1>
      );
    },
    h2: ({ children }) => {
      const heading = extractNodeText(children);

      return (
        <h2
          id={slugifyHeading(heading)}
          className="scroll-mt-28 border-t border-[#d8cdb7] pt-10 text-[1.55rem] font-semibold leading-tight tracking-[0.015em] text-[#241d19] first:border-t-0 first:pt-0"
        >
          {children}
        </h2>
      );
    },
    h3: ({ children }) => {
      const heading = extractNodeText(children);

      return (
        <h3
          id={slugifyHeading(heading)}
          className="scroll-mt-28 text-[1.2rem] font-semibold leading-snug text-[#2c241f]"
        >
          {children}
        </h3>
      );
    },
    p: ({ children }) => (
      <p className="text-[1.05rem] leading-[2.05] tracking-[0.01em] text-[#3a312c]">
        {children}
      </p>
    ),
    a: ({ href, children }) => {
      const isAnchor = href?.startsWith('#');

      return (
        <a
          href={href}
          className="font-medium text-[#8b5e34] underline decoration-[#b48a62]/70 underline-offset-4 transition-colors hover:text-[#5f4328]"
          target={isAnchor ? undefined : '_blank'}
          rel={isAnchor ? undefined : 'noreferrer'}
        >
          {children}
        </a>
      );
    },
    ul: ({ children }) => (
      <ul className="list-disc space-y-4 pl-7 text-[1.02rem] leading-[2] text-[#3a312c]">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal space-y-4 pl-7 text-[1.02rem] leading-[2] text-[#3a312c]">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-1">{children}</li>,
    hr: () => <hr className="my-10 border-0 border-t border-[#d8cdb7]" />,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[#b99772] bg-[#efe6d6] px-6 py-5 italic text-[#57483d] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto rounded-2xl border border-[#d5c8b1] bg-[#fbf7ef] shadow-[0_10px_25px_rgba(43,31,20,0.05)]">
        <table className="min-w-full border-collapse text-left text-[0.98rem] leading-[1.9] text-[#332b26]">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-[#efe5d2] text-[#2b231f]">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-[#ddd1bc]">{children}</tbody>,
    th: ({ children }) => <th className="px-4 py-3 font-semibold">{children}</th>,
    td: ({ children }) => <td className="px-4 py-3 align-top">{children}</td>,
    code: ({ children }) => {
      const content = extractNodeText(children);
      const isBlockCode = content.includes('\n');

      return isBlockCode ? (
        <code className="block overflow-x-auto rounded-2xl bg-[#2a2521] px-5 py-4 font-mono text-[0.92rem] leading-8 text-[#f4eadb] shadow-[0_16px_30px_rgba(26,20,15,0.18)]">
          {children}
        </code>
      ) : (
        <code className="rounded-md bg-[#ede2d1] px-2 py-1 text-[0.94rem] text-[#6a4122]">
          {children}
        </code>
      );
    },
    pre: ({ children }) => <pre className="m-0">{children}</pre>,
  }), []);

  const handleDownloadPdf = () => {
    if (!manualMd || generatingPdf) {
      return;
    }

    try {
      setGeneratingPdf(true);
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      const yRef = { value: margin };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Manual do Usuario - SigmaAuto', margin, yRef.value);
      yRef.value += 22;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, margin, yRef.value);
      yRef.value += 24;

      const lines = manualMd.replace(/\r/g, '').split('\n');

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();

        if (!line.trim()) {
          yRef.value += 8;
          continue;
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const text = normalizeMarkdownLine(headingMatch[2]);
          const headingSizes: Record<number, number> = { 1: 16, 2: 14, 3: 12, 4: 11, 5: 10, 6: 10 };
          const fontSize = headingSizes[level] ?? 11;

          yRef.value += 6;
          doc.setFont('helvetica', 'bold');
          splitAndDrawText(doc, text, fontSize, margin, fontSize + 4, yRef);
          doc.setFont('helvetica', 'normal');
          yRef.value += 4;
          continue;
        }

        if (/^[-*_]{3,}$/.test(line.trim())) {
          yRef.value += 6;
          continue;
        }

        const text = normalizeMarkdownLine(line);
        if (!text) {
          continue;
        }

        splitAndDrawText(doc, text, 10, margin, 14, yRef);
      }

      doc.save('Manual_Usuario_SigmaAuto.pdf');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <MarketingShell>
      <MarketingPageHero
        icon={BookOpenText}
        eyebrow="Documentacao"
        title="Manual do Usuario"
        description="Leitura editorial do manual oficial, com tipografia de estudo, navegacao por secoes e visual pensado para aprendizagem prolongada."
        aside={
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Conteudo</p>
            <p className="mt-3 text-3xl font-black text-white">{manualSectionsCount || '--'} secoes</p>
            <p className="text-sm text-white/45">Atualizado direto do manual oficial</p>
          </div>
        }
      />

      <section className="max-w-[1380px] mx-auto px-6 pb-8 flex flex-wrap gap-3">
        <a
          href={MANUAL_URL}
          download="MANUAL_USUARIO.md"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 text-sm font-bold text-white/80 hover:text-white hover:border-[#ff7b2f]/60 hover:bg-[#ff7b2f]/10 transition-all"
        >
          <FileText size={16} />
          Baixar .md
        </a>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={loading || !!error || generatingPdf || !manualMd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#ff7b2f]/35 bg-[#ff7b2f]/10 text-sm font-bold text-[#ffb489] hover:text-white hover:border-[#ff7b2f]/80 hover:bg-[#ff7b2f]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generatingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {generatingPdf ? 'Gerando este manual em PDF...' : 'Gerar este manual em PDF'}
        </button>
      </section>

      <section className="max-w-[1380px] mx-auto px-6 pb-20">
        <div className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
          <aside className="hidden xl:block">
            <div className="sticky top-28 rounded-[28px] border border-[#d0c1a7]/70 bg-[#f3eadb] p-6 shadow-[0_22px_50px_rgba(41,31,20,0.12)]">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#7a6859]">
                Indice do manual
              </p>
              <p className="mt-3 text-sm leading-7 text-[#6f6053]">
                Os links levam ao inicio de cada secao principal, como em um sumario de livro.
              </p>

              <nav className="mt-6 max-h-[70vh] overflow-y-auto pr-1">
                <ul className="space-y-2">
                  {manualSections.map((section) => (
                    <li key={section.slug}>
                      <a
                        href={`#${section.slug}`}
                        className="block rounded-2xl px-4 py-3 text-[0.95rem] leading-6 text-[#4a3e35] transition-colors hover:bg-[#e8dcc9] hover:text-[#2c231c]"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>

          <div className="min-w-0 overflow-y-auto rounded-[34px] border border-[#d8cdb8] bg-[linear-gradient(180deg,#fbf7ef_0%,#f4ecdf_100%)] p-4 shadow-[0_30px_80px_rgba(27,20,14,0.16)] sm:p-8 lg:p-12 h-[calc(100svh-7.5rem)] sticky top-[7.5rem]">
            {loading ? (
              <div className="flex items-center gap-3 text-[#6d5d50]">
                <Loader2 size={18} className="animate-spin" />
                <span>Carregando manual...</span>
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-red-700">{error}</p>
            ) : null}

            {!loading && !error ? (
              <article
                className="mx-auto max-w-[840px] rounded-[28px] border border-[#e1d5c1] bg-[#fffdf8] px-6 py-10 text-[#342b25] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_45px_rgba(58,43,27,0.06)] sm:px-10 lg:px-14"
                style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
              >
                <div className="mb-10 border-b border-[#ddd0b8] pb-8 text-center">
                  <p className="text-[0.78rem] uppercase tracking-[0.26em] text-[#8a7867]">Edicao web de estudo</p>
                  <p className="mt-4 text-[1rem] leading-8 text-[#5d5147]">
                    Formato editorial com leitura serena, blocos respirando em espacamento amplo e navegacao lateral ancorada.
                  </p>
                </div>

                <div className="space-y-8 [&>*+*]:mt-8">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {manualMd}
                  </ReactMarkdown>
                </div>
              </article>
            ) : null}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
