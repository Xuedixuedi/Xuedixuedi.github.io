import Image from 'next/image'
import { CONFIG } from '../../site.config'
import { AiFillLinkedin, AiOutlineGithub, AiOutlineMail, AiOutlineInstagram } from 'react-icons/ai'
import { FaUnsplash } from 'react-icons/fa'

export const ProfileCard = () => {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex flex-col items-center">
        <div className="relative w-24 h-24 mb-4">
          <Image
            src={CONFIG.profile.image}
            alt={CONFIG.profile.name}
            fill
            className="rounded-full object-cover"
            priority
          />
        </div>
        <div className="text-xl font-bold mb-1 dark:text-white">{CONFIG.profile.name}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">{CONFIG.profile.role}</div>
        <div className="text-sm text-center text-gray-600 dark:text-gray-300 mb-6">
          {CONFIG.profile.bio}
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-zinc-700 pt-6">
        <div className="text-sm font-bold mb-4 dark:text-gray-200">Service</div>
        <div className="space-y-2">
          {CONFIG.projects.map((project) => (
            <a
              key={project.name}
              href={project.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-day-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <span className="text-xl">📦</span>
              <span className="text-sm dark:text-gray-300">{project.name}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-zinc-700 pt-6 mt-6">
        <div className="text-sm font-bold mb-4 dark:text-gray-200">Contact</div>
        <div className="space-y-2">
          {CONFIG.profile.github && (
            <a
              href={`https://github.com/${CONFIG.profile.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-day-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <AiOutlineGithub className="text-xl dark:text-white" />
              <span className="text-sm dark:text-gray-300">github</span>
            </a>
          )}
          {CONFIG.profile.linkedin && (
            <a
              href={`https://www.linkedin.com/in/${CONFIG.profile.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-day-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <AiFillLinkedin className="text-xl dark:text-white" />
              <span className="text-sm dark:text-gray-300">linkedin</span>
            </a>
          )}
          {CONFIG.profile.email && (
            <a
              href={`mailto:${CONFIG.profile.email}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-day-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <AiOutlineMail className="text-xl dark:text-white" />
              <span className="text-sm dark:text-gray-300">email</span>
            </a>
          )}
          {CONFIG.profile.instagram && (
            <a
              href={`https://instagram.com/${CONFIG.profile.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-day-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <AiOutlineInstagram className="text-xl dark:text-white" />
              <span className="text-sm dark:text-gray-300">instagram</span>
            </a>
          )}
          {CONFIG.profile.unsplash && (
            <a
              href={`https://unsplash.com/@${CONFIG.profile.unsplash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-day-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <FaUnsplash className="text-xl dark:text-white" />
              <span className="text-sm dark:text-gray-300">unsplash</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
