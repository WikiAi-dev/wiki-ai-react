"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { adminApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Mail, 
  Shield, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Moon,
  Sun
} from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "next-themes"

interface InviteInfo {
  valid: boolean
  org_name: string
  email?: string
  role: string
  allowed_files: string[]
  expires_at: string
  created_by: string
  message?: string
}

// Hoisted to module scope (not defined inside InvitePageContent's render
// body) so its identity is stable across renders; takes the theme toggle
// as a prop instead of closing over it.
function SimpleHeader({ onToggleTheme }: { onToggleTheme: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <div className="flex items-center gap-2">
        <Mail className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">WikiAI</span>
      </div>
      <div className="ml-auto">
        <Button variant="ghost" size="icon" onClick={onToggleTheme}>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  )
}

function InvitePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { theme, setTheme } = useTheme()

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isValidating, setIsValidating] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")

  const fetchInviteInfo = useCallback(async () => {
    if (!token) {
      setError("Invalid invite link")
      setIsLoading(false)
      return
    }

    try {
      const result = await adminApi.getInviteInfo(token)
      
      if (result.status === "success" && result.response) {
        setInviteInfo(result.response)
      } else {
        setError(result.message || "Invalid invite link")
      }
    } catch (error) {
      console.error("Failed to fetch invite info:", error)
      setError("Failed to validate invite link")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    // Fetch-on-mount pattern; fetchInviteInfo sets invite/loading state
    // from the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInviteInfo()
  }, [fetchInviteInfo])

  const handleRegister = async () => {
    if (!inviteInfo || !token) return

    // Validation
    if (!username.trim()) {
      setError("Username is required")
      return
    }

    if (!password) {
      setError("Password is required")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsRegistering(true)
    setError("")

    try {
      const result = await adminApi.acceptInvite(token, {
        username: username.trim(),
        password,
      })

      if (result.status === "success") {
        toast.success("Account created successfully! Redirecting to login...")
        // Redirect to login page after a short delay
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        setError(result.message || "Failed to create account")
      }
    } catch (error) {
      console.error("Registration error:", error)
      setError("Failed to create account. Please try again.")
    } finally {
      setIsRegistering(false)
    }
  }

  const isExpired = inviteInfo ? new Date(inviteInfo.expires_at) < new Date() : false
  const isValid = inviteInfo?.valid && !isExpired

  if (isLoading) {
    return (
      <>
        <SimpleHeader onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Validating invite...</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <SimpleHeader onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">You&apos;re Invited!</CardTitle>
              <CardDescription>
                Join our platform and start collaborating
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!inviteInfo || !isValid ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error || "This invite link is invalid or has expired."}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Invite Details */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={isValid ? "default" : "secondary"}>
                        {isExpired ? (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Expired
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Valid
                          </>
                        )}
                      </Badge>
                    </div>
                    
                    {inviteInfo.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Email</span>
                        <span className="text-sm font-medium">{inviteInfo.email}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Role</span>
                      <div className="flex items-center gap-2">
                        {inviteInfo.role === "admin" ? (
                          <Shield className="w-4 h-4 text-primary" />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium capitalize">{inviteInfo.role}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Expires</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(inviteInfo.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Invited by</span>
                      <span className="text-sm font-medium">{inviteInfo.created_by}</span>
                    </div>

                    {inviteInfo.message && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground italic">
                          &quot;{inviteInfo.message}&quot;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Registration Form */}
                  {isValid && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          placeholder="Choose a username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={isRegistering}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password (min 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isRegistering}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isRegistering}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isRegistering}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={isRegistering}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {error && (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      
                      <Button
                        onClick={handleRegister}
                        disabled={isRegistering || !username.trim() || !password || password !== confirmPassword}
                        className="w-full"
                      >
                        {isRegistering ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  )
}
