'use client'

import { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpenText, Download, Loader2, Search, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const MANUAL_URL = '/manual/MANUAL_USUARIO.md'

const chapters = [
  '1. Primeiro Acesso',
  '2. Painel Principal (Dashboard)',
  '3. Clientes',
  '4. Veículos',
  '5. Ordens de Serviço',
  '6. Kanban de Pátio',
  '7. Painel de Recepção (Modo TV)',
  '8. Checklist de Entrada e Saída',
  '9. WhatsApp Automático',
  '10. Serviços',
  '11. Estoque',
  '12. Financeiro',
  '13. Relatórios Gerenciais',
  '14. Usuários',
  '15. Configurações e Assinatura',
  '16. Perfis de Acesso (Roles)',
  '17. Dúvidas Frequentes',
  '18. Comissões de Mecânicos',
  '19. Manutenção Preventiva Automática',
  '20. NPS — Pesquisa de Satisfação',
  '21. Módulo Retífica de Motores',
  '22. Agenda — Agendamento Interno de OS',
]

export default function ManualPage() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(MANUAL_URL, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error('Não foi possível carregar o manual.')
        return r.text()
      })
      .then(setContent)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = MANUAL_URL
    a.download = 'Manual_SigmaAuto.md'
    a.click()
  }

  const filteredChapters = chapters.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-[#060608] pt-16">
      {/* Top bar */}
      <div className="sticky top-16 z-40 bg-[#0f0f12]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft size={14} />
              Voltar
            </Link>
            <span className="text-zinc-800">/</span>
            <span className="flex items-center gap-1.5 text-white text-sm font-semibold">
              <BookOpenText size={14} className="text-amber-400" />
              Manual do Usuário
            </span>
            <span className="hidden sm:inline text-[11px] text-zinc-600 bg-zinc-800/60 px-2 py-0.5 rounded-full font-medium">
              v2.1 · Maio/2026
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 text-xs font-semibold transition-all"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Baixar .md</span>
            </button>
            <a
              href="/bem-vindo"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold hover:shadow-gold transition-all"
            >
              Acessar sistema →
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className={cn(
          'shrink-0 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        )}>
          <div className="sticky top-32 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="text"
                placeholder="Buscar capítulo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/30 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Chapter list */}
            <nav className="space-y-0.5">
              {filteredChapters.map((chapter) => {
                const anchor = chapter
                  .toLowerCase()
                  .replace(/[^a-z0-9\s-]/g, '')
                  .replace(/\s+/g, '-')
                  .replace(/-+/g, '-')
                return (
                  <a
                    key={chapter}
                    href={`#${anchor}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 text-[12px] font-medium transition-all group"
                  >
                    <ChevronRight size={11} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
                    <span className="leading-snug">{chapter}</span>
                  </a>
                )
              })}
            </nav>

            {/* Support box */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4 mt-4">
              <p className="text-xs font-bold text-amber-400 mb-1">Precisa de ajuda?</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
                Nosso suporte responde em até 4h úteis.
              </p>
              <a
                href="mailto:suporte@sigmaauto.com.br"
                className="text-[11px] text-amber-400 font-semibold hover:underline block"
              >
                suporte@sigmaauto.com.br →
              </a>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 size={32} className="text-amber-400 animate-spin" />
              <p className="text-zinc-500 text-sm">Carregando manual...</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
              <p className="text-red-400 font-bold mb-2">Erro ao carregar manual</p>
              <p className="text-zinc-500 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div
              ref={contentRef}
              className="prose prose-invert prose-amber max-w-none
                prose-headings:font-black prose-headings:tracking-tight
                prose-h1:text-3xl prose-h1:gradient-text prose-h1:mb-8
                prose-h2:text-xl prose-h2:text-white prose-h2:mt-12 prose-h2:mb-4 prose-h2:border-b prose-h2:border-white/[0.06] prose-h2:pb-3
                prose-h3:text-base prose-h3:text-zinc-200 prose-h3:mt-6 prose-h3:mb-2
                prose-p:text-zinc-400 prose-p:leading-relaxed prose-p:text-sm
                prose-li:text-zinc-400 prose-li:text-sm
                prose-strong:text-white prose-strong:font-bold
                prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
                prose-code:text-amber-300 prose-code:bg-amber-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                prose-blockquote:border-l-amber-500 prose-blockquote:text-zinc-500
                prose-table:text-sm
                prose-th:text-white prose-th:font-bold prose-th:bg-white/5
                prose-td:text-zinc-400 prose-td:border-white/[0.06]
                prose-hr:border-white/[0.06]"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
