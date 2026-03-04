import * as React from 'react';

import { useSettings } from '@/hooks/useSettings';

interface RichTextContentProps {
  html: string;
  /** UIDs of attached files — links/images referencing these are suppressed (shown in the files section). */
  excludeUids?: string[];
  className?: string;
}

/**
 * Renders Kaiten rich-text content with clickable links.
 *
 * Handles both HTML anchor tags and Markdown-style links ([text](url) / ![alt](url)).
 * Links/images whose URL contains any of the provided file UIDs are suppressed
 * because those files are already displayed in the files section.
 * Relative URLs starting with "files/" are resolved against the configured server base URL.
 */
export function RichTextContent({ html, excludeUids = [], className }: RichTextContentProps) {
  const { serverUrl } = useSettings();
  const nodes = React.useMemo(
    () => renderBody(html, excludeUids, serverUrl),
    [html, excludeUids, serverUrl],
  );
  return <span className={className}>{nodes}</span>;
}

// ── URL resolution ────────────────────────────────────────────────────────────

/**
 * Resolves Kaiten-relative file URLs.
 * "files/uuid.ext"        → "${baseUrl}/files/uuid.ext"
 * "https://files/uuid.ext" → "${baseUrl}/files/uuid.ext"  (DOMParser resolves relative hrefs this way)
 */
function resolveUrl(url: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, '');
  if (url.startsWith('files/')) {
    return `${base}/${url}`;
  }
  if (/^https?:\/\/files\//.test(url)) {
    return url.replace(/^https?:\/\/files\//, `${base}/files/`);
  }
  return url;
}

// ── HTML DOM walking ──────────────────────────────────────────────────────────

function renderBody(html: string, excludeUids: string[], baseUrl: string): React.ReactNode[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const counter = { n: 0 };
  return walkChildren(doc.body, excludeUids, baseUrl, counter);
}

function walkChildren(
  el: Element,
  excludeUids: string[],
  baseUrl: string,
  counter: { n: number },
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  for (const child of Array.from(el.childNodes)) {
    nodes.push(...walkNode(child, excludeUids, baseUrl, counter));
  }
  return nodes.filter((n) => n !== null && n !== undefined && n !== '');
}

function walkNode(
  node: Node,
  excludeUids: string[],
  baseUrl: string,
  counter: { n: number },
): React.ReactNode[] {
  // Text node — parse Markdown links inside it
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    return text ? parseLinks(text, excludeUids, baseUrl, counter) : [];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const key = counter.n++;

  // HTML anchor tag
  if (tag === 'a') {
    const rawHref = el.getAttribute('href') ?? '';
    const href = resolveUrl(rawHref, baseUrl);
    if (excludeUids.some((uid) => href.includes(uid))) return [];
    return [
      <a
        key={key}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {walkChildren(el, excludeUids, baseUrl, counter)}
      </a>,
    ];
  }

  if (tag === 'br') return [<br key={key} />];

  if (tag === 'p' || tag === 'div') {
    const children = walkChildren(el, excludeUids, baseUrl, counter);
    if (children.length === 0) return [];
    return [
      <React.Fragment key={key}>
        {children}
        {'\n'}
      </React.Fragment>,
    ];
  }

  return walkChildren(el, excludeUids, baseUrl, counter);
}

// ── Link parsing ──────────────────────────────────────────────────────────────

// Matches (in priority order):
//   1. ![alt](url) or [text](url)  — Markdown links/images
//   2. https?://...               — bare URLs
const LINK_RE = /(!?\[([^\]]*)])\(([^)\s"]+)(?:\s+"[^"]*")?\)|(https?:\/\/[^\s<>"')\]]+)/g;

function parseLinks(
  text: string,
  excludeUids: string[],
  baseUrl: string,
  counter: { n: number },
): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let last = 0;
  LINK_RE.lastIndex = 0;

  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(text)) !== null) {
    if (m.index > last) result.push(text.slice(last, m.index));

    const key = counter.n++;

    if (m[4] !== undefined) {
      // Bare URL
      const url = resolveUrl(m[4], baseUrl);
      if (!excludeUids.some((uid) => url.includes(uid))) {
        result.push(
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {m[4]}
          </a>,
        );
      } else {
        result.push(m[4]);
      }
    } else {
      // Markdown link or image
      const isImage = m[0].startsWith('!');
      const label = m[2];
      const url = resolveUrl(m[3] ?? '', baseUrl);

      // Images are file attachments — already shown in the files section, suppress
      if (!isImage && !excludeUids.some((uid) => url.includes(uid))) {
        result.push(
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {label ?? url}
          </a>,
        );
      }
    }

    last = m.index + m[0].length;
  }

  if (last < text.length) result.push(text.slice(last));
  return result.filter((n) => n !== null && n !== '');
}

// ── Plain text component (no HTML) ────────────────────────────────────────────

interface PlainTextContentProps {
  text: string;
  className?: string;
}

/**
 * Renders plain text with clickable bare URLs and Markdown-style links.
 * Use this for non-HTML values (e.g. custom property values).
 */
export function PlainTextContent({ text, className }: PlainTextContentProps) {
  const { serverUrl } = useSettings();
  const nodes = React.useMemo(() => {
    const counter = { n: 0 };
    return parseLinks(text, [], serverUrl, counter);
  }, [text, serverUrl]);
  return <span className={className}>{nodes}</span>;
}
