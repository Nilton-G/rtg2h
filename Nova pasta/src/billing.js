// ============================================================
// BILLING — camada de microtransações
//
// IMPORTANTE (leia antes de publicar):
// - Nesta versão o billing é MOCK: mostra um modal e credita o item
//   sem cobrar nada. Serve para testar a economia e o fluxo de compra.
// - Na Play Store é OBRIGATÓRIO usar o Google Play Billing. Basta
//   substituir MockBilling pela implementação nativa descrita em
//   README.md (seção "Publicar na Play Store").
// - Validação de recibo deve ser feita no servidor (nunca confie no app).
// ============================================================

import { PRODUCTS } from './data.js';

export class MockBilling {
  constructor({ save, ui }) {
    this.save = save;
    this.ui = ui;
    this.kind = 'mock';
    this.ready = true;
  }

  async init() {
    this.ready = true;
    return true;
  }

  products() {
    return PRODUCTS;
  }

  isOwned(productId) {
    const p = PRODUCTS.find((x) => x.id === productId);
    return !!p?.oneTime && this.save.hasPurchased(productId);
  }

  // Retorna { ok, cancelled, product, granted }
  async purchase(productId) {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return { ok: false, reason: 'produto-inexistente' };
    if (product.oneTime && this.save.hasPurchased(product.id)) {
      return { ok: false, reason: 'ja-comprado' };
    }

    const confirmed = await this.ui.confirmPurchase(product);
    if (!confirmed) return { ok: false, cancelled: true };

    const granted = this.save.grantProduct(product);
    return { ok: true, product, granted };
  }

  async restore() {
    // No mock, os direitos já estão no save local.
    return { ok: true, restored: this.save.data.purchases.length, kind: this.kind };
  }
}

// ------------------------------------------------------------
// ADAPTADOR PARA PLAY BILLING (exemplo de integração)
// Ative depois de instalar o plugin nativo (ex.: Capacitor +
// cordova-plugin-purchase). Mantido inerte por padrão.
// ------------------------------------------------------------
export class PlayBilling {
  constructor({ save, ui, store }) {
    this.save = save;
    this.ui = ui;
    this.store = store;
    this.kind = 'play';
    this.ready = false;
  }

  async init() {
    if (!this.store) {
      console.warn('[billing] PlayBilling sem store nativo; usando mock.');
      return false;
    }
    // Exemplo (cordova-plugin-purchase):
    // await this.store.register(PRODUCTS.map(p => ({ id: p.id, type: 'consumable', ... })))
    // await this.store.initialize([{ platform: 'google-play', options: { applicationId } }])
    this.ready = true;
    return true;
  }

  products() {
    return PRODUCTS;
  }

  isOwned(productId) {
    const p = PRODUCTS.find((x) => x.id === productId);
    return !!p?.oneTime && this.save.hasPurchased(productId);
  }

  async purchase(productId) {
    if (!this.ready) return { ok: false, reason: 'billing-indisponivel' };
    try {
      const transaction = await this.store.order(productId);
      await transaction.verify(); // ideal: verificação no seu servidor
      await transaction.finish();
      const product = PRODUCTS.find((p) => p.id === productId);
      const granted = this.save.grantProduct(product);
      return { ok: true, product, granted };
    } catch (e) {
      return { ok: false, reason: 'erro', error: String(e?.message || e) };
    }
  }

  async restore() {
    if (!this.ready) return { ok: false, restored: 0 };
    try {
      const owned = await this.store.restorePurchases();
      return { ok: true, restored: owned?.length || 0 };
    } catch {
      return { ok: false, restored: 0 };
    }
  }
}

export function createBilling(ctx) {
  const nativeStore = window?.Capacitor?.Plugins?.CdvPurchase || null;
  if (nativeStore) return new PlayBilling({ ...ctx, store: nativeStore });
  return new MockBilling(ctx);
}
