import React, { useState } from 'react';
import { parseTradeText } from '../domain/parser';

export function PastePanel() {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<any[]>([]);

  const onParse = () => {
    const res = parseTradeText(text);
    setParsed(res);
  };

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h2>Paste Trade Confirmation</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste broker confirmation text here"
        rows={10}
        style={{ width: '100%', fontFamily: 'monospace' }}
      />
      <div style={{ marginTop: 8 }}>
        <button onClick={onParse}>Parse</button>
      </div>
      {parsed.length > 0 && (
        <pre style={{ marginTop: 16, background: '#f6f8fa', padding: 12 }}>
{JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  );
}

