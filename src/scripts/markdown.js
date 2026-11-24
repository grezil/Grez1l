/**
 * Simple, fast and safe markdown parser for Aerospace Technical Journal
 */
export function renderMarkdown(content = '') {
  if (!content) return '';

  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Fenced code blocks ```lang\ncode\n```
  html = html.replace(/```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const language = lang || 'plaintext';
    return `<div class="code-block-container">
      <div class="code-block-header">
        <div class="code-header-left">
          <span class="code-dot red"></span>
          <span class="code-dot yellow"></span>
          <span class="code-dot green"></span>
          <span class="code-lang-label">${language}</span>
        </div>
        <button type="button" class="copy-code-btn" data-code="${encodeURIComponent(code.trim())}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy</span>
        </button>
      </div>
      <pre class="code-pre"><code class="language-${language}">${code.trim()}</code></pre>
    </div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Callouts: > **Title:** Body or > Body
  html = html.replace(/^>\s*\*\*([^*]+)\*\*:?([\s\S]*?)(?=(?:\r?\n\r?\n|$))/gm, (_match, title, body) => {
    return `<div class="mission-callout-box">
      <div class="callout-badge-title">
        <span class="callout-indicator-dot"></span>
        <span class="callout-label">${title}</span>
      </div>
      <div class="callout-content-text">${body.trim()}</div>
    </div>`;
  });

  // Standard blockquotes
  html = html.replace(/^>\s+(.*$)/gm, '<blockquote class="mission-blockquote">$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="mission-hr" />');

  // Headings
  html = html.replace(/^### (.*$)/gm, '<h3 class="article-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="article-h2">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="article-h1">$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Unordered Lists
  html = html.replace(/^\s*-\s+(.*$)/gm, '<li class="article-li"><span class="li-bullet">›</span><span class="li-text">$1</span></li>');
  html = html.replace(/(<li class="article-li">[\s\S]*?<\/li>)/gm, '<ul class="article-ul">$1</ul>');

  // Ordered Lists
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gm, '<li class="article-oli"><span class="oli-num">$1.</span><span class="li-text">$2</span></li>');
  html = html.replace(/(<li class="article-oli">[\s\S]*?<\/li>)/gm, '<ol class="article-ol">$1</ol>');

  // Paragraphs
  const blocks = html.split(/\n\s*\n/);
  html = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<div') || 
        trimmed.startsWith('<h1') || 
        trimmed.startsWith('<h2') || 
        trimmed.startsWith('<h3') || 
        trimmed.startsWith('<ul') || 
        trimmed.startsWith('<ol') || 
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<hr')) {
      return trimmed;
    }
    return `<p class="article-p">${trimmed.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n\n');

  return html;
}

export default {
  renderMarkdown
};
