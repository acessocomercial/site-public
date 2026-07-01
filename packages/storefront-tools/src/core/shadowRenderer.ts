export interface ShadowWidgetOptions {
  tagName: string;
  css: string;
  html: string;
  position?: 'prepend' | 'append';
  parent?: HTMLElement;
}

export function createShadowWidget(options: ShadowWidgetOptions): {
  host: HTMLElement;
  shadow: ShadowRoot;
  container: HTMLElement;
} {
  const { tagName, css, html, position = 'append', parent = document.body } = options;

  const host = document.createElement(tagName);
  host.setAttribute('data-ac-widget', 'true');
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'ac-widget-root';
  container.innerHTML = html;
  shadow.appendChild(container);

  if (position === 'prepend') {
    parent.prepend(host);
  } else {
    parent.appendChild(host);
  }

  return { host, shadow, container };
}

export function removeShadowWidget(host: HTMLElement): void {
  host.remove();
}

export function injectShadowBadge(
  targetElement: HTMLElement,
  tagName: string,
  css: string,
  html: string,
): HTMLElement {
  const existing = targetElement.querySelector(tagName);
  if (existing) {
    existing.remove();
  }

  const wrapper = targetElement.style.position;
  if (!wrapper || wrapper === 'static') {
    targetElement.style.position = 'relative';
  }

  const host = document.createElement(tagName);
  host.setAttribute('data-ac-widget', 'true');
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.innerHTML = html;
  shadow.appendChild(container);

  targetElement.appendChild(host);
  return host;
}
