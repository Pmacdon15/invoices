/**
 * jsdom is missing a few browser APIs that Radix primitives (Select, Popover,
 * Dialog) call. Import this module at the top of a test file to stub them.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const g = globalThis as unknown as Record<string, unknown>;
if (!g.ResizeObserver) g.ResizeObserver = ResizeObserverStub;

const proto = Element.prototype as unknown as Record<string, unknown>;
if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;
if (!proto.setPointerCapture) proto.setPointerCapture = () => {};
if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {};
if (!proto.scrollIntoView) proto.scrollIntoView = () => {};

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

export {};
