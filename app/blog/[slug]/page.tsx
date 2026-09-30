"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useTranslation } from "@/src/i18n"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, User, Eye, ArrowLeft, Share2, Heart, Bookmark } from "lucide-react"
import { landingPagesApi } from "@/lib/api"
import LandingHeader from '@/components/landing-header'
import React from "react"

interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt?: string
  content: string
  author: string
  category: string
  featured: boolean
  tags: string[]
  image_url?: string
  read_time?: string
  status: string
  views: number
  created_at: string
  updated_at: string
}

interface BlogCategory {
  name: string
  slug: string
  description: string
  color: string
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { t } = useTranslation()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([])
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLiked, setIsLiked] = useState(false)

  const slug = React.use(params).slug

  const incrementViews = async (postSlug: string) => {
    try {
      await landingPagesApi.trackEvent({
        event_type: "blog_post_view",
        page: `/blog/${postSlug}`,
        metadata: { post_slug: postSlug }
      })
    } catch (error) {
      console.error("Error tracking view:", error)
    }
  }

  const fetchPostData = async () => {
    setLoading(true)
    try {
      console.log("Fetching post with slug:", slug)
      
      // Fetch the specific post
      const postData = await landingPagesApi.getBlogPost(slug)
      console.log("Post data received:", postData)
      
      if (postData) {
        setPost(postData)
        // Increment view count
        await incrementViews(slug)
      }

      // Fetch categories for styling
      const categoriesData = await landingPagesApi.getBlogCategories()
      setCategories(categoriesData)

      // Fetch related posts (same category, excluding current post)
      const postsData = await landingPagesApi.getBlogPosts({
        category: postData?.category,
        limit: 3,
        featured: false
      })
      setRelatedPosts(postsData.filter(p => p.slug !== slug))
    } catch (error) {
      console.error("Error fetching post data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch-on-mount/slug-change pattern; fetchPostData sets post/loading
    // state from the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPostData()
  }, [slug])

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName)
    return category?.color || "#3b82f6"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatReadTime = (content: string) => {
    const wordsPerMinute = 200
    const words = content.split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return `${minutes} min read`
  }

  const sharePost = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title || "",
        text: post?.excerpt || "",
        url: window.location.href
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h1>
          <p className="text-gray-600 mb-8">The blog post you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/blog">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center text-muted-foreground hover:text-foreground mb-8">
          <Link href="/blog" className="flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
        </div>
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Badge 
              style={{ backgroundColor: getCategoryColor(post.category) }}
              className="text-white"
            >
              {post.category}
            </Badge>
            {post.featured && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                Featured
              </Badge>
            )}
            {post.status === "draft" && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                Draft
              </Badge>
            )}
          </div>
          
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
          
          {post.excerpt && (
            <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
              {post.excerpt}
            </p>
          )}
          
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-8">
            <div className="flex items-center space-x-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.created_at)}</span>
              </div>
              {post.read_time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{post.read_time}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>{post.views} views</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsLiked(!isLiked)}
                className={isLiked ? "text-red-500" : "text-gray-500"}
              >
                <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={isBookmarked ? "text-blue-500" : "text-gray-500"}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        {post.image_url && (
          <div className="relative mb-8 w-full h-64">
            <Image
              src={post.image_url}
              alt={post.title}
              fill
              className="object-cover rounded-lg"
            />
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <div 
            className="text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 pt-16 border-t">
            <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Card key={relatedPost.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        style={{ backgroundColor: getCategoryColor(relatedPost.category) }}
                        className="text-white text-xs"
                      >
                        {relatedPost.category}
                      </Badge>
                    </div>
                    <CardTitle className="line-clamp-2">
                      <Link 
                        href={`/blog/${relatedPost.slug}`} 
                        className="hover:text-primary transition-colors"
                      >
                        {relatedPost.title}
                      </Link>
                    </CardTitle>
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                      {relatedPost.excerpt || relatedPost.content.substring(0, 100) + "..."}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(relatedPost.created_at)}</span>
                      <span>{relatedPost.views} views</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Newsletter CTA */}
      <section className="bg-muted border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-16">
          <h2 className="text-3xl font-bold mb-4">
            {t("blog.newsletter.title") || "Stay Updated"}
          </h2>
          <p className="text-xl mb-8 text-muted-foreground">
            {t("blog.newsletter.description") || "Get the latest articles and insights delivered to your inbox"}
          </p>
          <NewsletterForm />
        </div>
      </section>
    </div>
  )
}

function NewsletterForm() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage("")

    try {
      const response = await landingPagesApi.subscribeNewsletter(email)
      if (response.status === "success") {
        setMessage(t("blog.newsletter.success") || "Successfully subscribed!")
        setEmail("")
      } else {
        setMessage(t("blog.newsletter.error") || "Failed to subscribe. Please try again.")
      }
    } catch (error) {
      setMessage(t("blog.newsletter.error") || "Failed to subscribe. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder={t("blog.newsletter.placeholder") || "Enter your email"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-background border-input"
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("blog.newsletter.subscribing") || "Subscribing..." : t("blog.newsletter.subscribe") || "Subscribe"}
        </Button>
      </div>
      {message && (
        <p className={`mt-2 text-sm ${message.includes("Successfully") ? "text-green-400" : "text-red-400"}`}>
          {message}
        </p>
      )}
    </form>
  )
}
