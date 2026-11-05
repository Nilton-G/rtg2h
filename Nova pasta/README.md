# 🚀 NEBULA VANGUARD

Shooter espacial **infinito** para celular, feito em HTML5 + Canvas puro (sem dependências).
Arraste para mover, a nave atira sozinha. Sobreviva às ondas, derrote chefes, junte créditos e cristais,
evolua a nave para sempre e colecione skins.

---

## 🎮 Como jogar

| Ação | Como |
|---|---|
| Mover | Arraste o dedo em qualquer lugar da tela (a nave acompanha o movimento) |
| Atirar | Automático |
| Bomba Nova | Botão roxo no canto inferior direito (limpa tiros e dá dano em todos) |
| Pausar | Botão ❚❚ no topo |
| Desktop | Setas / WASD para mover, **Espaço** para a Nova |

**Loop do jogo:** cada onda exige um número de abates. A cada 5 ondas aparece um **chefe**.
A dificuldade sobe para sempre e os setores se repetem em ciclo — não existe "fim".
Ao morrer você mantém tudo o que coletou: créditos, cristais e XP.

---

## 💠 Economia (como o jogo segura o jogador)

- **Créditos ◈** — moeda comum. Vêm de abates, moedas, onda limpa e baús.
- **Cristais ✦** — moeda premium. Vêm de chefes, ondas múltiplas de 10, missões diárias,
  conquistas, baús e da loja. **Dá para jogar de graça e conseguir cristais.**
- **XP / Nível de Piloto** — sobe com pontuação; cada nível dá cristais e créditos.
- **Melhorias permanentes** (8 trilhas, até 60 níveis): dano, cadência, casco, propulsores,
  ímã, crítico, bombas Nova e contrato de saque.
- **20 skins** com raridade (Comum → Mítico) e bônus de status. 3 míticas só saem em baús.
- **Baús** com probabilidades divulgadas: 62% comum / 28% raro / 8% épico / 1,8% lendário / 0,2% mítico no baú de sucata.
- **Missões diárias** (3 por dia), **conquistas**, **bônus diário com sequência de 7 dias**,
  **combo** que multiplica pontos e créditos, **revive por 30 cristais** (até 2 por partida)
  e **anúncio recompensado** (+15 cristais, 5x/dia).
- **Microtransações**: 6 pacotes de cristais (R$ 4,90 → R$ 199,90) + pacote inicial único com skin exclusiva.

> Os preços exibidos são placeholders. Na Play Store, os preços e IDs vêm do **Google Play Console**.

---

## 🗂 Estrutura

```
index.html            estrutura das telas + HUD
styles.css            tema neon, layout mobile, animações
manifest.webmanifest  PWA (instalável, fullscreen, portrait)
sw.js                 cache offline (funciona sem internet após 1º acesso)
src/
  main.js             boot, fluxo de partida, revive, finalização de run
  game.js             motor: ondas, chefes, projéteis, partículas, render das skins
  state.js            save em localStorage, economia, baús, missões, XP
  data.js             TODO o conteúdo/balanceamento (skins, upgrades, missões, produtos)
  ui.js               telas em DOM, loja, hangar, baús, modais
  audio.js            efeitos sonoros sintetizados via WebAudio (sem arquivos)
  billing.js          camada de microtransações (mock + adaptador Play Billing)
icons/                ícones PNG 192/512/maskable/1024 (Play Store)
scripts/
  serve.ps1           servidor local em PowerShell (sem Node/Python)
  make-icons.ps1      regenera os ícones
  build-www.ps1       copia o jogo para www/ (empacotamento Capacitor)
```

---

## ▶️ Rodar agora (Windows, sem Node)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/serve.ps1 -Port 5173
```

Abra `http://localhost:5173`. No celular, publique a pasta em qualquer hospedagem estática
(GitHub Pages, Cloudflare Pages, Netlify) e abra pelo navegador — dá para "Adicionar à tela inicial".

Servir por HTTPS é necessário para o service worker (offline) e para instalar como PWA.

---

## 📱 Publicar na Play Store

### Caminho A — Capacitor (recomendado, permite Play Billing nativo)

Requisitos: Node.js 18+, Android Studio (JDK 17) e conta de desenvolvedor Google Play (US$ 25 única).

```bash
# 1. copie o jogo para uma pasta web
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-www.ps1

# 2. crie o projeto Capacitor (na raiz)
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Nebula Vanguard" com.suaempresa.nebulavanguard --web-dir=www
npx cap add android
npx cap sync android
npx cap open android
```

No Android Studio: **Build → Generate Signed Bundle (AAB)**, crie a keystore
(**guarde-a para sempre** — sem ela você não consegue atualizar o app) e envie o AAB
no Play Console.

Ajustes no `android/app/src/main/AndroidManifest.xml`:
- `android:screenOrientation="portrait"` na Activity;
- remover a barra de status para o jogo ficar fullscreen.

`capacitor.config.json` já vem com `webDir: "www"` e `backgroundColor` do jogo.

### Caminho B — TWA / Bubblewrap (embrulha o PWA)

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://SEU-DOMINIO/manifest.webmanifest
bubblewrap build
```

Exige HTTPS válido, ícones 512 e o arquivo `assetlinks.json` publicado no domínio
(para o app abrir sem barra de navegador). Nesse caminho, cobranças precisam usar
**Play Billing** via Digital Goods API + Payment Request — o caminho A é mais simples.

### Checklist de publicação

- [ ] Ícone 512×512 (`icons/icon-512.png`) e gráfico de destaque 1024×500.
- [ ] Screenshots do jogo (mínimo 2) em pelo menos 2 tamanhos de tela.
- [ ] Política de privacidade pública (mesmo que o jogo não colete dados).
- [ ] **Data safety**: jogo offline, sem coleta — declarar compras no app.
- [ ] Classificação de conteúdo (violência leve de fantasia; sem sangue).
- [ ] Público-alvo: marcar **13+** se houver compras no app (evita políticas de família).
- [ ] **Anúncios**: declarar que existe anúncio recompensado (se ativar AdMob).
- [ ] **Loot boxes**: as probabilidades já estão divulgadas em cada baú (exigência do Google).
- [ ] Testar em dispositivo real: arraste, pausa, revive, compra, offline.

### Ativar microtransações reais

Hoje `src/billing.js` usa **MockBilling** (compra simulada, nenhuma cobrança).
Para valer dinheiro de verdade:

1. No Play Console → **Monetizar → Produtos no app**, crie um produto consumível para cada
   ID de `PRODUCTS` em `src/data.js` (ex.: `crystals_700`), com o mesmo preço.
2. Instale um plugin de billing nativo, por exemplo:
   ```bash
   npm i cordova-plugin-purchase
   npx cap sync android
   ```
3. Em `src/billing.js`, `createBilling()` já detecta `Capacitor.Plugins.CdvPurchase`
   e usa `PlayBilling`. Complete o `init()` com o registro dos produtos
   (o arquivo traz o exemplo comentado) e o `applicationId`.
4. **Valide o recibo no servidor** antes de creditar cristais. Nunca confie apenas no app:
   o `grantProduct()` local é suficiente só para teste.
5. Para produtos não consumíveis (pacote inicial), use `type: 'non-consumable'` e
   implemente `restore()` com `store.restorePurchases()`.

### Ativar anúncio recompensado

Instale `@capacitor-community/admob`, carregue um rewarded ad e chame
`save.claimAdReward()` **somente** no callback de recompensa. O modal de simulação
está em `UI.watchAd()` (`src/ui.js`).

---

## ⚖️ Avisos importantes

- **Compras simuladas por padrão.** Não publique sem trocar o billing: a loja mostraria
  "compra concluída" sem cobrar.
- O save é local (`localStorage`). Limpar dados do app apaga o progresso.
  Para sincronizar entre aparelhos seria necessário back-end/Play Games Saved Games.
- Todo o balanceamento (dificuldade, preços, probabilidades, recompensas) está em
  `src/data.js`, fácil de ajustar sem mexer no motor.
