import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { CodeBlock as CodeBlockType } from 'notion-types';
import { FaCode, FaProjectDiagram } from 'react-icons/fa';

const NotionCode = dynamic(() =>
  import('react-notion-x/build/third-party/code').then((m) => m.Code),
  { ssr: false }
);

const Mermaid = dynamic(() => import('./Mermaid'), { ssr: false });

interface CodeBlockProps {
  block: CodeBlockType;
  defaultLanguage?: string;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = (props) => {
  const { block, defaultLanguage } = props;
  const language = (
    block.properties?.language?.[0]?.[0] || 
    defaultLanguage || 
    ''
  ).toLowerCase();
  
  // Extract code content from Notion block
  const content = block.properties?.title?.map(item => item[0]).join('') || '';

  const [isMermaidView, setIsMermaidView] = useState(true);

  if (language === 'mermaid') {
    return (
      <div className="relative group my-4">
        {/* Toggle Button for Mermaid */}
        <div className="absolute top-2 right-2 z-20 flex gap-2">
           <button
             onClick={() => setIsMermaidView(!isMermaidView)}
             className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-300 shadow-sm"
             title={isMermaidView ? "Switch to Source" : "Switch to Diagram"}
             type="button"
           >
             {isMermaidView ? <FaCode size={14} /> : <FaProjectDiagram size={14} />}
           </button>
        </div>
        
        {isMermaidView ? (
          <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] overflow-x-auto overflow-y-hidden min-h-[100px] flex items-center justify-center">
             <Mermaid chart={content} />
          </div>
        ) : (
          <NotionCode {...props} />
        )}
      </div>
    );
  }

  return (
    <div className="relative group code-block-wrapper">
       {/* Language Label */}
       {language && (
         <div className="absolute top-2 right-12 z-10 pointer-events-none select-none">
            <span className="text-xs font-mono text-gray-400 dark:text-gray-500 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              {language}
            </span>
         </div>
       )}
       <NotionCode {...props} />
    </div>
  );
};

export default CodeBlock;
