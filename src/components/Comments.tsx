import { CONFIG } from '../../site.config'
import { useEffect, useRef } from 'react'

const Comments = () => {
  const commentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!CONFIG.utterances.enable) return
    
    // Check if script already exists to avoid duplication/errors
    if (commentRef.current && commentRef.current.children.length > 0) {
        return
    }

    const script = document.createElement('script')
    const config = CONFIG.utterances.config

    script.src = 'https://utteranc.es/client.js'
    script.setAttribute('repo', config.repo)
    script.setAttribute('issue-term', config['issue-term'])
    script.setAttribute('label', config.label)
    script.setAttribute('theme', 'github-light')
    script.setAttribute('crossorigin', 'anonymous')
    script.async = true

    // FIX: Create a wrapper div to hold the script
    // This ensures the script always has a parent node when it executes insertAdjacentHTML,
    // preventing NoModificationAllowedError even if the component unmounts.
    const scriptWrapper = document.createElement('div')
    scriptWrapper.appendChild(script)

    if (commentRef.current) {
      commentRef.current.appendChild(scriptWrapper)
    }

    return () => {
      if (commentRef.current) {
        commentRef.current.innerHTML = ''
      }
    }
  }, [])

  return (
    <div className="mt-10">
      <div ref={commentRef} />
    </div>
  )
}

export default Comments