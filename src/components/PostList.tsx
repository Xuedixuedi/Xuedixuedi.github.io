import Link from 'next/link'
import { AiOutlineCalendar, AiOutlineClockCircle } from 'react-icons/ai'
import { format } from 'date-fns'

type Post = {
  id: string
  title: string
  slug: string
  date: string
  summary: string
  tags: string[]
  thumbnail?: string
}

export const PostList = ({ posts }: { posts: Post[] }) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-white dark:bg-zinc-800 rounded-2xl">
        <div className="text-4xl mb-4">🔍</div>
        <div>No posts found.</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {posts.map((post) => (
        <article
          key={post.id}
          className="flex flex-col gap-6 bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-transparent hover:border-blue-100 dark:hover:border-zinc-700 overflow-hidden"
        >
          {post.thumbnail && (
            <div className="w-full flex-shrink-0">
               <Link href={`/${post.slug}`}>
                <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl">
                  <img
                    src={post.thumbnail}
                    alt={post.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                  />
                </div>
              </Link>
            </div>
          )}
          <div className="flex flex-col flex-grow">
            <div className="flex gap-2 mb-3">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-day-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            <Link href={`/${post.slug}`}>
              <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                {post.title}
              </h2>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4 flex-grow">
              {post.summary}
            </p>
            <div className="flex items-center gap-4 text-gray-400 text-sm mt-auto">
              <div className="flex items-center gap-1">
                <AiOutlineCalendar />
                <span>{post.date ? format(new Date(post.date), 'MMM dd, yyyy') : ''}</span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
