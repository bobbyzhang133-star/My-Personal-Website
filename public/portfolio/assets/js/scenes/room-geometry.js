const FLOOR_ITEMS = Object.freeze([
  { name: 'cabinet', selector: '.furniture-cabinet', plane: 'rear', source: [48, 144], contacts: [[4, 144], [44, 144]] },
  { name: 'books-left', selector: '.furniture-books-left', plane: 'rear', source: [48, 96], contacts: [[2, 70], [46, 70]] },
  { name: 'books-right', selector: '.furniture-books-right', plane: 'rear', source: [48, 96], contacts: [[2, 70], [46, 70]], optionalWhenHidden: true },
  { name: 'low-shelf', selector: '.furniture-low-shelf', plane: 'rear', source: [96, 96], contacts: [[2, 70], [46, 70], [50, 70], [94, 70]] },
  { name: 'desk', selector: '.furniture-desk', plane: 'workstation', source: [144, 96], contacts: [[1, 70], [72, 70], [143, 70]] },
  { name: 'drawers', selector: '.furniture-drawers', plane: 'front', source: [96, 96], contacts: [[1, 70], [48, 70], [95, 70]] },
  { name: 'chair', selector: '.furniture-chair', plane: 'middle', source: [48, 48], contacts: [[12, 48], [37, 48]] },
  { name: 'guitar', selector: '.object-music img', moveSelector: '.object-music', plane: 'rear', source: [48, 96], contacts: [[18, 88], [30, 88]] },
  { name: 'bird', selector: '.bird-sprite', moveSelector: '.object-games', plane: 'bird', source: [48, 48], contacts: [[18, 43], [21, 43], [28, 43], [31, 43]], hasExternalShadow: false }
]);

const SUPPORTED_ITEMS = Object.freeze([
  { name: 'globe', selector: '.furniture-globe', support: '.furniture-books-right', mobileSupport: '.furniture-books-left', source: [48, 48], contacts: [[19, 48], [28, 48]], supportSource: [48, 96], supportEdge: [[0, 0], [48, 0]] },
  { name: 'papers', selector: '.furniture-papers', support: '.furniture-low-shelf', source: [48, 48], contacts: [[14, 46], [17, 46]], supportSource: [96, 96], supportEdge: [[2, 0], [94, 0]] },
  { name: 'camera', selector: '.object-films img', moveSelector: '.object-films', support: '.furniture-low-shelf', source: [48, 48], contacts: [[15, 48], [32, 48]], supportSource: [96, 96], supportEdge: [[2, 0], [94, 0]] },
  { name: 'computer', selector: '.object-ai img', moveSelector: '.object-ai', support: '.furniture-desk', source: [48, 48], contacts: [[11, 48], [38, 48]], supportSource: [144, 96], supportEdge: [[2, 22], [142, 22]] },
  { name: 'book', selector: '.object-research img', moveSelector: '.object-research', support: '.foreground-counter', source: [48, 48], contacts: [[9, 45], [39, 45]], supportSource: [144, 96], supportEdge: [[2, 22], [142, 22]] }
]);

function renderedFrame(element, [sourceWidth, sourceHeight]) {
  const rect = element.getBoundingClientRect();
  const scale = Math.min(rect.width / sourceWidth, rect.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    left: rect.left + (rect.width - width) / 2,
    top: rect.bottom - height,
    width,
    height,
    scale
  };
}

function projectPoints(element, source, points) {
  const frame = renderedFrame(element, source);
  return points.map(([x, y]) => ({ x: frame.left + x * frame.scale, y: frame.top + y * frame.scale }));
}

function pointEnvelope(points) {
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
    y: ys.reduce((sum, value) => sum + value, 0) / ys.length
  };
}

function isRendered(element) {
  if (!element || getComputedStyle(element).display === 'none') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function moveTarget(root, item) {
  return root.querySelector(item.moveSelector || item.selector);
}

function clearTranslations(root) {
  [...FLOOR_ITEMS, ...SUPPORTED_ITEMS].forEach(item => {
    const target = moveTarget(root, item);
    target?.style.removeProperty('translate');
    if (target) {
      delete target.dataset.contactDelta;
      delete target.dataset.contactError;
      delete target.dataset.grounded;
      delete target.dataset.footprintContained;
    }
  });
}

function translateTo(root, item, deltaY) {
  const target = moveTarget(root, item);
  if (!target) return;
  target.style.translate = `0 ${deltaY.toFixed(3)}px`;
  target.dataset.contactDelta = deltaY.toFixed(3);
}

function setShadowVisibility(root, item, visible) {
  const shadow = root.querySelector(`[data-contact-shadow-for="${item.name}"]`);
  if (shadow) shadow.hidden = !visible;
}

function placeShadow(root, item, envelope, planeY) {
  if (item.hasExternalShadow === false) return;
  const shadow = root.querySelector(`[data-contact-shadow-for="${item.name}"]`);
  const layer = shadow?.closest('.room-floor-decals');
  if (!shadow || !layer) return;
  shadow.hidden = false;
  const layerRect = layer.getBoundingClientRect();
  const baseWidth = Math.max(1, envelope.right - envelope.left);
  const expansion = Math.max(3, baseWidth * .06);
  const heightFactor = ({ rear: .1, workstation: .11, middle: .16, front: .14 })[item.plane] || .1;
  const height = Math.max(6, Math.min(22, baseWidth * heightFactor));
  shadow.style.left = `${envelope.left - layerRect.left - expansion}px`;
  shadow.style.top = `${planeY - layerRect.top - height * .18}px`;
  shadow.style.width = `${baseWidth + expansion * 2}px`;
  shadow.style.height = `${height}px`;
}

function markTarget(root, item, error, grounded, contained) {
  const target = moveTarget(root, item);
  if (!target) return;
  target.dataset.contactError = error.toFixed(3);
  target.dataset.grounded = String(grounded);
  if (contained !== undefined) target.dataset.footprintContained = String(contained);
}

function resolveSupport(item) {
  return item.mobileSupport && matchMedia('(max-width: 700px)').matches ? item.mobileSupport : item.support;
}

function updateCategorySupportAnchor(root) {
  const desk = root.querySelector('.furniture-desk');
  const anchor = root.querySelector('[data-support-anchor="ai"]');
  const composition = root.querySelector('.room-composition');
  if (!isRendered(desk) || !anchor || !composition) return;
  const surface = pointEnvelope(projectPoints(desk, [144, 96], [[2, 22], [142, 22]]));
  const compositionRect = composition.getBoundingClientRect();
  anchor.style.top = `${surface.y - compositionRect.top}px`;
  anchor.style.left = `${surface.left - compositionRect.left}px`;
  anchor.style.width = `${surface.right - surface.left}px`;
}

export function alignRoomGeometry(root) {
  const scene = root?.matches?.('.room-scene') ? root : root?.querySelector?.('.room-scene');
  if (!scene) return [];
  clearTranslations(scene);
  const report = [];

  for (const item of FLOOR_ITEMS) {
    const element = scene.querySelector(item.selector);
    const plane = scene.querySelector(`[data-ground-plane="${item.plane}"]`);
    if (!element || !plane) {
      setShadowVisibility(scene, item, false);
      report.push({ name: item.name, type: 'floor', valid: false, reason: 'missing-element-or-plane' });
      continue;
    }
    if (!isRendered(element)) {
      setShadowVisibility(scene, item, false);
      report.push({
        name: item.name,
        type: 'floor',
        valid: item.optionalWhenHidden === true,
        visible: false,
        reason: item.optionalWhenHidden ? 'intentionally-hidden' : 'unexpectedly-hidden'
      });
      continue;
    }
    const planeY = plane.getBoundingClientRect().top;
    const before = pointEnvelope(projectPoints(element, item.source, item.contacts));
    translateTo(scene, item, planeY - before.y);
    const points = projectPoints(element, item.source, item.contacts);
    const after = pointEnvelope(points);
    const error = Math.max(...points.map(point => Math.abs(point.y - planeY)));
    const grounded = error <= .75;
    markTarget(scene, item, error, grounded);
    placeShadow(scene, item, after, planeY);
    report.push({ name: item.name, type: 'floor', plane: item.plane, valid: grounded, grounded, error, contacts: points, footprint: after });
  }

  for (const item of SUPPORTED_ITEMS) {
    const element = scene.querySelector(item.selector);
    const supportSelector = resolveSupport(item);
    const support = scene.querySelector(supportSelector);
    if (!element || !support || !isRendered(element) || !isRendered(support)) {
      report.push({ name: item.name, type: 'support', valid: false, reason: 'missing-or-hidden-support', support: supportSelector });
      continue;
    }
    const before = pointEnvelope(projectPoints(element, item.source, item.contacts));
    const supportPoints = projectPoints(support, item.supportSource, item.supportEdge);
    const surface = pointEnvelope(supportPoints);
    translateTo(scene, item, surface.y - before.y);
    const points = projectPoints(element, item.source, item.contacts);
    const after = pointEnvelope(points);
    const tolerance = Math.max(1, surface.right - surface.left) * .02;
    const contained = points.every(point => point.x >= surface.left - tolerance && point.x <= surface.right + tolerance);
    const error = Math.max(...points.map(point => Math.abs(point.y - surface.y)));
    const grounded = error <= .75;
    markTarget(scene, item, error, grounded, contained);
    report.push({ name: item.name, type: 'support', valid: grounded && contained, grounded, contained, error, support: supportSelector, contacts: points, footprint: after, surface });
  }

  updateCategorySupportAnchor(scene);
  const valid = report.every(item => item.valid);
  scene.dataset.groundingReady = String(valid);
  scene.dataset.groundingFailures = String(report.filter(item => !item.valid).length);
  scene.groundingReport = report;
  return report;
}

export function watchRoomGeometry(root, signal) {
  const scene = root?.matches?.('.room-scene') ? root : root?.querySelector?.('.room-scene');
  const composition = scene?.querySelector('.room-composition');
  if (!scene || !composition) return () => {};
  let frame = 0;
  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => alignRoomGeometry(scene));
  };
  scene.querySelectorAll('img').forEach(image => {
    if (!image.complete) image.addEventListener('load', update, { once: true, signal });
  });
  window.addEventListener('resize', update, { signal });
  alignRoomGeometry(scene);
  return () => cancelAnimationFrame(frame);
}

export const roomGeometry = Object.freeze({ floor: FLOOR_ITEMS, supported: SUPPORTED_ITEMS });
