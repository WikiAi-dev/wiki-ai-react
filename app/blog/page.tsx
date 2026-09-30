"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useTranslation } from "@/src/i18n"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Calendar, Clock, User, Eye } from "lucide-react"
import { landingPagesApi } from "@/lib/api"
import LandingHeader from '@/components/landing-header'

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

export default function BlogPage() {
  const { t } = useTranslation()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("latest")
  const [currentPage, setCurrentPage] = useState(1)
  const postsPerPage = 6

  const fetchBlogData = async () => {
    setLoading(true)
    try {
      // Fetch posts
      const postsData = await landingPagesApi.getBlogPosts({
        search: searchTerm,
        category: selectedCategory === "all" ? undefined : selectedCategory,
        limit: postsPerPage,
        offset: (currentPage - 1) * postsPerPage,
      })

      console.log("Posts Data:", postsData)

      setPosts(postsData)

      // Fetch categories
      const categoriesData = await landingPagesApi.getBlogCategories()
      console.log("Categories Data:", categoriesData)
      setCategories(categoriesData)
    } catch (error) {
      console.error("Error fetching blog data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch-on-mount/filter-change pattern; fetchBlogData sets
    // posts/loading state from the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBlogData()
  }, [searchTerm, selectedCategory, sortBy, currentPage])

  const featuredPosts = posts.filter(post => post.featured).slice(0, 3)
  const regularPosts = posts.filter(post => !post.featured)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold mb-4">{t("blog.title") || "WikiAI Blog"}</h1>
            <p className="text-xl mb-8 text-muted-foreground">
              {t("blog.description") || "Discover the latest insights, tutorials, and updates on AI-powered knowledge management"}
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder={t("blog.searchPlaceholder") || "Search articles..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">{t("blog.featured") || "Featured Articles"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {post.image_url && (
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={post.image_url}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        style={{ backgroundColor: getCategoryColor(post.category) }}
                        className="text-white"
                      >
                        {post.category}
                      </Badge>
                      {post.featured && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          {t("blog.featured") || "Featured"}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="line-clamp-2">
                      <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                        {post.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {post.excerpt || post.content.substring(0, 150) + "..."}
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{post.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{post.views}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(post.created_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 bg-background border-input">
                <SelectValue placeholder={t("blog.allCategories") || "All Categories"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("blog.allCategories") || "All Categories"}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.slug} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 bg-background border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">{t("blog.latest") || "Latest"}</SelectItem>
                <SelectItem value="popular">{t("blog.popular") || "Most Popular"}</SelectItem>
                <SelectItem value="oldest">{t("blog.oldest") || "Oldest"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {posts.length} {t("blog.articles") || "articles"}
          </div>
        </div>

        {/* Regular Posts */}
        <section>
          {regularPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {post.image_url && (
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={post.image_url}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        style={{ backgroundColor: getCategoryColor(post.category) }}
                        className="text-white"
                      >
                        {post.category}
                      </Badge>
                      {post.tags.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {post.tags[0]}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="line-clamp-2">
                      <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                        {post.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {post.excerpt || post.content.substring(0, 150) + "..."}
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{post.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{post.views}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(post.created_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                {t("blog.noArticles") || "No articles found"}
              </p>
            </div>
          )}
        </section>

        {/* Pagination */}
        {posts.length === postsPerPage && (
          <div className="flex justify-center mt-8">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                {t("blog.previous") || "Previous"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                {t("blog.next") || "Next"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Newsletter Section */}
      <div className="bg-muted border-t">
        <div className="container mx-auto px-4 text-center py-16">
          <h2 className="text-3xl font-bold mb-4">
            {t("blog.newsletter.title") || "Stay Updated"}
          </h2>
          <p className="text-xl mb-8 text-muted-foreground max-w-2xl mx-auto">
            {t("blog.newsletter.description") || "Get the latest articles and insights delivered to your inbox"}
          </p>
          <NewsletterForm />
        </div>
      </div>
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
