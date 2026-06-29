'use client'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { X, Download, Share } from 'lucide-react'

export function InstallBanner() {
  const { showBanner, install, dismiss, isIOS, deferredPrompt } = useInstallPrompt()

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-fade-in-up">
      <div className="card border-2 border-brand-200 shadow-float">
        <div className="flex items-start gap-3">
          {/* Ícone */}
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center shrink-0">
            <img src="/icons/icon-192.png" alt="Logo" className="w-10 h-10 rounded-xl object-cover" 
              onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-neutral-900 text-sm">Instale o Guedes Pet</p>
            {isIOS ? (
              <p className="text-xs text-neutral-500 mt-0.5">
                Toque em <Share className="inline w-3 h-3 mx-0.5" /> depois em{' '}
                <strong>"Adicionar à Tela de Início"</strong>
              </p>
            ) : (
              <p className="text-xs text-neutral-500 mt-0.5">
                Acesse mais rápido com o app instalado no seu celular
              </p>
            )}
          </div>

          {/* Fechar */}
          <button 
            onClick={dismiss}
            className="text-neutral-400 hover:text-neutral-600 shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Botão instalar (Android/Desktop) */}
        {!isIOS && deferredPrompt && (
          <button
            onClick={install}
            className="btn-primary w-full mt-3 flex items-center justify-center gap-2 py-2.5 text-sm"
          >
            <Download className="w-4 h-4" />
            Instalar agora
          </button>
        )}
      </div>
    </div>
  )
}
