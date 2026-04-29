/**
 * iVelt Pro — Image Resizer
 *
 * Auto-compresses uploaded images > 400KB before phpBB sees them.
 * Triggers from THREE entry points:
 *   1. <input type="file"> change events (file picker)
 *   2. Drag-and-drop onto the post area / file input
 *   3. Clipboard paste of an image
 *
 * GIFs are skipped entirely (kept as-is) so animations are preserved.
 */

const MAX_DIM = 1600;
const TARGET_KB = 400;
const TARGET_BYTES = TARGET_KB * 1024;

const processedFiles = new WeakSet<File>();
let isProcessing = false;

export function setupImageResizer() {
  // 1. File picker — capture phase so we run BEFORE phpBB
  document.addEventListener('change', handleFileChange, true);

  // 2. Drag-drop — intercept on capture so we can swap before phpBB reads it
  document.addEventListener('drop', handleDrop, true);

  // 3. Clipboard paste
  document.addEventListener('paste', handlePaste, true);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function shouldCompress(file: File): boolean {
  if (!file.type.startsWith('image/')) return false;
  if (file.type === 'image/gif') return false; // never recompress GIFs
  if (file.size <= TARGET_BYTES) return false;
  if (processedFiles.has(file)) return false;
  return true;
}

function findFileInput(near?: EventTarget | null): HTMLInputElement | null {
  // Prefer file input nearest the event target (post area), fallback to first on page
  if (near instanceof HTMLElement) {
    const local = near.closest('form')?.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (local) return local;
  }
  return document.querySelector('input[type="file"]') as HTMLInputElement | null;
}

async function processAndAssign(rawFiles: File[], input: HTMLInputElement) {
  const out: File[] = [];
  for (const f of rawFiles) {
    if (shouldCompress(f)) {
      try {
        const compressed = await compressImage(f, TARGET_KB);
        processedFiles.add(compressed);
        out.push(compressed);
      } catch (err) {
        console.error('iVelt Pro: compression failed, using original', err);
        out.push(f);
      }
    } else {
      out.push(f);
    }
  }

  // Assign back to input and re-fire change so phpBB processes them
  const dt = new DataTransfer();
  out.forEach(f => dt.items.add(f));
  input.files = dt.files;

  isProcessing = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  isProcessing = false;
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

async function handleFileChange(event: Event) {
  if (isProcessing) return;

  const target = event.target as HTMLInputElement;
  if (target.tagName.toLowerCase() !== 'input' || target.type !== 'file' || !target.files) return;
  if (target.files.length === 0) return;

  const files = Array.from(target.files);
  const needsWork = files.some(shouldCompress);
  if (!needsWork) return;

  event.stopImmediatePropagation();
  event.preventDefault();

  await processAndAssign(files, target);
}

async function handleDrop(event: DragEvent) {
  if (isProcessing) return;
  const dt = event.dataTransfer;
  if (!dt || !dt.files || dt.files.length === 0) return;

  const files = Array.from(dt.files);
  const needsWork = files.some(shouldCompress);
  if (!needsWork) return;

  // Find a file input we can route through. If there's no input we let it through.
  const input = findFileInput(event.target);
  if (!input) return;

  event.stopImmediatePropagation();
  event.preventDefault();

  await processAndAssign(files, input);
}

async function handlePaste(event: ClipboardEvent) {
  if (isProcessing) return;
  const items = event.clipboardData?.items;
  if (!items || items.length === 0) return;

  const files: File[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind === 'file') {
      const f = it.getAsFile();
      if (f) files.push(f);
    }
  }
  if (files.length === 0) return;

  const needsWork = files.some(shouldCompress);
  if (!needsWork) return;

  const input = findFileInput(event.target);
  if (!input) return;

  event.stopImmediatePropagation();
  event.preventDefault();

  await processAndAssign(files, input);
}

/* ------------------------------------------------------------------ */
/* Compression core                                                    */
/* ------------------------------------------------------------------ */

function compressImage(file: File, targetKB: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = err => reject(err);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = err => reject(err);
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; }
        } else {
          if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No canvas context');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.7;
        const targetBytes = targetKB * 1024;

        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) return reject('Blob creation failed');
            if (blob.size <= targetBytes || quality <= 0.2) {
              let newName = file.name;
              const dotIndex = newName.lastIndexOf('.');
              if (dotIndex > 0) newName = newName.substring(0, dotIndex);
              newName += '.jpg';
              resolve(new File([blob], newName, {
                type: 'image/jpeg',
                lastModified: Date.now()
              }));
            } else {
              quality -= 0.1;
              tryCompress();
            }
          }, 'image/jpeg', quality);
        };
        tryCompress();
      };
    };
  });
}
