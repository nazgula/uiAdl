const CANNED_REASONING = [
  '**Container & Layout:**',
  '- Single panel with header + content area',
  '',
  '**Tabs & Navigation:**',
  '1. Items list (default)',
  '2. Detail view (after click)',
  '',
  '**Sample Data:**',
  '- Item: "alpha" (status: open)',
  '- Item: "beta" (status: closed)'
].join('\n');

const CANNED_HTML_BODY = [
  '<!DOCTYPE html>',
  '<html><head><title>Canned Wireframe</title></head>',
  '<body style="font-family: \'Comic Sans MS\', cursive;">',
  '  <div class="panel" data-testid="canned-root">',
  '    <div class="panel-header">CANNED_WIREFRAME_MARKER</div>',
  '    <div class="card"><div class="card-body">alpha — open</div></div>',
  '    <div class="card"><div class="card-body">beta — closed</div></div>',
  '  </div>',
  '</body></html>'
].join('\n');

const CANNED_TEXT = `<reasoning>\n${CANNED_REASONING}\n</reasoning>\n${CANNED_HTML_BODY}`;

const CANNED_RESPONSE = {
  id: 'msg_canned_e2e',
  type: 'message',
  role: 'assistant',
  model: 'claude-haiku-4-5-20251001',
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: CANNED_TEXT }],
  usage: { input_tokens: 100, output_tokens: 200 }
};

module.exports = {
  CANNED_RESPONSE,
  CANNED_HTML_MARKER: 'CANNED_WIREFRAME_MARKER'
};
