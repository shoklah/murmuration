// DOM helpers shared by the extension pages.

export function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export const button = (text, onclick, props = {}) => el('button', { type: 'button', textContent: text, onclick, ...props });

export const $ = id => document.getElementById(id);
