import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';

interface MermaidProps {
  chart: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      flowchart: { useMaxWidth: false },
      sequence: { useMaxWidth: false },
      gantt: { useMaxWidth: false },
      class: { useMaxWidth: false },
      state: { useMaxWidth: false },
      journey: { useMaxWidth: false },
      timeline: { useMaxWidth: false },
      mindmap: { useMaxWidth: false },
    });
  }, [resolvedTheme]);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;
      
      try {
        setError(null);
        // Ensure unique ID for each render to avoid conflicts
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError('Failed to render diagram. Please check syntax.');
      }
    };

    renderChart();
  }, [chart, resolvedTheme]);

  if (error) {
    return <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50">{error}</div>;
  }

  return (
    <div className="mermaid-container">
      <div
        ref={ref}
        className="mermaid-diagram"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
};

export default Mermaid;
