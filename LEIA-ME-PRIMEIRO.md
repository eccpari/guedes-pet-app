# 🐾 Guedes Pet App — Guia de Implantação

## O que você vai precisar
- Conta no **GitHub** (sua mesmo)
- Conta no **Supabase** (https://supabase.com — grátis)
- Conta no **Vercel** (https://vercel.com — grátis)
- O logo da sua irmã em PNG

---

## PASSO 1 — Criar o repositório no GitHub

1. Acesse https://github.com e faça login
2. Clique em **"New repository"** (botão verde)
3. Nome: `guedes-pet-app`
4. Deixe **Público** (ou Privado se preferir)
5. Clique em **"Create repository"**
6. Na próxima tela, clique em **"uploading an existing file"**
7. Faça upload de **todos os arquivos** desta pasta (arraste a pasta inteira)
8. Clique em **"Commit changes"**

---

## PASSO 2 — Configurar o Supabase

1. Acesse https://supabase.com e crie uma conta
2. Clique em **"New project"**
   - Nome: `guedes-pet`
   - Senha do banco: anote em algum lugar seguro
   - Região: South America (São Paulo) — mais rápido no Brasil
3. Aguarde o projeto criar (1-2 minutos)

### Rodar o Schema do banco de dados
4. No menu esquerdo, clique em **"SQL Editor"**
5. Clique em **"New query"**
6. Copie TODO o conteúdo do arquivo `supabase-schema.sql`
7. Cole no editor e clique em **"Run"** (ou Ctrl+Enter)
8. Deve aparecer "Success" no final ✅

### Pegar as chaves de API
9. No menu esquerdo, clique em **"Project Settings"** (ícone de engrenagem)
10. Clique em **"API"**
11. Anote:
    - `URL` → será o `NEXT_PUBLIC_SUPABASE_URL`
    - `anon public` → será o `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `service_role` (clique em "Reveal") → será o `SUPABASE_SERVICE_ROLE_KEY`

### Criar o admin (sua irmã)
12. No menu esquerdo, clique em **"Authentication"**
13. Clique em **"Users"** → **"Add user"** → **"Create new user"**
14. Email: o e-mail da sua irmã
15. Password: uma senha temporária (ela vai trocar depois)
16. Clique em **"Create user"**
17. Agora vá em **"SQL Editor"** e rode:
```sql
UPDATE public.profiles 
SET role = 'admin', nome = 'Guedes Pet Admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'email-da-sua-irma@gmail.com');
```
(troque pelo e-mail real dela)

---

## PASSO 3 — Gerar chaves para Notificações Push

As notificações push precisam de chaves especiais (VAPID).

### Opção A: Usar gerador online (mais fácil)
Acesse: https://web-push-codelab.glitch.me/
Clique em **"Generate Keys"** e copie a Public Key e a Private Key.

### Opção B: Gerar no terminal (se tiver Node instalado)
```bash
npx web-push generate-vapid-keys
```

Anote:
- `Public Key` → será o `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `Private Key` → será o `VAPID_PRIVATE_KEY`

---

## PASSO 4 — Subir o logo

1. Prepare o logo da sua irmã em PNG:
   - Crie versões: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512 pixels
   - Uma dica: use https://realfavicongenerator.net — você faz upload do logo e ele gera todos os tamanhos!
2. Renomeie os arquivos como: `icon-72.png`, `icon-96.png`, etc.
3. Adicione também `apple-touch-icon.png` (180x180px)
4. Faça upload desses arquivos na pasta `public/icons/` do seu repositório GitHub
5. Para o logo que aparece na tela inicial: coloque o logo original como `public/icons/logo.png`

---

## PASSO 5 — Deploy no Vercel

1. Acesse https://vercel.com e crie uma conta (pode entrar com o GitHub)
2. Clique em **"New Project"**
3. Encontre o repositório `guedes-pet-app` e clique em **"Import"**
4. Na tela de configuração, procure **"Environment Variables"** e adicione:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | (a URL do Supabase, passo 2.11) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (a anon key, passo 2.11) |
| `SUPABASE_SERVICE_ROLE_KEY` | (a service role key, passo 2.11) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | (a public key VAPID, passo 3) |
| `VAPID_PRIVATE_KEY` | (a private key VAPID, passo 3) |
| `VAPID_EMAIL` | `mailto:email-da-sua-irma@gmail.com` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `5511999999999` (número com DDI e DDD, só números) |
| `NEXT_PUBLIC_APP_URL` | (deixe em branco por agora, coloque depois) |

5. Clique em **"Deploy"**
6. Aguarde (2-3 minutos) ☕
7. Quando terminar, você vai receber uma URL tipo: `https://guedes-pet-app.vercel.app`
8. Copie essa URL e adicione nas variáveis de ambiente:
   - Vá em Settings → Environment Variables → adicione `NEXT_PUBLIC_APP_URL` = `https://guedes-pet-app.vercel.app`
9. Vá em **"Deployments"** e clique em **"Redeploy"** para aplicar a última variável

---

## PASSO 6 — Testar o app

1. Acesse a URL que o Vercel gerou
2. Faça login com o e-mail e senha que criou para a sua irmã
3. Teste cada função
4. Para instalar no celular:
   - **Android/Chrome**: vai aparecer o banner automático "Instalar app"
   - **iPhone/Safari**: toque no ícone de compartilhar ↑ → "Adicionar à Tela de Início"

---

## PASSO 7 — Criar o link de convite para clientes

Após o deploy, o link de cadastro para clientes é simplesmente:
```
https://guedes-pet-app.vercel.app/cadastro
```

Sua irmã pode:
- Compartilhar esse link no WhatsApp
- Gerar um QR Code em: https://qr.io (grátis) com a URL acima
- Imprimir o QR e deixar na loja

---

## Domínio personalizado (opcional, depois)

Se quiser um domínio tipo `app.guedespet.com.br`:
1. Compre o domínio (Registro.br, Hostinger, GoDaddy...)
2. No Vercel → seu projeto → Settings → Domains
3. Clique "Add Domain" e siga as instruções

---

## Atualizações futuras

Quando precisar mudar algo no app:
1. Edite os arquivos no GitHub (botão de lápis ✏️)
2. O Vercel vai detectar automaticamente e atualizar o app em 2-3 minutos

---

## Suporte / Dúvidas

Qualquer problema, entre em contato e podemos resolver juntos! 🐾
