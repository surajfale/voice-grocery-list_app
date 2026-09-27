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
 * Renders the export element to a PNG blob.
 * @param {HTMLElement} element - PrintableList root
 * @returns {Promise<Blob>}
 */
export const renderListImage = (element) => domToBlob(element, CAPTURE_OPTIONS);

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

/**
 * Downloads the list as a PDF: a single A4-wide page as tall as the list, so
 * rows are never sliced across a page break.
 * @param {HTMLElement} element - PrintableList root
 * @param {string} dateString - Used for the file name
 */
export const downloadListAsPDF = async (element, dateString) => {
  const canvas = await domToCanvas(element, CAPTURE_OPTIONS);
  const width = 210; // A4 width in mm
  const height = Math.max(297 / 2, (canvas.height * width) / canvas.width);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [width, height] });
  // JPEG keeps the PDF small (jsPDF stores PNG pixels nearly uncompressed)
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, width, (canvas.height * width) / canvas.width);
  pdf.save(listFileName(dateString, 'pdf'));
};

/**
 * Shares the list with the Web Share API, degrading gracefully:
 * image file → plain text → download.
 *
 * Pass a pre-rendered image promise (started when the menu opens) so the
 * share call runs while the tap's user activation is still valid; iOS Safari
 * rejects navigator.share() with NotAllowedError after a slow await.
 *
 * @param {Promise<Blob>|Blob} image - Rendered image
 * @param {object} options
 * @param {string} options.dateString - Used for the file name
 * @param {string} options.title - Share sheet title
 * @param {string} options.text - Plain-text list for the text-only fallback
 * @returns {Promise<'shared'|'downloaded'|'cancelled'>}
 */
export const shareList = async (image, { dateString, title, text }) => {
  const blob = await image;
  const file = new File([blob], listFileName(dateString, 'png'), { type: 'image/png' });

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
