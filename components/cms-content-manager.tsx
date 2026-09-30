"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Plus, Edit, Trash, Eye, Save, X,
  FileText, Users, MessageSquare, TrendingUp,
  Search, Filter, RefreshCw, Building, Activity
} from "lucide-react"
import { getCmsEndpointUrl, getApiUrl } from "@/lib/config"
import CMSOrganizations from "./cms-organizations"
import CMSUsers from "./cms-users"
import CMSSystemHealth from "./cms-system-health"

interface CMSContentManagerProps {
  token: string
}

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

interface ContactSubmission {
  id: number
  name: string
  email: string
  company?: string
  phone?: string
  message: string
  inquiry_type: string
  status: string
  priority: string
  created_at: string
}

interface SalesLead {
  id: number
  name: string
  email: string
  company?: string
  phone?: string
  source: string
  status: string
  score: number
  created_at: string
}

function BlogPostForm({ post, onSave, onCancel, loading }: {
  post?: BlogPost,
  onSave: (data: Partial<BlogPost>) => void,
  onCancel: () => void,
  loading: boolean
}) {
  const [formData, setFormData] = useState({
    title: post?.title || "",
    slug: post?.slug || "",
    excerpt: post?.excerpt || "",
    content: post?.content || "",
    author: post?.author || "",
    category: post?.category || "",
    featured: post?.featured || false,
    status: post?.status || "draft",
    tags: post?.tags?.join(", ") || ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      ...formData,
      tags: formData.tags.split(",").map(tag => tag.trim()).filter(Boolean)
    }
    onSave(data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{post ? "Edit Blog Post" : "Create New Blog Post"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Slug</label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({...formData, slug: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Excerpt</label>
            <Input
              value={formData.excerpt}
              onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={10}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Author</label>
              <Input
                value={formData.author}
                onChange={(e) => setFormData({...formData, author: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AI & ML">AI & ML</SelectItem>
                  <SelectItem value="Product Updates">Product Updates</SelectItem>
                  <SelectItem value="Tutorials">Tutorials</SelectItem>
                  <SelectItem value="Company News">Company News</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                placeholder="AI, Machine Learning, Tutorial"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.featured}
                  onCheckedChange={(checked) => setFormData({...formData, featured: checked})}
                />
                <label className="text-sm font-medium">Featured</label>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex space-x-2">
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


export default function CMSContentManager({ token }: CMSContentManagerProps) {
  const [activeTab, setActiveTab] = useState("blog")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Blog state
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  
  // Contact state
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([])
  
  // Sales state
  const [salesLeads, setSalesLeads] = useState<SalesLead[]>([])

  // Track the current valid token (may be refreshed)
  const currentTokenRef = useRef<string>(token)
  
  // Update token ref when prop changes
  useEffect(() => {
    currentTokenRef.current = token
  }, [token])

  // Token refresh helper.
  // Dev-only fallback: NEXT_PUBLIC_CMS_ADMIN_USERNAME/PASSWORD must be set explicitly (e.g. in
  // .env.local for local development) for this to attempt a silent re-login. There is no
  // hardcoded credential here - in any environment where those vars aren't set (production),
  // this just returns null and the caller falls back to a normal 401, which should surface a
  // re-authentication prompt rather than silently using a baked-in password.
  const refreshToken = async (): Promise<string | null> => {
    const cmsUsername = process.env.NEXT_PUBLIC_CMS_ADMIN_USERNAME
    const cmsPassword = process.env.NEXT_PUBLIC_CMS_ADMIN_PASSWORD
    if (!cmsUsername || !cmsPassword) {
      console.warn("CMS token refresh skipped: NEXT_PUBLIC_CMS_ADMIN_USERNAME/PASSWORD not configured")
      return null
    }
    try {
      console.log("Attempting to refresh token with configured CMS admin credentials...")
      const response = await fetch(getApiUrl("/v1/auth/cms-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cmsUsername, password: cmsPassword }),
      })

      if (response.ok) {
        const data = await response.json()
        const token = data.access_token
        if (token) {
          console.log("Token refreshed successfully, updating local reference")
          currentTokenRef.current = token
          return token
        }
      }
    } catch (err) {
      console.error("Token refresh error:", err)
    }
    return null
  }

  // Make API request with automatic token refresh on 401/403
  const makeAuthenticatedRequest = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    try {
      let currentToken = currentTokenRef.current
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          "Authorization": `Bearer ${currentToken}`,
          "Content-Type": "application/json"
        }
      })

      // If we get 401/403, try to refresh token and retry
      if (response.status === 401 || response.status === 403) {
        console.log("Token invalid, attempting refresh...")
        const newToken = await refreshToken()
        if (newToken && newToken !== currentToken) {
          console.log("Retrying request with refreshed token")
          // Retry with new token
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              "Authorization": `Bearer ${newToken}`,
              "Content-Type": "application/json"
            }
          })
        }
      }

      return response
    } catch (err) {
      console.error("Request error:", err)
      throw err
    }
  }

  // Fetch data
  const fetchBlogPosts = async () => {
    try {
      console.log("Fetching blog posts...")
      const response = await makeAuthenticatedRequest(getCmsEndpointUrl("/blog/posts"), {
        method: "GET"
      })
      if (response.ok) {
        const posts = await response.json()
        console.log("Blog posts fetched:", posts)
        setBlogPosts(Array.isArray(posts) ? posts : posts.posts || [])
        setError("")
      } else {
        console.error("Failed to fetch blog posts, status:", response.status)
        setError(`Failed to fetch blog posts (${response.status})`)
      }
    } catch (err) {
      console.error("Error fetching blog posts:", err)
      setError("Failed to fetch blog posts")
    }
  }

  const fetchContactSubmissions = async () => {
    try {
      const response = await makeAuthenticatedRequest(getCmsEndpointUrl("/contact/submissions"), {
        method: "GET"
      })
      if (response.ok) {
        const submissions = await response.json()
        console.log("Contact submissions fetched:", submissions)
        setContactSubmissions(Array.isArray(submissions) ? submissions : submissions.submissions || [])
        setError("")
      } else {
        console.error("Failed to fetch contact submissions, status:", response.status)
        setError(`Failed to fetch contact submissions (${response.status})`)
      }
    } catch (err) {
      console.error("Error fetching contact submissions:", err)
      setError("Failed to fetch contact submissions")
    }
  }

  const fetchSalesLeads = async () => {
    try {
      const response = await makeAuthenticatedRequest(getCmsEndpointUrl("/sales/leads"), {
        method: "GET"
      })
      if (response.ok) {
        const leads = await response.json()
        console.log("Sales leads fetched:", leads)
        setSalesLeads(Array.isArray(leads) ? leads : leads.leads || [])
        setError("")
      } else {
        console.error("Failed to fetch sales leads, status:", response.status)
        setError(`Failed to fetch sales leads (${response.status})`)
      }
    } catch (err) {
      console.error("Error fetching sales leads:", err)
      setError("Failed to fetch sales leads")
    }
  }

  // Blog operations
  const createBlogPost = async (postData: Partial<BlogPost>) => {
    setLoading(true)
    try {
      const response = await makeAuthenticatedRequest(getCmsEndpointUrl("/blog/posts"), {
        method: "POST",
        body: JSON.stringify(postData)
      })
      
      if (response.ok) {
        await fetchBlogPosts()
        setIsCreatingPost(false)
        setEditingPost(null)
        setError("")
      } else {
        setError("Failed to create blog post")
      }
    } catch (err) {
      console.error("Error creating blog post:", err)
      setError("Failed to create blog post")
    } finally {
      setLoading(false)
    }
  }

  const updateBlogPost = async (id: number, postData: Partial<BlogPost>) => {
    setLoading(true)
    try {
      const response = await makeAuthenticatedRequest(getCmsEndpointUrl(`/blog/posts/${id}`), {
        method: "PUT",
        body: JSON.stringify(postData)
      })
      
      if (response.ok) {
        await fetchBlogPosts()
        setEditingPost(null)
        setError("")
      } else {
        setError("Failed to update blog post")
      }
    } catch (err) {
      console.error("Error updating blog post:", err)
      setError("Failed to update blog post")
    } finally {
      setLoading(false)
    }
  }

  const deleteBlogPost = async (id: number) => {
    if (!confirm("Are you sure you want to delete this post?")) return
    
    setLoading(true)
    try {
      const response = await makeAuthenticatedRequest(getCmsEndpointUrl(`/blog/posts/${id}`), {
        method: "DELETE"
      })
      
      if (response.ok) {
        await fetchBlogPosts()
        setError("")
      } else {
        setError("Failed to delete blog post")
      }
    } catch (err) {
      console.error("Error deleting blog post:", err)
      setError("Failed to delete blog post")
    } finally {
      setLoading(false)
    }
  }

  // Load data on tab change. Fetch-on-condition pattern; each fetchX sets
  // its own data/loading state from the async response.
  useEffect(() => {
    if (activeTab === "blog") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchBlogPosts()
    } else if (activeTab === "contacts") {
      fetchContactSubmissions()
    } else if (activeTab === "sales") {
      fetchSalesLeads()
    }
  }, [activeTab])


  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="blog">
            <FileText className="w-4 h-4 mr-2" />
            Blog Posts
          </TabsTrigger>
          <TabsTrigger value="organizations">
            <Building className="w-4 h-4 mr-2" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="system-health">
            <Activity className="w-4 h-4 mr-2" />
            System Health
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Submissions
          </TabsTrigger>
          <TabsTrigger value="sales">
            <TrendingUp className="w-4 h-4 mr-2" />
            Sales Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blog" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Blog Posts</h2>
            <Button onClick={() => setIsCreatingPost(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </div>

          {(isCreatingPost || editingPost) && (
            <BlogPostForm
              post={editingPost || undefined}
              loading={loading}
              onSave={(data) => {
                if (editingPost) {
                  updateBlogPost(editingPost.id, data)
                } else {
                  createBlogPost(data)
                }
              }}
              onCancel={() => {
                setIsCreatingPost(false)
                setEditingPost(null)
              }}
            />
          )}

          <div className="grid gap-4">
            {blogPosts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{post.title}</h3>
                        <Badge variant={post.status === "published" ? "default" : "secondary"}>
                          {post.status}
                        </Badge>
                        {post.featured && <Badge variant="outline">Featured</Badge>}
                      </div>
                      <p className="text-muted-foreground mb-2">{post.excerpt}</p>
                      <div className="text-sm text-muted-foreground">
                        <span>By {post.author}</span> • <span>{post.category}</span> • <span>{post.views} views</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingPost(post)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteBlogPost(post.id)}>
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Contact Submissions</h2>
            <Button variant="outline" onClick={fetchContactSubmissions}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4">
            {contactSubmissions.map((submission) => (
              <Card key={submission.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{submission.name}</h3>
                        <Badge variant="outline">{submission.inquiry_type}</Badge>
                        <Badge variant={submission.status === "new" ? "default" : "secondary"}>
                          {submission.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-2">{submission.message}</p>
                      <div className="text-sm text-muted-foreground">
                        <span>{submission.email}</span>
                        {submission.company && <span> • {submission.company}</span>}
                        {submission.phone && <span> • {submission.phone}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Sales Leads</h2>
            <Button variant="outline" onClick={fetchSalesLeads}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4">
            {salesLeads.map((lead) => (
              <Card key={lead.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{lead.name}</h3>
                        <Badge variant="outline">{lead.source}</Badge>
                        <Badge variant={lead.status === "new" ? "default" : "secondary"}>
                          {lead.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span>{lead.email}</span>
                        {lead.company && <span> • {lead.company}</span>}
                        {lead.phone && <span> • {lead.phone}</span>}
                        <span> • Score: {lead.score}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <CMSOrganizations token={token} />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <CMSUsers token={token} />
        </TabsContent>

        <TabsContent value="system-health" className="space-y-4">
          <CMSSystemHealth token={token} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
