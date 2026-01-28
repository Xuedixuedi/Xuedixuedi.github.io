import { useRouter } from 'next/router'
import { AiFillTag } from 'react-icons/ai'

type Props = {
  tags: Record<string, number>
}

export const TagList = ({ tags }: Props) => {
  const router = useRouter()
  const currentTag = router.query.tag as string

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4 px-2">
        <AiFillTag className="text-xl text-gray-600 dark:text-gray-300" />
        <span className="font-bold dark:text-white">Tags</span>
      </div>
      <ul className="space-y-1">
        {Object.keys(tags).map((tag) => (
          <li key={tag}>
            <button
              onClick={() => {
                if (currentTag === tag) {
                  router.push('/')
                } else {
                  router.push(`/?tag=${tag}`)
                }
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${
                currentTag === tag
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-day-100 dark:hover:bg-zinc-700'
              }`}
            >
              <span>{tag}</span>
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-zinc-700 px-2 py-0.5 rounded-full">
                {tags[tag]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
