"use client"

import React from "react"
import { useFileReader } from "@/hooks/use-file-reader"
import { UnifiedFileReader } from "@/components/ui/file-reader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye } from "lucide-react"

// Example component showing how to use the unified FileReader
export function FileReaderExample({ token }: { token: string | null }) {
  const { openFile, isOpen, selectedFile, setIsOpen } = useFileReader()

  // Example file data
  const exampleFiles = [
    {
      filename: "example.pdf",
      size: 1024000,
      upload_date: "2024-01-08T10:00:00Z",
      content_type: "application/pdf",
      indexed: true
    },
    {
      filename: "document.docx",
      size: 512000,
      upload_date: "2024-01-08T11:00:00Z", 
      content_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      indexed: true
    },
    {
      filename: "image.png",
      size: 256000,
      upload_date: "2024-01-08T12:00:00Z",
      content_type: "image/png",
      indexed: false
    }
  ]

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>File Reader Usage Example</CardTitle>
          <CardDescription>
            Click on any file to view it using the unified FileReader component
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {exampleFiles.map((file) => (
            <div
              key={file.filename}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {file.filename.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium">{file.filename}</h4>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB • {file.indexed ? 'Indexed' : 'Not Indexed'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openFile(file)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* The FileReader component that handles all file viewing */}
      <UnifiedFileReader
        file={selectedFile}
        token={token}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  )
}

// Direct usage without hook:
export function DirectFileReaderExample({ token }: { token: string | null }) {
  const [selectedFile, setSelectedFile] = React.useState<any>(null)
  const [isOpen, setIsOpen] = React.useState(false)

  const exampleFile = {
    filename: "sample.pdf",
    size: 1024000,
    upload_date: "2024-01-08T10:00:00Z",
    content_type: "application/pdf",
    indexed: true
  }

  return (
    <>
      <Button onClick={() => {
        setSelectedFile(exampleFile)
        setIsOpen(true)
      }}>
        Open Sample PDF
      </Button>

      <UnifiedFileReader
        file={selectedFile}
        token={token}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  )
}
