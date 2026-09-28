// Libraries that used to be loaded from public CDNs via <script> tags in
// index.html. They are now installed via npm and bundled into the app at
// build time (no third-party CDN can inject code into the page), and
// exposed as globals so existing components keep working unchanged.
//
// Markdown from the AI is passed through DOMPurify before it is rendered as
// HTML, so a malicious/steered AI reply can't smuggle scripts into the page
// (this matters most on the admin screen, which renders AI analysis of
// participant-provided data).
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

(window as any).html2canvas = html2canvas;
(window as any).jspdf = { jsPDF };
(window as any).marked = {
  parse: (text: string): string =>
    DOMPurify.sanitize(marked.parse(text, { async: false }) as string)
};
