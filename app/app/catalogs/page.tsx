"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { catalogsApi, opencartApi } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  LayoutDashboard,
  Plus,
  Search,
  Trash2,
  Loader2,
  Package,
  Download,
  ShoppingBag,
  DollarSign,
} from "lucide-react"
import { toast } from "sonner"

interface Catalog {
  id: string
  name: string
  product_count: number
}

interface Product {
  id: string
  name: string
  description: string
  price: number
}

export default function CatalogsPage() {
  const { token } = useAuth()
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newCatalogName, setNewCatalogName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteCatalogId, setDeleteCatalogId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Search state
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)

  // Import state
  const [importCatalogId, setImportCatalogId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const fetchCatalogs = useCallback(async () => {
    if (!token) return

    try {
      const result = await catalogsApi.list(token)
      if (result.status === "success" && result.response) {
        setCatalogs(result.response.catalogs || [])
      }
    } catch (error) {
      console.error("Failed to fetch catalogs:", error)
      toast.error("Failed to load catalogs")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    // Fetch-on-mount pattern; fetchCatalogs sets catalogs/loading state
    // from the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCatalogs()
  }, [fetchCatalogs])

  const handleCreateCatalog = async () => {
    if (!token || !newCatalogName.trim()) return

    setIsCreating(true)
    try {
      const result = await catalogsApi.create(token, newCatalogName.trim())

      if (result.status === "success") {
        toast.success("Catalog created successfully")
        setIsDialogOpen(false)
        setNewCatalogName("")
        fetchCatalogs()
      } else {
        toast.error(result.message || "Failed to create catalog")
      }
    } catch (error) {
      console.error("Create catalog error:", error)
      toast.error("Failed to create catalog")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteCatalog = async () => {
    if (!token || !deleteCatalogId) return

    setIsDeleting(true)
    try {
      const result = await catalogsApi.delete(token, deleteCatalogId)

      if (result.status === "success") {
        toast.success("Catalog deleted successfully")
        setDeleteCatalogId(null)
        fetchCatalogs()
      } else {
        toast.error(result.message || "Failed to delete catalog")
      }
    } catch (error) {
      console.error("Delete catalog error:", error)
      toast.error("Failed to delete catalog")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !selectedCatalog || !searchQuery.trim()) return

    setIsSearching(true)
    try {
      const result = await catalogsApi.search(token, selectedCatalog.id, searchQuery.trim())

      if (result.status === "success" && result.response) {
        setSearchResults(result.response.products || [])
      } else {
        setSearchResults([])
        toast.error(result.message || "Search failed")
      }
    } catch (error) {
      console.error("Search error:", error)
      toast.error("Search failed")
    } finally {
      setIsSearching(false)
    }
  }

  const handleImport = async (catalogId: string) => {
    if (!token) return

    setImportCatalogId(catalogId)
    setIsImporting(true)
    try {
      const result = await opencartApi.importProducts(token, catalogId)

      if (result.status === "success") {
        toast.success("Products imported successfully")
        fetchCatalogs()
      } else {
        toast.error(result.message || "Import failed")
      }
    } catch (error) {
      console.error("Import error:", error)
      toast.error("Import failed")
    } finally {
      setIsImporting(false)
      setImportCatalogId(null)
    }
  }

  const openSearchDialog = (catalog: Catalog) => {
    setSelectedCatalog(catalog)
    setSearchQuery("")
    setSearchResults([])
    setIsSearchDialogOpen(true)
  }

  if (isLoading) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Catalogs" }]} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </>
    )
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: "Catalogs" }]} />
      <main className="flex-1 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Product Catalogs</h1>
            <p className="text-muted-foreground">Manage your product catalogs for semantic search</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Catalog
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Catalog</DialogTitle>
                <DialogDescription>Create a new product catalog for semantic search</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="catalogName">Catalog Name</Label>
                  <Input
                    id="catalogName"
                    placeholder="e.g., Electronics Store"
                    value={newCatalogName}
                    onChange={(e) => setNewCatalogName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCatalog} disabled={!newCatalogName.trim() || isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Catalog"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {catalogs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <LayoutDashboard className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No catalogs yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create a catalog to start organizing your products
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Catalog
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {catalogs.map((catalog, index) => (
              <Card key={catalog.id || `catalog-${index}`} className="group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{catalog.name || "Unnamed Catalog"}</CardTitle>
                        <CardDescription>{catalog.product_count ?? 0} products</CardDescription>
                      </div>
                    </div>
                    {catalog.id && <Badge variant="secondary">{catalog.id.slice(0, 8)}</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openSearchDialog(catalog)}>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                    {catalog.id && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleImport(catalog.id)}
                          disabled={isImporting && importCatalogId === catalog.id}
                        >
                          {isImporting && importCatalogId === catalog.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Import
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteCatalogId(catalog.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Search Dialog */}
        <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Search Products</DialogTitle>
              <DialogDescription>
                Search in {selectedCatalog?.name} ({selectedCatalog?.product_count} products)
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Describe what you're looking for..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" disabled={!searchQuery.trim() || isSearching}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {searchResults.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{product.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
                          <div className="flex items-center gap-1 mt-2 text-primary font-semibold">
                            <DollarSign className="w-4 h-4" />
                            {product.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !isSearching && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No products found</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteCatalogId} onOpenChange={() => setDeleteCatalogId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Catalog</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this catalog? All products in this catalog will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCatalog}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Catalog"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  )
}
