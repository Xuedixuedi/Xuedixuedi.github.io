import { getPosts } from '@/lib/notion'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PostList } from '@/components/PostList'
import { ProfileCard } from '@/components/ProfileCard'
import { TagList } from '@/components/TagList'
import { SearchInput } from '@/components/SearchInput'
import Head from 'next/head'
import { CONFIG } from '../../site.config'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/router'

export default function Home({ posts, tags }: { posts: any[], tags: Record<string, number> }) {
  const [searchValue, setSearchValue] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const router = useRouter()
  const currentTag = router.query.tag as string

  const filteredPosts = useMemo(() => {
    let result = [...posts]

    // Tag filtering
    if (currentTag) {
      result = result.filter(post => post.tags.includes(currentTag))
    }

    // Search filtering
    if (searchValue) {
      const lowerSearch = searchValue.toLowerCase()
      result = result.filter(post => 
        post.title.toLowerCase().includes(lowerSearch) ||
        post.summary.toLowerCase().includes(lowerSearch) ||
        post.tags.some((tag: string) => tag.toLowerCase().includes(lowerSearch))
      )
    }

    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [posts, currentTag, searchValue, sortOrder])

  return (
    <div className="min-h-screen flex flex-col bg-day-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100">
      <Head>
        <title>{CONFIG.blog.title}</title>
        <meta name="description" content={CONFIG.blog.description} />
      </Head>
      <Header />
      
      <main className="flex-grow w-full max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar - Tags (Desktop: 2 cols, Mobile: Hidden/Bottom) */}
          <aside className="hidden lg:block lg:col-span-2 order-2 lg:order-1">
            <div className="sticky top-24">
              <TagList tags={tags} />
            </div>
          </aside>

          {/* Main Content (Desktop: 7 cols) */}
          <div className="lg:col-span-7 order-3 lg:order-2">
            {/* Mobile Tag List */}
            <div className="lg:hidden mb-6">
               <TagList tags={tags} />
            </div>

            <SearchInput onChange={setSearchValue} />
            
            <div className="flex items-center justify-between mb-4 px-2">
               <h2 className="text-xl font-bold flex items-center gap-2">
                 {currentTag ? (
                   <>
                     <span className="text-blue-500">#{currentTag}</span>
                     <span className="text-gray-400 text-sm font-normal">({filteredPosts.length})</span>
                   </>
                 ) : (
                   <>
                     <span>All Posts</span>
                     <span className="text-gray-400 text-sm font-normal">({filteredPosts.length})</span>
                   </>
                 )}
               </h2>
               
               <div className="flex gap-2">
                 <button 
                   onClick={() => setSortOrder('desc')}
                   className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                     sortOrder === 'desc' 
                       ? 'bg-gray-200 dark:bg-zinc-700 font-medium text-gray-900 dark:text-gray-100' 
                       : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'
                   }`}
                 >
                   Newest
                 </button>
                 <button 
                   onClick={() => setSortOrder('asc')}
                   className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                     sortOrder === 'asc' 
                       ? 'bg-gray-200 dark:bg-zinc-700 font-medium text-gray-900 dark:text-gray-100' 
                       : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'
                   }`}
                 >
                   Oldest
                 </button>
               </div>
            </div>

            <PostList posts={filteredPosts} />
          </div>

          {/* Right Sidebar - Profile (Desktop: 3 cols) */}
          <aside className="lg:col-span-3 order-1 lg:order-3">
             <div className="lg:sticky lg:top-24">
               <ProfileCard />
             </div>
          </aside>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}

export async function getStaticProps() {
  const isGithubActions = process.env.GITHUB_ACTIONS || false
  try {
    const posts = await getPosts()
    
    // Calculate tags count
    const tags: Record<string, number> = {}
    posts.forEach((post: any) => {
      post.tags.forEach((tag: string) => {
        tags[tag] = (tags[tag] || 0) + 1
      })
    })

    return {
      props: {
        posts,
        tags
      },
      revalidate: isGithubActions ? undefined : 1,
    }
  } catch (error) {
    console.error(error)
    return {
      props: {
        posts: [],
        tags: {}
      },
    }
  }
}
