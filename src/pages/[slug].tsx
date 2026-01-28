import { NotionRenderer } from 'react-notion-x'
import dynamic from 'next/dynamic'
import { getPosts, getPage } from '@/lib/notion'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import Comments from '@/components/Comments'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useTheme } from 'next-themes'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'

// 动态导入第三方组件以优化性能
const Code = dynamic(() =>
  import('react-notion-x/build/third-party/code').then((m) => m.Code)
)
const Collection = dynamic(() =>
  import('react-notion-x/build/third-party/collection').then((m) => m.Collection)
)
const Equation = dynamic(() =>
  import('react-notion-x/build/third-party/equation').then((m) => m.Equation)
)
const Pdf = dynamic(() =>
  import('react-notion-x/build/third-party/pdf').then((m) => m.Pdf)
)
const Modal = dynamic(
  () => import('react-notion-x/build/third-party/modal').then((m) => m.Modal),
  {
    ssr: false
  }
)

export default function Post({ recordMap, post }: { recordMap: any, post: any }) {
  const router = useRouter()
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (router.isFallback) {
    return <div className="p-10 text-center">Loading...</div>
  }

  if (!recordMap) {
    return <div className="p-10 text-center">Post not found</div>
  }

  const isDarkMode = 
    theme === 'dark' || 
    (theme === 'system' && systemTheme === 'dark')

  return (
    <div className="min-h-screen flex flex-col bg-day-50 dark:bg-zinc-900 transition-colors duration-300">
       <Head>
        <title>{post?.title || 'Post'}</title>
      </Head>
      <Header />
      <main className="flex-grow w-full max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-sm p-8 md:p-16 transition-colors duration-300">
          
          {/* Post Header */}
          <div className="mb-10 text-center md:text-left">
            {/* Title */}
            <h1 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white leading-tight">
              {post?.title}
            </h1>
            
            {/* Date */}
            <div className="text-gray-500 dark:text-gray-400 font-medium">
              {post?.date && format(new Date(post.date), 'MMM dd, yyyy')}
            </div>
          </div>

          <div className="w-full h-px bg-day-200 dark:bg-zinc-700 mb-10"></div>

          {/* Content */}
          <div className="notion-container-custom">
            <NotionRenderer 
              recordMap={recordMap} 
              fullPage={false} 
              darkMode={mounted ? isDarkMode : false}
              components={{
                Code,
                Collection,
                Equation,
                Modal,
                Pdf
              }}
              className="!px-0 !w-full !max-w-none"
            />
          </div>

          {/* Footer Navigation */}
          <div className="mt-16 pt-8 border-t border-gray-100 dark:border-zinc-700 flex justify-between items-center text-gray-500 dark:text-gray-400 font-medium">
            <button 
              onClick={() => router.back()} 
              className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-4 py-2 rounded-lg hover:bg-day-100 dark:hover:bg-zinc-700/50"
            >
              <span>←</span> Back
            </button>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
              className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-4 py-2 rounded-lg hover:bg-day-100 dark:hover:bg-zinc-700/50"
            >
              Top <span>↑</span>
            </button>
          </div>
          
          <Comments />
        </div>
      </main>
      <Footer />
    </div>
  )
}

export async function getStaticPaths() {
  try {
    const posts = await getPosts()
    const paths = posts.map((post: any) => ({
      params: { slug: post.slug }
    }))

    return {
      paths,
      fallback: false
    }
  } catch (error) {
    console.error('Failed to generate paths:', error)
    return {
      paths: [],
      fallback: false
    }
  }
}

export async function getStaticProps({ params }: { params: { slug: string } }) {
  const isGithubActions = process.env.GITHUB_ACTIONS || false
  try {
    const posts = await getPosts()
    const post = posts.find((p: any) => p.slug === params.slug)
    
    if (!post) {
       return {
         props: {
           post: null,
           recordMap: null
         }
       }
    }

    let recordMap = null
    try {
      recordMap = await getPage(post.id)
    } catch (err) {
      console.error(`Failed to fetch Notion page ${post.id} for slug ${params.slug}:`, err)
      // Fallthrough to return null recordMap
    }

    return {
      props: {
        post,
        recordMap
      },
      revalidate: isGithubActions ? undefined : 1
    }
  } catch (error) {
    console.error('Failed to get posts:', error)
    return {
      props: {
        post: null,
        recordMap: null
      }
    }
  }
}
