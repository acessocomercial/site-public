type ElementCallback = (element: HTMLElement) => void;

const PRODUCT_SELECTOR = '[data-ac-product-id]';

let observer: MutationObserver | null = null;
let productCallbacks: ElementCallback[] = [];

function processElement(element: HTMLElement): void {
  for (const callback of productCallbacks) {
    try {
      callback(element);
    } catch (error) {
      console.warn('[ac-tools] Error in observer callback:', error);
    }
  }
}

function scanExistingElements(): void {
  const elements = document.querySelectorAll<HTMLElement>(PRODUCT_SELECTOR);
  for (const element of elements) {
    processElement(element);
  }
}

function handleMutations(mutations: MutationRecord[]): void {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) {
        continue;
      }

      if (node.matches(PRODUCT_SELECTOR)) {
        processElement(node);
      }

      const nested = node.querySelectorAll<HTMLElement>(PRODUCT_SELECTOR);
      for (const child of nested) {
        processElement(child);
      }
    }
  }
}

export function onProductElement(callback: ElementCallback): void {
  productCallbacks.push(callback);

  const existing = document.querySelectorAll<HTMLElement>(PRODUCT_SELECTOR);
  for (const element of existing) {
    try {
      callback(element);
    } catch (error) {
      console.warn('[ac-tools] Error in observer callback:', error);
    }
  }
}

export function startObserver(): void {
  if (observer) {
    return;
  }

  scanExistingElements();

  observer = new MutationObserver(handleMutations);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export function stopObserver(): void {
  observer?.disconnect();
  observer = null;
  productCallbacks = [];
}
