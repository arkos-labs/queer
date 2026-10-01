import { useEffect, useState } from 'react';

const NON_TEXT_INPUT = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'color', 'image']);

function isTextField(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUT.has(el.type);
  return (el as HTMLElement).isContentEditable === true;
}

/**
 * True while a text field is focused, i.e. while the iOS keyboard is on
 * screen. The fixed bottom tab bar is hidden in that case: otherwise the
 * webview shrinks and the bar ends up floating above the keyboard.
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onIn = (e: FocusEvent) => {
      if (timer) clearTimeout(timer);
      if (isTextField(e.target as Element)) setOpen(true);
    };
    const onOut = () => {
      if (timer) clearTimeout(timer);
      // Small delay: focus often jumps from one field to the next.
      timer = setTimeout(() => setOpen(isTextField(document.activeElement)), 120);
    };
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return open;
}
