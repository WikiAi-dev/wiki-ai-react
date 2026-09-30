"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Building,
  User,
  ArrowLeft,
  RefreshCw
} from "lucide-react"
import { useTranslation } from '@/src/i18n'
import { adminApi } from "@/lib/api"

function ReviewStatusContent() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [organizationData, setOrganizationData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  
  const orgName = searchParams.get('org')
  const adminEmail = searchParams.get('email')

  useEffect(() => {
    const checkOrganizationStatus = async () => {
      try {
        setLoading(true)
        setError("")
        
        if (adminEmail) {
          // Check real organization status by email
          const response = await adminApi.getOrganizationStatusByEmail(adminEmail)
          
          if (response.status === "success" && response.response?.organization) {
            const org = response.response.organization
            setOrganizationData({
              name: org.name,
              status: org.status,
              adminEmail: adminEmail,
              submittedAt: org.created_at,
              estimatedReviewTime: "1-2 business days"
            })
            
            // If approved, redirect to /app
            if (org.status === "approved") {
              router.push("/app")
              return
            }
          } else {
            // No organization found or error
            if (orgName) {
              // Fallback to simulated data if org name provided
              setOrganizationData({
                name: orgName,
                status: "pending",
                adminEmail: adminEmail,
                submittedAt: new Date().toISOString(),
                estimatedReviewTime: "1-2 business days"
              })
            } else {
              setError("No organization found for this email address")
            }
          }
        } else if (orgName) {
          // Fallback to simulated data if only org name provided
          setOrganizationData({
            name: orgName,
            status: "pending",
            adminEmail: adminEmail || "unknown",
            submittedAt: new Date().toISOString(),
            estimatedReviewTime: "1-2 business days"
          })
        } else {
          setError("Missing organization information")
        }
      } catch (err) {
        console.error("Error checking organization status:", err)
        setError("Failed to check organization status")
        
        // Fallback to simulated data on error
        if (orgName || adminEmail) {
          setOrganizationData({
            name: orgName || "Your Organization",
            status: "pending",
            adminEmail: adminEmail || "unknown",
            submittedAt: new Date().toISOString(),
            estimatedReviewTime: "1-2 business days"
          })
        }
      } finally {
        setLoading(false)
      }
    }

    checkOrganizationStatus()
  }, [orgName, adminEmail, router])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-8 h-8 text-yellow-500" />
      case "approved":
        return <CheckCircle className="w-8 h-8 text-green-500" />
      case "rejected":
        return <XCircle className="w-8 h-8 text-red-500" />
      default:
        return <Clock className="w-8 h-8 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Under Review"
      case "approved":
        return "Approved"
      case "rejected":
        return "Rejected"
      default:
        return "Unknown"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Checking organization status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/" className="flex items-center text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Organization Review Status
          </h1>
          <p className="text-muted-foreground">
            Track your organization&apos;s approval status
          </p>
          {!orgName && adminEmail && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Login Attempt Blocked:</strong> Your organization is still pending approval. 
                Please wait for an administrator to review and approve your organization before attempting to login again.
              </p>
            </div>
          )}
        </div>

        {organizationData && (
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{organizationData.name}</CardTitle>
                  <Badge className={getStatusColor(organizationData.status)}>
                    {getStatusText(organizationData.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-6">
                  {getStatusIcon(organizationData.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Admin Email</p>
                      <p className="font-medium">{organizationData.adminEmail}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Submitted</p>
                      <p className="font-medium">
                        {new Date(organizationData.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {organizationData.status === "pending" && (
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-medium mb-2">What happens next?</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Our team will review your organization within {organizationData.estimatedReviewTime}</li>
                      <li>• You&apos;ll receive an email at {organizationData.adminEmail} when the review is complete</li>
                      <li>• Once approved, you&apos;ll be able to login and start using WikiAI</li>
                    </ul>
                  </div>
                )}

                {organizationData.status === "approved" && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="font-medium text-green-800 mb-2">🎉 Congratulations!</h3>
                    <p className="text-sm text-green-700 mb-4">
                      Your organization has been approved. You can now login and start using WikiAI.
                    </p>
                    <Button asChild>
                      <Link href="/login">
                        Go to Login
                      </Link>
                    </Button>
                  </div>
                )}

                {organizationData.status === "rejected" && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h3 className="font-medium text-red-800 mb-2">Application Rejected</h3>
                    <p className="text-sm text-red-700 mb-4">
                      Unfortunately, your organization application could not be approved at this time.
                    </p>
                    <Button variant="outline" asChild>
                      <Link href="/contact">
                        Contact Support
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check Status Again
                  </Button>
                  
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/contact">
                      <Mail className="w-4 h-4 mr-2" />
                      Contact Support
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

export default function ReviewStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ReviewStatusContent />
    </Suspense>
  )
}
