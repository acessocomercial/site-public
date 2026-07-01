/**
 * Storefront Vanilla JS Template
 *
 * Professional e-commerce frontend using the Storefront API.
 * No SDK, no build step — just fetch() and httpOnly cookies.
 *
 * Deploy alongside index.html and styles.css to your store's domain.
 * The browser sends httpOnly cookies automatically (same-domain).
 */

const GRAPHQL_ENDPOINT = '/api/storefront/graphql';
const CHECKOUT_URL = '/checkout';

let allProducts = [];
let filteredProducts = [];
let cartProducts = [];
let cartTotal = 0;
let detailQty = 1;
let toastTimer = null;
let searchDebounce = null;

// ── GraphQL Client ──

const graphql = async (query, variables = {}) => {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    credentials: 'include',
  });

  if (response.status === 429) {
    throw new Error('Limite de requisições atingido. Tente novamente em instantes.');
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data;
};

// ── Toast ──

const showToast = (message) => {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2500);
};

// ── Navigation ──

const navigateTo = (page, data) => {
  const home = document.getElementById('page-home');
  const product = document.getElementById('page-product');
  const infoPage = document.getElementById('page-info');
  const footer = document.getElementById('footer');

  home.style.display = 'none';
  product.className = 'product-detail';
  infoPage.style.display = 'none';
  footer.style.display = '';

  if (page === 'home') {
    home.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (page === 'product') {
    showProductDetail(data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (page === 'info') {
    showInfoPage(data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const goToCheckout = () => {
  window.location.href = CHECKOUT_URL;
};

// ── Store ──

let storeName = 'Store';

const loadStore = async () => {
  try {
    const data = await graphql(
      `query GetStore($hostname: String!) {
        client(hostname: $hostname) { store { name image { url } } }
      }`,
      { hostname: getHostname() }
    );
    const store = data.client?.store;
    if (store) {
      storeName = store.name || 'Store';
      document.getElementById('logo').textContent = storeName;
      document.getElementById('footer-logo').textContent = storeName;
      document.getElementById('footer-name').textContent = storeName;
      document.title = storeName;
    }
  } catch (_error) {
    /* store info optional */
  }
};

// ── Products ──

const loadProducts = async () => {
  try {
    const data = await graphql(
      `query ListProducts($hostname: String!, $count: Int) {
        client(hostname: $hostname) {
          products(count: $count) {
            edges { node { id title price description images { url } } }
          }
        }
      }`,
      { hostname: getHostname(), count: 40 }
    );

    allProducts = (data.client?.products?.edges || []).map((e) => e.node);
    filteredProducts = [...allProducts];
    document.getElementById('product-count').textContent = `${allProducts.length} produtos`;
    renderProducts(filteredProducts);
  } catch (error) {
    document.getElementById('product-grid').innerHTML =
      `<p style="color:var(--color-text-muted);grid-column:1/-1;text-align:center;padding:60px 0;">Erro ao carregar produtos: ${escapeHtml(error.message)}</p>`;
  }
};

const searchProducts = async (query) => {
  const trimmed = query.trim();

  if (!trimmed) {
    filteredProducts = [...allProducts];
    document.getElementById('product-count').textContent = `${allProducts.length} produtos`;
    renderProducts(filteredProducts);
    return;
  }

  try {
    const data = await graphql(
      `query SearchProducts($hostname: String!, $search: String, $count: Int) {
        client(hostname: $hostname) {
          products(search: $search, count: $count) {
            edges { node { id title price description images { url } } }
          }
        }
      }`,
      { hostname: getHostname(), search: trimmed, count: 40 }
    );

    filteredProducts = (data.client?.products?.edges || []).map((e) => e.node);
    document.getElementById('product-count').textContent = `${filteredProducts.length} produtos`;
    renderProducts(filteredProducts);
  } catch (_error) {
    filteredProducts = allProducts.filter((p) =>
      p.title.toLowerCase().includes(trimmed.toLowerCase())
    );
    document.getElementById('product-count').textContent = `${filteredProducts.length} produtos`;
    renderProducts(filteredProducts);
  }
};

const filterProducts = (query) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => searchProducts(query), 350);
};

const renderProducts = (products) => {
  const grid = document.getElementById('product-grid');

  if (products.length === 0) {
    grid.innerHTML = '<p style="color:var(--color-text-muted);grid-column:1/-1;text-align:center;padding:60px 0;">Nenhum produto encontrado.</p>';
    return;
  }

  grid.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-ac-product-id="${product.id}" data-ac-price="${product.price}">
      <div class="product-card-image" onclick="navigateTo('product', '${product.id}')">
        <img src="${product.images?.[0]?.url || 'https://placehold.co/400x533/f1f3f5/adb5bd?text=Sem+imagem'}" alt="${escapeHtml(product.title)}" loading="lazy" />
        <div class="product-card-overlay">
          <button class="quick-add-btn" onclick="event.stopPropagation(); addToCart('${product.id}')">Adicionar ao carrinho</button>
        </div>
      </div>
      <div class="product-card-info" onclick="navigateTo('product', '${product.id}')" style="cursor:pointer;">
        <div class="product-card-title">${escapeHtml(product.title)}</div>
        <div class="product-card-price">R$ ${formatPrice(product.price)}</div>
      </div>
    </div>`
    )
    .join('');
};

// ── Product Detail ──

const showProductDetail = (productId) => {
  const product = allProducts.find((p) => p.id === productId) ||
    filteredProducts.find((p) => p.id === productId);
  if (!product) return;

  detailQty = 1;
  const container = document.getElementById('page-product');
  container.innerHTML = `
    <span class="product-detail-back" onclick="navigateTo('home')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Voltar aos produtos
    </span>
    <div class="product-detail-grid">
      <div class="product-detail-image">
        <img src="${product.images?.[0]?.url || 'https://placehold.co/600x600/f1f3f5/adb5bd?text=Sem+imagem'}" alt="${escapeHtml(product.title)}" />
      </div>
      <div class="product-detail-info">
        <h1 class="product-detail-title">${escapeHtml(product.title)}</h1>
        <div class="product-detail-price">R$ ${formatPrice(product.price)}</div>
        <p class="product-detail-desc">${escapeHtml(product.description || 'Sem descrição disponível para este produto.')}</p>
        <div class="qty-selector">
          <button onclick="changeQty(-1)" aria-label="Diminuir quantidade">−</button>
          <span id="detail-qty">1</span>
          <button onclick="changeQty(1)" aria-label="Aumentar quantidade">+</button>
        </div>
        <div class="product-detail-actions">
          <button class="btn-primary" onclick="addToCartFromDetail('${product.id}')" style="flex:1;">Adicionar ao carrinho</button>
        </div>
      </div>
    </div>
  `;
  container.className = 'product-detail active';
};

const changeQty = (delta) => {
  detailQty = Math.max(1, detailQty + delta);
  const el = document.getElementById('detail-qty');
  if (el) el.textContent = detailQty;
};

const addToCartFromDetail = async (productId) => {
  await addToCart(productId, detailQty);
  detailQty = 1;
  const el = document.getElementById('detail-qty');
  if (el) el.textContent = '1';
};

// ── Cart ──

const addToCart = async (productId, quantity = 1) => {
  try {
    const data = await graphql(
      `mutation AddToCart($input: AddShoppingCartItemMutationInput!) {
        addShoppingCartItem(input: $input) {
          shoppingCart {
            products { id title price quantity images { url } }
            totalPrice
          }
        }
      }`,
      { input: { hostname: getHostname(), productId, quantity } }
    );

    const cart = data.addShoppingCartItem?.shoppingCart;
    if (cart) {
      cartProducts = cart.products || [];
      cartTotal = cart.totalPrice || 0;
      updateCartBadge();
      showToast('Produto adicionado ao carrinho');
    }
  } catch (error) {
    showToast('Erro ao adicionar: ' + error.message);
  }
};

const removeFromCart = async (itemId) => {
  try {
    const data = await graphql(
      `mutation RemoveFromCart($input: RemoveShoppingCartItemMutationInput!) {
        removeShoppingCartItem(input: $input) {
          shoppingCart {
            products { id title price quantity images { url } }
            totalPrice
          }
        }
      }`,
      { input: { hostname: getHostname(), itemId } }
    );
    const cart = data.removeShoppingCartItem?.shoppingCart;
    if (cart) {
      cartProducts = cart.products || [];
      cartTotal = cart.totalPrice || 0;
      updateCartBadge();
      renderCartItems();
      showToast('Item removido do carrinho');
    }
  } catch (error) {
    showToast('Erro ao remover: ' + error.message);
  }
};

const loadCart = async () => {
  try {
    const data = await graphql(
      `query GetCart($hostname: String!) {
        shoppingCart(hostname: $hostname) {
          products { id title price quantity images { url } }
          totalPrice
        }
      }`,
      { hostname: getHostname() }
    );
    cartProducts = data.shoppingCart?.products || [];
    cartTotal = data.shoppingCart?.totalPrice || 0;
    updateCartBadge();
  } catch (_error) {
    /* cart may not exist yet */
  }
};

const updateCartBadge = () => {
  const totalQty = cartProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const badge = document.getElementById('cart-count');
  badge.textContent = totalQty;
  badge.classList.toggle('visible', totalQty > 0);
};

const openCart = () => {
  renderCartItems();
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-drawer').classList.add('open');
  document.body.style.overflow = 'hidden';
};

const closeCart = () => {
  document.getElementById('cart-overlay').classList.remove('open');
  document.getElementById('cart-drawer').classList.remove('open');
  document.body.style.overflow = '';
};

const renderCartItems = () => {
  const container = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  document.getElementById('cart-total').textContent = `R$ ${formatPrice(cartTotal)}`;

  if (cartProducts.length === 0) {
    container.innerHTML = `
      <div class="drawer-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;color:#d1d5db;margin-bottom:12px"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        <p>Seu carrinho está vazio</p>
      </div>`;
    footer.style.display = 'none';
    return;
  }

  footer.style.display = '';
  container.innerHTML = cartProducts
    .map(
      (item) => `
    <div class="cart-item">
      <div class="cart-item-img">
        <img src="${item.images?.[0]?.url || 'https://placehold.co/72x72/f1f3f5/adb5bd?text=…'}" alt="${escapeHtml(item.title)}" />
      </div>
      <div class="cart-item-body">
        <div class="cart-item-title">${escapeHtml(item.title)}</div>
        <div class="cart-item-meta">
          <span class="cart-item-price">R$ ${formatPrice(item.price)}</span>
          <span class="cart-item-qty">× ${item.quantity}</span>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">Remover</button>
      </div>
    </div>`
    )
    .join('');
};

// ── Auth ──

const openLoginModal = () => {
  document.getElementById('login-modal').classList.add('open');
  document.getElementById('login-email').focus();
  document.getElementById('login-error').style.display = 'none';
  document.body.style.overflow = 'hidden';
};

const closeLoginModal = () => {
  document.getElementById('login-modal').classList.remove('open');
  document.getElementById('login-form').reset();
  document.getElementById('login-error').style.display = 'none';
  document.body.style.overflow = '';
};

const handleLoginSubmit = async (event) => {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit-btn');

  submitBtn.textContent = 'Entrando...';
  submitBtn.disabled = true;
  errorEl.style.display = 'none';

  try {
    const data = await graphql(
      `mutation ClientLogin($input: ClientLoginMutationInput!) {
        clientLogin(input: $input) { auth hostname }
      }`,
      { input: { hostname: getHostname(), email, password } }
    );

    if (data.clientLogin?.auth) {
      setLoggedIn(email);
      closeLoginModal();
      showToast(`Bem-vindo!`);
      await loadCart();
    } else {
      errorEl.textContent = 'Email ou senha incorretos.';
      errorEl.style.display = 'block';
    }
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  } finally {
    submitBtn.textContent = 'Entrar';
    submitBtn.disabled = false;
  }

  return false;
};

const handleLogout = async () => {
  try {
    await graphql(
      `mutation Logout($input: LogoutMutationInput!) {
        logout(input: $input) { clientMutationId }
      }`,
      { input: { role: 'client' } }
    );
    setLoggedOut();
    showToast('Você saiu da sua conta');
  } catch (error) {
    showToast('Erro ao sair: ' + error.message);
  }
};

const setLoggedIn = (email) => {
  const label = document.getElementById('user-label');
  label.textContent = email.split('@')[0];
  document.getElementById('user-btn').onclick = handleLogout;
};

const setLoggedOut = () => {
  const label = document.getElementById('user-label');
  label.textContent = 'Entrar';
  document.getElementById('user-btn').onclick = openLoginModal;
};

// ── Info Pages ──

const INFO_PAGES = {
  about: {
    title: 'Sobre nós',
    render: () => `
      <p>Somos uma loja dedicada a oferecer os melhores produtos com qualidade, preço justo e atendimento excepcional.</p>
      <p>Nossa missão é transformar cada compra em uma experiência prazerosa, desde a escolha do produto até a entrega na sua porta.</p>
      <h3>Nossa história</h3>
      <p>Nascemos da paixão por produtos de qualidade e do desejo de torná-los acessíveis a todos. Cada item do nosso catálogo é cuidadosamente selecionado para garantir a satisfação dos nossos clientes.</p>
      <h3>Nossos valores</h3>
      <ul>
        <li><strong>Qualidade</strong> — Selecionamos apenas os melhores produtos.</li>
        <li><strong>Transparência</strong> — Preços justos, sem surpresas.</li>
        <li><strong>Atendimento</strong> — Suporte humanizado e ágil.</li>
        <li><strong>Sustentabilidade</strong> — Embalagens eco-friendly sempre que possível.</li>
      </ul>`
  },
  privacy: {
    title: 'Política de Privacidade',
    render: () => `
      <p><strong>Última atualização:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      <h3>1. Dados que coletamos</h3>
      <p>Coletamos informações necessárias para processar seus pedidos: nome, email, endereço de entrega, telefone e dados de pagamento. Não armazenamos dados de cartão de crédito — isso é feito pelo nosso processador de pagamentos certificado PCI-DSS.</p>
      <h3>2. Como usamos seus dados</h3>
      <p>Seus dados são utilizados exclusivamente para: processar pedidos, enviar atualizações de entrega, oferecer suporte e, quando autorizado, enviar comunicações sobre novos produtos.</p>
      <h3>3. Cookies</h3>
      <p>Utilizamos cookies essenciais para manter sua sessão ativa e o carrinho de compras. Cookies de autenticação são httpOnly e não acessíveis por JavaScript.</p>
      <h3>4. Seus direitos (LGPD)</h3>
      <p>Conforme a Lei Geral de Proteção de Dados, você pode solicitar: acesso, correção, exclusão ou portabilidade dos seus dados pessoais. Entre em contato pelo email de atendimento.</p>
      <h3>5. Compartilhamento</h3>
      <p>Não vendemos seus dados. Compartilhamos apenas com: transportadoras (para entrega), processadores de pagamento e quando exigido por lei.</p>`
  },
  terms: {
    title: 'Termos de Uso',
    render: () => `
      <p><strong>Última atualização:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      <h3>1. Aceitação dos termos</h3>
      <p>Ao utilizar nosso site e realizar compras, você concorda com estes termos de uso. Caso não concorde, não utilize nossos serviços.</p>
      <h3>2. Preços e pagamento</h3>
      <p>Todos os preços são em Reais (BRL) e incluem impostos. Nos reservamos o direito de alterar preços sem aviso prévio, sendo que pedidos já confirmados mantêm o valor original.</p>
      <h3>3. Entrega</h3>
      <p>Os prazos de entrega são estimativas e podem variar conforme a região. O prazo começa a contar após a confirmação do pagamento.</p>
      <h3>4. Responsabilidade</h3>
      <p>Não nos responsabilizamos por danos indiretos decorrentes do uso dos produtos. Nossa responsabilidade é limitada ao valor do produto adquirido.</p>
      <h3>5. Propriedade intelectual</h3>
      <p>Todo o conteúdo deste site (textos, imagens, logos) é protegido por direitos autorais e não pode ser reproduzido sem autorização.</p>`
  },
  contact: {
    title: 'Contato',
    render: () => `
      <p>Estamos aqui para ajudar. Entre em contato por qualquer um dos canais abaixo:</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin:24px 0;">
        <div style="padding:24px;background:var(--color-bg-subtle);border-radius:var(--radius-md);border:1px solid var(--color-border);">
          <h4 style="margin-bottom:8px;">Email</h4>
          <p style="color:var(--color-text-secondary);">contato.${getHostname()}@acessocomercial.com</p>
        </div>
        <div style="padding:24px;background:var(--color-bg-subtle);border-radius:var(--radius-md);border:1px solid var(--color-border);">
          <h4 style="margin-bottom:8px;">Horário de atendimento</h4>
          <p style="color:var(--color-text-secondary);">Seg a Sex, 9h às 18h</p>
        </div>
      </div>
      <p>Para questões sobre pedidos em andamento, inclua o número do pedido no assunto do email para agilizar o atendimento.</p>`
  },
  returns: {
    title: 'Trocas e Devoluções',
    render: () => `
      <h3>Prazo para troca ou devolução</h3>
      <p>Você tem até <strong>7 dias corridos</strong> após o recebimento para solicitar a devolução (direito de arrependimento, conforme CDC) e <strong>30 dias</strong> para trocas por defeito.</p>
      <h3>Como solicitar</h3>
      <ol>
        <li>Entre em contato pelo nosso email informando o número do pedido.</li>
        <li>Aguarde as instruções de envio — nós fornecemos a etiqueta de postagem.</li>
        <li>Envie o produto na embalagem original, sem sinais de uso.</li>
        <li>Após recebermos e inspecionarmos, processamos o reembolso em até 10 dias úteis.</li>
      </ol>
      <h3>Reembolso</h3>
      <p>O reembolso é feito pela mesma forma de pagamento utilizada na compra. Para cartão de crédito, o estorno pode levar até 2 faturas para aparecer.</p>
      <h3>Produtos não elegíveis</h3>
      <p>Produtos personalizados, perecíveis ou com lacre violado não são elegíveis para devolução, exceto por defeito de fabricação.</p>`
  },
  faq: {
    title: 'Perguntas Frequentes',
    render: () => `
      <div class="faq-item"><h3>Qual o prazo de entrega?</h3><p>O prazo varia conforme a região e é calculado no momento do checkout. Em média, entregas para capitais levam de 3 a 7 dias úteis.</p></div>
      <div class="faq-item"><h3>Quais formas de pagamento são aceitas?</h3><p>Aceitamos cartão de crédito (até 12x), boleto bancário e PIX. Pagamentos via PIX são confirmados instantaneamente.</p></div>
      <div class="faq-item"><h3>Como acompanho meu pedido?</h3><p>Após o envio, você receberá um email com o código de rastreamento. Também é possível acompanhar na área "Meus Pedidos".</p></div>
      <div class="faq-item"><h3>Posso alterar ou cancelar meu pedido?</h3><p>Alterações e cancelamentos são possíveis enquanto o pedido estiver com status "Processando". Após o envio, será necessário aguardar a entrega e solicitar uma troca.</p></div>
      <div class="faq-item"><h3>O site é seguro?</h3><p>Sim. Utilizamos conexão HTTPS, autenticação via cookies httpOnly e não armazenamos dados de cartão de crédito. Seus dados pessoais são protegidos conforme a LGPD.</p></div>
      <div class="faq-item"><h3>Tem loja física?</h3><p>Atualmente operamos apenas online, o que nos permite oferecer preços mais competitivos e entregar em todo o Brasil.</p></div>`
  }
};

const showInfoPage = (pageKey) => {
  const page = INFO_PAGES[pageKey];
  if (!page) return;

  const container = document.getElementById('page-info');
  container.innerHTML = `
    <div class="info-page-inner">
      <span class="product-detail-back" onclick="navigateTo('home')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Voltar
      </span>
      <h1 class="info-page-title">${page.title}</h1>
      <div class="info-page-content">${page.render()}</div>
    </div>
  `;
  container.style.display = 'block';
};

// ── Utilities ──

const getHostname = () => {
  if (window.location.hostname === 'localhost') return 'demo';
  return window.location.hostname.split('.')[0];
};

const formatPrice = (cents) => {
  if (cents == null) return '0,00';
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const escapeHtml = (str) => {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// ── Boot ──

document.getElementById('footer-year').textContent = new Date().getFullYear();

(async () => {
  await loadStore();
  await Promise.all([loadProducts(), loadCart()]);
  navigateTo('home');

  const toolsScript = document.createElement('script');
  toolsScript.src = '/api/storefront/tools/loader.js';
  toolsScript.setAttribute('data-hostname', getHostname());
  toolsScript.async = true;
  document.head.appendChild(toolsScript);
})();
