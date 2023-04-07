import Detail from "@containers/Detail"
import { filterPosts } from "@/src/libs/utils/notion"
import Layout from "@components/Layout"
import CONFIG from "@/site.config"
import { NextPageWithLayout } from "@pages/_app"
import { TPost } from "../types"
import CustomError from "@containers/CustomError"
import { getPostBlocks, getPosts } from "@libs/apis"

export async function getStaticPaths() {
  const posts = await getPosts()
  const filteredPost = filterPosts(posts, {
    acceptStatus: ["Public", "PublicOnDetail"],
    acceptType: ["Paper", "Post", "Page"],
  })

  return {
    paths: filteredPost.map((row) => `/${row.slug}`),
    fallback: true,
  }
}

export async function getStaticProps({ params: { slug } }: any) {
  try {
    //includePages: true
    const posts = await getPosts()
    const post = posts.find((t) => t.slug === slug)
    const blockMap = await getPostBlocks(post?.id!)

    return {
      props: { post, blockMap },
      revalidate: 1,
    }
  } catch (error) {
    return {
      props: {},
      revalidate: 1,
    }
  }
}

type Props = {
  post: TPost
  blockMap: any
}

const DetailPage: NextPageWithLayout<Props> = ({ post, blockMap }) => {
  if (!post) return <CustomError />
  return <Detail blockMap={blockMap} data={post} />
}

DetailPage.getLayout = function getlayout(page) {
  const getImage = () => {
    if (page.props?.post.thumbnail) return page.props?.post.thumbnail
  }

  const getMetaConfig = () => {
    if (!page.props.post) {
      return {
        title: CONFIG.blog.title,
        description: CONFIG.blog.description,
        type: "website",
        url: CONFIG.link,
      }
    }
    return {
      title: page.props.post.title || CONFIG.blog.title,
      date: new Date(
        page.props.post.date?.start_date || page.props.post.createdTime || ""
      ).toISOString(),
      image: getImage(),
      description: page.props.post.summary,
      type: page.props.post.type[0],
      url: `${CONFIG.link}/${page.props.post.slug}`,
    }
  }
  return (
    <Layout metaConfig={getMetaConfig()} fullWidth={page.props.post?.fullWidth}>
      {page}
    </Layout>
  )
}

export default DetailPage
