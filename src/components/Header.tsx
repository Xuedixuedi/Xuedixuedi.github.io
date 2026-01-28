import Link from 'next/link'
import { CONFIG } from '../../site.config'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export const Header = () => {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full bg-day-50/80 dark:bg-zinc-900/80 backdrop-blur-md transition-colors duration-300 border-b border-gray-200/50 dark:border-gray-800/50">
      <div className="flex justify-between items-center p-6 max-w-6xl mx-auto w-full">
        <Link href="/" className="text-2xl font-bold hover:text-purple-600 transition-colors dark:text-white">
          {CONFIG.profile.name}
        </Link>
        <nav className="flex gap-4 items-center">
          {CONFIG.projects.map((project) => (
            <a
              key={project.name}
              href={project.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-black transition-colors dark:text-gray-300 dark:hover:text-white"
            >
              {project.name}
            </a>
          ))}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="ml-2 p-2 rounded-lg hover:bg-day-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}

