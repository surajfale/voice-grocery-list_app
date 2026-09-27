/**
 * Export helpers for sharing/downloading a grocery list as an image or PDF.
 *
 * Rendering uses modern-screenshot (SVG foreignObject), so the browser itself
 * lays out and paints the list: modern CSS (oklch(), color-mix(), gradients)
 * and text metrics come out exactly as on screen. html2canvas re-implemented
 * CSS in JS and threw on oklch(), which broke every export.
 */
import { domToBlob, domToCanvas } from 'modern-screenshot';
import { jsPDF } from 'jspdf';

const CAPTURE_OPTIONS = {
  scale: 2, // crisp on high-DPI screens
  backgroundColor: '#ffffff',
  type: 'image/png',
};

export const listFileName = (dateString, extension) => `grocery-list-${dateString}.${extension}`;

/**
 * Plain-text version of the list, used as the share text fallback when the
 * device can share text but not files.
 * @param {Array} items - Grocery items
 * @param {string} title - Heading line (e.g. "Grocery list · Today")
 * @returns {string}
 */
export const generateListText = (items, title) => {
  const groups = items.reduce((acc, item) => {
    (acc[item.category || 'Other'] ??= []).push(item);
    return acc;
  }, {});

  const lines = [title, ''];
  Object.entries(groups).forEach(([category, list]) => {
    lines.push(category);
    list.forEach((item) => {
      const count = item.count > 1 ? ` ×${item.count}` : '';
      lines.push(`${item.completed ? '☑' : '☐'} ${item.text}${count}`);
    });
    lines.push('');
  });
  return lines.join('\n').trim();
};

/**
 * Renders an export element to a PNG blob.
 * @param {HTMLElement} element - Off-screen export root (e.g. PrintableList)
 * @returns {Promise<Blob>}
 */
export const renderImage = (element) => domToBlob(element, CAPTURE_OPTIONS);

/**
 * Triggers a browser download for a blob.
 * @param {Blob} blob
 * @param {string} filename
 */
export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke on the next tick: Safari cancels the download if revoked synchronously
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

/**
 * Downloads the list as a PNG.
 * @param {Promise<Blob>|Blob} image - Rendered image (a pre-render promise is fine)
 * @param {string} dateString - Used for the file name
 */
export const downloadListAsImage = async (image, dateString) => {
  saveBlob(await image, listFileName(dateString, 'png'));
};

const A4 = { width: 210, height: 297 }; // mm
const PAGE_TOP_GAP = 10; // mm of breathing room above continued content

/**
 * Picks where each PDF page ends: the lowest allowed break (an element marked
 * data-pdf-break) that fits on the page, or a hard cut if a single block is
 * taller than a page.
 * @param {number} totalHeight - Content height in canvas px
 * @param {number[]} breaks - Allowed break offsets in canvas px, ascending
 * @param {number} firstPageHeight - Usable height of page 1 in canvas px
 * @param {number} pageHeight - Usable height of later pages in canvas px
 * @returns {Array<[number, number]>} [start, end) slices
 */
export const planPageSlices = (totalHeight, breaks, firstPageHeight, pageHeight) => {
  const slices = [];
  let start = 0;
  while (start < totalHeight) {
    const limit = start + (slices.length === 0 ? firstPageHeight : pageHeight);
    if (limit >= totalHeight) {
      slices.push([start, totalHeight]);
      break;
    }
    const fitting = breaks.filter((offset) => offset > start && offset <= limit);
    const end = fitting.length ? fitting[fitting.length - 1] : limit;
    slices.push([start, end]);
    start = end;
  }
  return slices;
};

/**
 * Downloads the list as a paginated A4 PDF. Pages only break at rows or
 * category boundaries, so an item is never sliced in half.
 * @param {HTMLElement} element - PrintableList root
 * @param {string} dateString - Used for the file name
 */
export const downloadListAsPDF = async (element, dateString) => {
  const canvas = await domToCanvas(element, CAPTURE_OPTIONS);
  const pxPerMm = canvas.width / A4.width;
  const pxPerCssPx = canvas.width / element.offsetWidth;

  const rootTop = element.getBoundingClientRect().top;
  const breaks = [...element.querySelectorAll('[data-pdf-break]')]
    .map((node) => Math.round((node.getBoundingClientRect().top - rootTop) * pxPerCssPx))
    .sort((a, b) => a - b);

  const pageHeightPx = A4.height * pxPerMm;
  const slices = planPageSlices(canvas.height, breaks, pageHeightPx, pageHeightPx - PAGE_TOP_GAP * pxPerMm);

  // Fill every page with the export's frame color so continued pages look
  // like the same card rather than a strip pasted onto white
  const [r, g, b] = canvas.getContext('2d').getImageData(2, 2, 1, 1).data;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = canvas.width;
  const pageContext = pageCanvas.getContext('2d');

  slices.forEach(([start, end], index) => {
    if (index > 0) { pdf.addPage(); }
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, A4.width, A4.height, 'F');

    pageCanvas.height = end - start;
    pageContext.drawImage(canvas, 0, start, canvas.width, end - start, 0, 0, canvas.width, end - start);
    // JPEG keeps the PDF small (jsPDF stores PNG pixels nearly uncompressed)
    pdf.addImage(
      pageCanvas.toDataURL('image/jpeg', 0.92),
      'JPEG',
      0,
      index === 0 ? 0 : PAGE_TOP_GAP,
      A4.width,
      (end - start) / pxPerMm
    );
  });

  pdf.save(listFileName(dateString, 'pdf'));
};

/**
 * Shares an exported image with the Web Share API, degrading gracefully:
 * image file → plain text → download.
 *
 * Pass a pre-rendered image promise (started when the menu opens) so the
 * share call runs while the tap's user activation is still valid; iOS Safari
 * rejects navigator.share() with NotAllowedError after a slow await.
 *
 * @param {Promise<Blob>|Blob} image - Rendered image
 * @param {object} options
 * @param {string} options.fileName - PNG file name
 * @param {string} options.title - Share sheet title
 * @param {string} options.text - Plain-text version for the text-only fallback
 * @returns {Promise<'shared'|'downloaded'|'cancelled'>}
 */
export const shareImage = async (image, { fileName, title, text }) => {
  const blob = await image;
  const file = new File([blob], fileName, { type: 'image/png' });

  const attempts = [];
  if (navigator.canShare?.({ files: [file] })) { attempts.push({ files: [file], title }); }
  if (navigator.share) { attempts.push({ title, text }); }

  for (const data of attempts) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') { return 'cancelled'; }
      // NotAllowedError (activation expired) / DataError: try the next option
    }
  }

  saveBlob(blob, file.name);
  return 'downloaded';
};
