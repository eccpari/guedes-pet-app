'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingCart, Plus, Minus, Package, Check, X, Trash2, PlusCircle, Edit2, Archive } from 'lucide-react'
import { Produto, ItemCarrinho, Profile } from '@/types'
import { BottomNav } from '@/components/layout/BottomNav'
import { useAuth } from '@/components/AuthProvider'
import Image from 'next/image'
import clsx from 'clsx'

export default function ProdutosPage() {
  const supabase = createClient()
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [tab, setTab] = useState<'loja' | 'reservas' | 'gerenciar'>('loja')
  const [reservas, setReservas] = useState<any[]>([])
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const [modalProduto, setModalProduto] = useState(false)
  const [produtoEdit, setProdutoEdit] = useState<Partial<Produto> | null>(null)
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [foto, setFoto] = useState<File | null>(null)

  const isAdmin = profile?.role === 'admin'
  const isFuncionario = profile?.role === 'funcionario'
  const isStaff = isAdmin || isFuncionario

  useEffect(() => {
    const init = async () => {
      const user = authUser
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
    }
    init()
    carregarProdutos()
  }, [])

  useEffect(() => {
    if (tab === 'reservas' && isStaff) carregarReservas()
  }, [tab, isStaff])

  const carregarProdutos = async () => {
    const { data } = await supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .order('nome')
    setProdutos(data || [])
  }

  const carregarReservas = async () => {
    const { data } = await supabase
      .from('reservas')
      .select('*, cliente:profiles(nome, telefone), itens:reserva_itens(*, produto:produtos(nome, preco))')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
    setReservas(data || [])
  }

  const addCarrinho = (produto: Produto) => {
    setCarrinho(prev => {
      const existing = prev.find(i => i.produto.id === produto.id)
      if (existing) return prev.map(i => i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      return [...prev, { produto, quantidade: 1 }]
    })
  }

  const removeCarrinho = (id: string) => {
    setCarrinho(prev => prev.map(i => i.produto.id === id ? { ...i, quantidade: Math.max(0, i.quantidade - 1) } : i).filter(i => i.quantidade > 0))
  }

  const totalCarrinho = carrinho.reduce((sum, i) => sum + i.produto.preco * i.quantidade, 0)
  const qtdCarrinho = carrinho.reduce((sum, i) => sum + i.quantidade, 0)

  const confirmarReserva = async () => {
    if (carrinho.length === 0 || !profile) return
    setLoading(true)

    const { data: reserva } = await supabase
      .from('reservas')
      .insert({ cliente_id: profile.id, status: 'pendente' })
      .select()
      .single()

    if (reserva) {
      await supabase.from('reserva_itens').insert(
        carrinho.map(i => ({
          reserva_id: reserva.id,
          produto_id: i.produto.id,
          quantidade: i.quantidade,
          preco_unitario: i.produto.preco,
        }))
      )

      // Notificar admin
      await fetch('/api/notificacoes/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: '🛍️ Nova Reserva!',
          corpo: `${profile.nome} reservou ${qtdCarrinho} item(s) - R$ ${totalCarrinho.toFixed(2)}`,
          url: '/produtos',
          paraAdmin: true,
        }),
      })

      setCarrinho([])
      setCarrinhoAberto(false)
      setSucesso('Reserva feita! Venha buscar na loja 🎉')
      setTimeout(() => setSucesso(''), 4000)
    }
    setLoading(false)
  }

  const marcarEntregue = async (id: string) => {
    await supabase.from('reservas').update({ status: 'entregue' }).eq('id', id)
    carregarReservas()
  }

  const salvarProduto = async () => {
    if (!produtoEdit?.nome || !produtoEdit?.preco) return
    setLoading(true)

    let fotoUrl = produtoEdit.foto_url

    if (foto) {
      const ext = foto.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { data: upload } = await supabase.storage.from('produtos').upload(path, foto)
      if (upload) {
        const { data: url } = supabase.storage.from('produtos').getPublicUrl(path)
        fotoUrl = url.publicUrl
      }
    }

    if (produtoEdit.id) {
      await supabase.from('produtos').update({
        nome: produtoEdit.nome,
        descricao: produtoEdit.descricao,
        preco: produtoEdit.preco,
        foto_url: fotoUrl,
        controla_estoque: produtoEdit.controla_estoque,
        estoque: produtoEdit.controla_estoque ? produtoEdit.estoque : null,
      }).eq('id', produtoEdit.id)
    } else {
      await supabase.from('produtos').insert({
        nome: produtoEdit.nome,
        descricao: produtoEdit.descricao,
        preco: produtoEdit.preco,
        foto_url: fotoUrl,
        controla_estoque: produtoEdit.controla_estoque || false,
        estoque: produtoEdit.controla_estoque ? produtoEdit.estoque : null,
      })
    }

    setModalProduto(false)
    setProdutoEdit(null)
    setFoto(null)
    carregarProdutos()
    setLoading(false)
  }

  const arquivarProduto = async (id: string) => {
    await supabase.from('produtos').update({ ativo: false }).eq('id', id)
    carregarProdutos()
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <div className="bg-brand-600 text-white px-4 pt-12 pb-4 safe-top">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Produtos</h1>
            <p className="text-brand-100 text-sm mt-0.5">Reserve e busque na loja</p>
          </div>
          {/* Carrinho */}
          {!isStaff && (
            <button onClick={() => setCarrinhoAberto(true)} className="relative bg-white/20 p-2.5 rounded-2xl">
              <ShoppingCart className="w-6 h-6" />
              {qtdCarrinho > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-400 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {qtdCarrinho}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tabs (staff) */}
      {isStaff && (
        <div className="flex bg-white border-b border-neutral-100 px-4 gap-1 pt-2">
          {['loja','reservas','gerenciar'].map(t => (
            <button key={t} onClick={() => setTab(t as any)}
              className={clsx('flex-1 py-2.5 text-sm font-semibold rounded-t-xl capitalize transition-all',
                tab === t ? 'bg-brand-50 text-brand-700 border-b-2 border-brand-500' : 'text-neutral-500'
              )}>
              {t === 'loja' ? 'Loja' : t === 'reservas' ? 'Reservas' : 'Gerenciar'}
            </button>
          ))}
        </div>
      )}

      {/* Grid de produtos */}
      {tab === 'loja' && (
        <div className="px-4 pt-4 grid grid-cols-2 gap-3">
          {produtos.map(produto => {
            const noCarrinho = carrinho.find(i => i.produto.id === produto.id)
            const semEstoque = produto.controla_estoque && (produto.estoque ?? 0) <= 0

            return (
              <div key={produto.id} className="card overflow-hidden p-0">
                {/* Foto */}
                <div className="bg-neutral-100 h-36 flex items-center justify-center overflow-hidden relative">
                  {produto.foto_url ? (
                    <img src={produto.foto_url} alt={produto.nome}
                      className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-12 h-12 text-neutral-300" />
                  )}
                  {semEstoque && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-xs font-bold bg-red-500 px-2 py-1 rounded-full">Esgotado</span>
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <p className="font-bold text-sm text-neutral-900 leading-tight">{produto.nome}</p>
                  {produto.descricao && (
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{produto.descricao}</p>
                  )}
                  <p className="text-brand-600 font-bold text-base mt-1.5">
                    R$ {produto.preco.toFixed(2)}
                  </p>

                  {/* Controles de quantidade */}
                  {!isStaff && !semEstoque && (
                    <div className="flex items-center justify-between mt-2">
                      {noCarrinho ? (
                        <div className="flex items-center gap-2 w-full">
                          <button onClick={() => removeCarrinho(produto.id)}
                            className="w-8 h-8 bg-neutral-100 rounded-xl flex items-center justify-center">
                            <Minus className="w-4 h-4 text-neutral-700" />
                          </button>
                          <span className="font-bold text-neutral-900 flex-1 text-center">
                            {noCarrinho.quantidade}
                          </span>
                          <button onClick={() => addCarrinho(produto)}
                            className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center">
                            <Plus className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => addCarrinho(produto)}
                          className="btn-primary py-2 px-4 text-sm w-full flex items-center justify-center gap-1">
                          <Plus className="w-4 h-4" />
                          Adicionar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {produtos.length === 0 && (
            <div className="col-span-2 text-center py-12 text-neutral-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum produto disponível</p>
            </div>
          )}
        </div>
      )}

      {/* Reservas (staff) */}
      {tab === 'reservas' && isStaff && (
        <div className="px-4 pt-4 space-y-3">
          {reservas.map(r => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-neutral-900">{r.cliente?.nome}</p>
                  <p className="text-xs text-neutral-500">{r.cliente?.telefone}</p>
                </div>
                <button onClick={() => marcarEntregue(r.id)}
                  className="flex items-center gap-1 bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl">
                  <Check className="w-3.5 h-3.5" /> Entregue
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {r.itens?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-neutral-700">{item.produto?.nome} × {item.quantidade}</span>
                    <span className="text-neutral-500">R$ {(item.preco_unitario * item.quantidade).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {reservas.length === 0 && (
            <div className="text-center py-12 text-neutral-400">
              <Check className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma reserva pendente</p>
            </div>
          )}
        </div>
      )}

      {/* Gerenciar (staff) */}
      {tab === 'gerenciar' && isStaff && (
        <div className="px-4 pt-4 space-y-3">
          <button onClick={() => { setProdutoEdit({}); setModalProduto(true) }}
            className="btn-primary w-full flex items-center justify-center gap-2">
            <PlusCircle className="w-5 h-5" /> Novo Produto
          </button>

          {produtos.map(p => (
            <div key={p.id} className="card flex items-center gap-3">
              <div className="w-14 h-14 bg-neutral-100 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center">
                {p.foto_url ? <img src={p.foto_url} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-neutral-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{p.nome}</p>
                <p className="text-brand-600 text-sm font-semibold">R$ {p.preco.toFixed(2)}</p>
                {p.controla_estoque && <p className="text-xs text-neutral-500">Estoque: {p.estoque}</p>}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => { setProdutoEdit(p); setModalProduto(true) }}
                  className="w-9 h-9 bg-neutral-100 rounded-xl flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-neutral-600" />
                </button>
                <button onClick={() => arquivarProduto(p.id)}
                  className="w-9 h-9 bg-neutral-100 rounded-xl flex items-center justify-center">
                  <Archive className="w-4 h-4 text-neutral-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal produto */}
      {modalProduto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-4xl p-6 max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <h2 className="text-lg font-bold mb-4">{produtoEdit?.id ? 'Editar' : 'Novo'} Produto</h2>
            <div className="space-y-3">
              <div><label className="label">Nome</label>
                <input className="input" value={produtoEdit?.nome || ''} onChange={e => setProdutoEdit({ ...produtoEdit, nome: e.target.value })} /></div>
              <div><label className="label">Descrição</label>
                <textarea className="input resize-none" rows={2} value={produtoEdit?.descricao || ''} onChange={e => setProdutoEdit({ ...produtoEdit, descricao: e.target.value })} /></div>
              <div><label className="label">Preço (R$)</label>
                <input className="input" type="number" step="0.01" value={produtoEdit?.preco || ''} onChange={e => setProdutoEdit({ ...produtoEdit, preco: parseFloat(e.target.value) })} /></div>
              <div><label className="label">Foto</label>
                <input type="file" accept="image/*" className="input" onChange={e => setFoto(e.target.files?.[0] || null)} /></div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={produtoEdit?.controla_estoque || false}
                  onChange={e => setProdutoEdit({ ...produtoEdit, controla_estoque: e.target.checked })} />
                <span className="text-sm font-semibold text-neutral-700">Controlar estoque</span>
              </label>
              {produtoEdit?.controla_estoque && (
                <div><label className="label">Quantidade em estoque</label>
                  <input className="input" type="number" value={produtoEdit?.estoque || 0}
                    onChange={e => setProdutoEdit({ ...produtoEdit, estoque: parseInt(e.target.value) })} /></div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalProduto(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={salvarProduto} disabled={loading} className="btn-primary flex-1">{loading ? '...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Carrinho */}
      {carrinhoAberto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-4xl p-6 max-h-[80vh] overflow-y-auto animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Seu Carrinho</h2>
              <button onClick={() => setCarrinhoAberto(false)}><X className="w-6 h-6 text-neutral-500" /></button>
            </div>

            {carrinho.length === 0 ? (
              <p className="text-neutral-400 text-center py-8">Carrinho vazio</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {carrinho.map(({ produto, quantidade }) => (
                    <div key={produto.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{produto.nome}</p>
                        <p className="text-xs text-neutral-500">R$ {produto.preco.toFixed(2)} × {quantidade}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => removeCarrinho(produto.id)} className="w-7 h-7 bg-neutral-100 rounded-lg flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-sm">{quantidade}</span>
                        <button onClick={() => addCarrinho(produto)} className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
                          <Plus className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-neutral-100 pt-3 mb-4">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-brand-600">R$ {totalCarrinho.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">Pagamento na loja no momento da retirada</p>
                </div>
                <button onClick={confirmarReserva} disabled={loading} className="btn-primary w-full">
                  {loading ? '...' : '✅ Confirmar Reserva'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {sucesso && (
        <div className="fixed top-20 left-4 right-4 z-50 bg-brand-500 text-white px-5 py-4 rounded-3xl shadow-float text-center font-semibold animate-fade-in-up">
          {sucesso}
        </div>
      )}

      <BottomNav profile={profile} />
    </div>
  )
}
