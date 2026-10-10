export function setRoving(items, index, attribute = 'aria-pressed') {
  items.forEach((item, itemIndex) => {
    const active = itemIndex === index;
    item.setAttribute(attribute, String(active));
    item.tabIndex = active ? 0 : -1;
  });
}

export function addSwipe(element, onLeft, onRight, signal) {
  let startX = 0;
  element.addEventListener('pointerdown', event => { startX = event.clientX; }, { signal });
  element.addEventListener('pointerup', event => {
    const distance = event.clientX - startX;
    if (Math.abs(distance) < 45) return;
    if (distance < 0) onLeft();
    else onRight();
  }, { signal });
}

export function bindLinearKeys(root, items, getIndex, render, { vertical = false, signal } = {}) {
  root.addEventListener('keydown', event => {
    if (!items.includes(event.target) && !event.target.closest('[data-keyboard-surface]')) return;
    const previous = vertical ? 'ArrowUp' : 'ArrowLeft';
    const next = vertical ? 'ArrowDown' : 'ArrowRight';
    let index;
    if (event.key === previous) index = getIndex() - 1;
    else if (event.key === next) index = getIndex() + 1;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = items.length - 1;
    else return;
    event.preventDefault();
    render(index, true);
  }, { signal });
}

export function sceneController() {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cleanup: () => controller.abort()
  };
}
