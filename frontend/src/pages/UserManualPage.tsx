import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Download, FileText, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarketingPageHero } from '../components/marketing/MarketingPageHero';
import { MarketingShell } from '../components/marketing/MarketingShell';

const MANUAL_URL = '/manual/MANUAL_USUARIO.md';

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
        description="Guia completo de operacao do SigmaAuto em uma pagina dedicada, com visualizacao online e download em PDF."
        aside={
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Conteudo</p>
            <p className="mt-3 text-3xl font-black text-white">{manualSectionsCount || '--'} secoes</p>
            <p className="text-sm text-white/45">Atualizado direto do manual oficial</p>
          </div>
        }
      />

      <section className="max-w-6xl mx-auto px-6 pb-8 flex flex-wrap gap-3">
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

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur-sm p-8">
          {loading ? (
            <div className="flex items-center gap-3 text-white/65">
              <Loader2 size={18} className="animate-spin" />
              <span>Carregando manual...</span>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-red-300">{error}</p>
          ) : null}

          {!loading && !error ? (
            <div className="text-white/75 leading-relaxed [&_a]:text-[#ff7b2f] [&_a]:hover:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#ff7b2f]/50 [&_blockquote]:pl-4 [&_blockquote]:text-white/65 [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:text-3xl [&_h1]:font-black [&_h1]:text-white [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-white [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-white [&_li]:ml-4 [&_li]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_p]:mt-3 [&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse [&_tbody_tr]:border-t [&_tbody_tr]:border-white/8 [&_td]:border [&_td]:border-white/8 [&_td]:p-2 [&_th]:border [&_th]:border-white/8 [&_th]:bg-white/6 [&_th]:p-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{manualMd}</ReactMarkdown>
            </div>
          ) : null}
        </div>
      </section>
    </MarketingShell>
  );
}
