import mermaid from 'mermaid';
import { useEffect, useRef, useState } from 'react';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

export default function MermaidBlock({ code }) {
  const ref = useRef(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) return;
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    setSvg('');
    setError(null);
    mermaid.render(id, code)
      .then(({ svg }) => setSvg(svg))
      .catch((e) => setError(e.message || 'Diagram parse error'));
  }, [code]);

  if (error) return <pre className="text-red-400 text-xs whitespace-pre-wrap">{code}</pre>;
  if (!svg) return <div className="animate-pulse h-24 bg-white/5 rounded" />;
  return (
    <div
      ref={ref}
      dangerouslySetInnerHTML={{ __html: svg }}
      className="overflow-x-auto py-2"
    />
  );
}
