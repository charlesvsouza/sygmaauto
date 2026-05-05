'use client'

import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, User } from 'lucide-react'

const posts = [
  {
    slug: 'como-aumentar-faturamento-oficina',
    title: 'Como aumentar o faturamento da sua oficina em 30% com gestão digital',
    excerpt: 'Descubra os principais gargalos que fazem oficinas perderem dinheiro sem perceber — e como a tecnologia resolve cada um deles.',
    author: 'Equipe SygmaAuto',
    date: '28 abr 2026',
    readTime: '5 min',
    tag: 'Gestão',
    tagColor: '#f59e0b',
    cover: null,
  },
  {
    slug: 'whatsapp-atendimento-oficina',
    title: 'Por que o WhatsApp mudou o atendimento ao cliente em oficinas mecânicas',
    excerpt: 'Clientes modernos esperam agilidade. Veja como notificações automáticas reduzem ligações e aumentam a satisfação em até 40%.',
    author: 'Equipe SygmaAuto',
    date: '20 abr 2026',
    readTime: '4 min',
    tag: 'Atendimento',
    tagColor: '#22c55e',
    cover: null,
  },
  {
    slug: 'controle-estoque-pecas',
    title: 'Controle de estoque de peças: o erro que custa caro na maioria das oficinas',
    excerpt: 'Estoque zerado no momento errado é prejuízo certo. Entenda como montar um sistema de reposição automática e nunca mais parar um serviço por falta de peça.',
    author: 'Equipe SygmaAuto',
    date: '14 abr 2026',
    readTime: '6 min',
    tag: 'Estoque',
    tagColor: '#6366f1',
    cover: null,
  },
  {
    slug: 'ia-para-oficinas-mecanicas',
    title: 'Inteligência Artificial em oficinas mecânicas: ficção científica ou realidade?',
    excerpt: 'A IA já está ajudando mecânicos a diagnosticar falhas, sugerir peças e agilizar orçamentos. Veja como funciona na prática.',
    author: 'Equipe SygmaAuto',
    date: '8 abr 2026',
    readTime: '7 min',
    tag: 'Tecnologia',
    tagColor: '#ea580c',
    cover: null,
  },
  {
    slug: 'kpis-gestao-oficina',
    title: 'Os 7 KPIs que todo dono de oficina precisa acompanhar todo mês',
    excerpt: 'Ticket médio, taxa de retorno, TMO e mais — descubra quais indicadores revelam a saúde real do seu negócio.',
    author: 'Equipe SygmaAuto',
    date: '2 abr 2026',
    readTime: '8 min',
    tag: 'Gestão',
    tagColor: '#f59e0b',
    cover: null,
  },
  {
    slug: 'retifica-motor-gestao',
    title: 'Gestão de retífica de motor: por que é diferente e exige um sistema especializado',
    excerpt: 'Retífica tem fluxo técnico próprio — desmontagem, metrologia, laudo, remontagem. Veja como digitalizar esse processo sem perder rastreabilidade.',
    author: 'Equipe SygmaAuto',
    date: '26 mar 2026',
    readTime: '5 min',
    tag: 'Retífica',
    tagColor: '#0ea5e9',
    cover: null,
  },
]

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[#060608]">
      {/* Hero */}
      <div className="relative pt-28 pb-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm font-medium transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            Voltar ao site
          </Link>
          <span className="inline-block text-xs font-black uppercase tracking-widest text-amber-500 mb-4 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            Blog
          </span>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight mt-2 mb-4">
            Conteúdo para{' '}
            <span className="gradient-text">crescer</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl">
            Dicas, tutoriais e insights sobre gestão de oficinas, tecnologia automotiva e mercado.
          </p>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-7xl mx-auto px-6 pb-28">
        {/* Featured post */}
        <div className="mb-8">
          <div className="rounded-3xl border border-white/[0.07] bg-[#0f0f12] p-8 lg:p-10 hover:border-amber-500/20 transition-all duration-300 group cursor-pointer">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Cover placeholder */}
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/10 flex items-center justify-center order-2 lg:order-1">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-3">
                    <span className="text-2xl">📈</span>
                  </div>
                  <p className="text-zinc-600 text-xs">Imagem em breve</p>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <span
                  className="inline-block text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4"
                  style={{ background: posts[0].tagColor + '20', color: posts[0].tagColor, border: `1px solid ${posts[0].tagColor}40` }}
                >
                  {posts[0].tag}
                </span>
                <h2 className="text-2xl lg:text-3xl font-black text-white mb-3 leading-tight group-hover:text-amber-400 transition-colors">
                  {posts[0].title}
                </h2>
                <p className="text-zinc-400 text-sm leading-relaxed mb-5">{posts[0].excerpt}</p>
                <div className="flex items-center gap-4 text-zinc-600 text-xs">
                  <span className="flex items-center gap-1"><User size={11} /> {posts[0].author}</span>
                  <span>{posts[0].date}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {posts[0].readTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.slice(1).map((post) => (
            <article
              key={post.slug}
              className="group rounded-3xl border border-white/[0.07] bg-[#0f0f12] p-7 hover:border-white/15 transition-all duration-300 cursor-pointer flex flex-col"
            >
              {/* Mini cover */}
              <div className="aspect-[16/7] rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.05] flex items-center justify-center mb-5">
                <span className="text-3xl">
                  {post.tag === 'Atendimento' ? '💬' : post.tag === 'Estoque' ? '📦' : post.tag === 'Tecnologia' ? '🤖' : post.tag === 'Retífica' ? '⚙️' : '📊'}
                </span>
              </div>

              <span
                className="inline-block self-start text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3"
                style={{ background: post.tagColor + '18', color: post.tagColor, border: `1px solid ${post.tagColor}35` }}
              >
                {post.tag}
              </span>
              <h3 className="font-black text-white text-base leading-snug mb-3 group-hover:text-amber-400 transition-colors flex-1">
                {post.title}
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
              <div className="flex items-center gap-3 text-zinc-700 text-[11px] pt-4 border-t border-white/[0.05]">
                <span>{post.date}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {post.readTime} de leitura</span>
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="mt-16 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 to-orange-600/4 p-10 text-center">
          <h3 className="text-2xl font-black text-white mb-2">Receba novos artigos no seu e-mail</h3>
          <p className="text-zinc-400 text-sm mb-6">Conteúdo semanal sobre gestão de oficinas. Sem spam.</p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="seu@email.com.br"
              required
              className="flex-1 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/40 transition-all"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold hover:shadow-gold transition-all whitespace-nowrap"
            >
              Assinar grátis
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
