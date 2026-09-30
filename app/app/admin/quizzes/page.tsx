"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { adminApi, filesApi, dashboardApi } from "@/lib/api"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Edit,
  Trash2,
  Play,
  BarChart3,
  Users,
  Clock,
  Target,
  TrendingUp,
  Eye,
  Download,
  Upload,
  Brain,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/src/i18n"

interface Quiz {
  id: string
  title: string
  description: string
  category: string
  difficulty: "easy" | "medium" | "hard"
  time_limit_minutes: number
  passing_score: number
  questions: Question[]
  created_at: string
  updated_at: string
  organization_id: string
}

interface Question {
  id: string
  type: "multiple-choice" | "true-false" | "text"
  question: string
  options?: string[]
  correct_answer: string | number
  explanation?: string
  points: number
}

interface QuizStats {
  total_submissions: number
  pass_rate: number
  avg_score: number
  avg_time_spent: number
  recent_submissions: Array<{
    user_id: string
    score: number
    passed: boolean
    submitted_at: string
  }>
}

interface QuizFormData {
  title: string
  description: string
  category: string
  difficulty: "easy" | "medium" | "hard"
  time_limit_minutes: number
  passing_score: number
  questions: Question[]
}

export default function AdminQuizzesPage() {
  const { token, user } = useAuth()
  const { t } = useTranslation()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [quizStats, setQuizStats] = useState<Record<string, QuizStats>>({})
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showStatsDialog, setShowStatsDialog] = useState(false)
  const [generatingQuiz, setGeneratingQuiz] = useState(false)
  const [showFileSelectDialog, setShowFileSelectDialog] = useState(false)
  const [availableFiles, setAvailableFiles] = useState<any[]>([])
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [formData, setFormData] = useState<QuizFormData>({
    title: "",
    description: "",
    category: "",
    difficulty: "medium",
    time_limit_minutes: 15,
    passing_score: 70,
    questions: []
  })

  const fetchQuizzes = async () => {
    try {
      setLoading(true)
      if (!token) return
      const response = await dashboardApi.getQuizzes(token)
      if (response.status === "success" && response.response) {
        setQuizzes(response.response.items ?? [])
      }
    } catch (error) {
      toast.error("Failed to fetch quizzes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch-on-mount pattern; fetchQuizzes sets quizzes/loading state
    // from the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQuizzes()
  }, [])

  const fetchQuizStats = async (quizId: string) => {
    try {
      if (!token) return
      setLoading(true)
      const response = await dashboardApi.getQuizStats(quizId, token)
      if (response.status === "success" && response.response) {
        setQuizStats(prev => ({
          ...prev,
          [quizId]: response.response as QuizStats
        }))
      }
    } catch (error) {
      toast.error("Failed to fetch quiz statistics")
    } finally {
      setLoading(false)
    }
  }

  const createQuiz = async () => {
    try {
      if (!token) return
      
      // Validate form data before submission
      if (!formData.title.trim()) {
        toast.error("Quiz title is required")
        return
      }
      
      if (!formData.questions || formData.questions.length === 0) {
        toast.error("Quiz must have at least one question")
        return
      }
      
      // Validate each question
      for (let i = 0; i < formData.questions.length; i++) {
        const question = formData.questions[i]
        if (!question.question.trim()) {
          toast.error(`Question ${i + 1} text is required`)
          return
        }
        
        if (question.type === "multiple-choice") {
          if (!question.options || question.options.length < 2) {
            toast.error(`Question ${i + 1} must have at least 2 options`)
            return
          }
          
          const hasCorrectAnswer = question.options.some((_, index) => 
            question.correct_answer === index
          )
          if (!hasCorrectAnswer) {
            toast.error(`Question ${i + 1} must have a correct answer selected`)
            return
          }
        }
        
        if (question.type === "true-false") {
          if (!question.options || question.options.length !== 2) {
            toast.error(`Question ${i + 1} must have exactly 2 options (True/False)`)
            return
          }
        }
      }
      
      const response = await dashboardApi.createQuiz(formData, token)
      console.log('Create quiz response:', response)
      if (response.status === "success") {
        toast.success("Quiz created successfully")
        setShowCreateDialog(false)
        setFormData({
          title: "",
          description: "",
          category: "",
          difficulty: "medium",
          time_limit_minutes: 15,
          passing_score: 70,
          questions: []
        })
        fetchQuizzes()
      } else {
        console.error('Quiz creation failed:', response)
        const errorMessage = response.message || "Failed to create quiz"
        toast.error(errorMessage)
      }
    } catch (error) {
      toast.error("Failed to create quiz")
    }
  }

  const updateQuiz = async () => {
    if (!selectedQuiz || !token) return
    
    try {
      // Validate form data before submission
      if (!formData.title.trim()) {
        toast.error("Quiz title is required")
        return
      }
      
      if (!formData.questions || formData.questions.length === 0) {
        toast.error("Quiz must have at least one question")
        return
      }
      
      // Validate each question
      for (let i = 0; i <formData.questions.length; i++) {
        const question = formData.questions[i]
        if (!question.question.trim()) {
          toast.error(`Question ${i + 1} text is required`)
          return
        }
        
        if (question.type === "multiple-choice") {
          if (!question.options || question.options.length < 2) {
            toast.error(`Question ${i + 1} must have at least 2 options`)
            return
          }
          
          const hasCorrectAnswer = question.options.some((_, index) => 
            question.correct_answer === index
          )
          if (!hasCorrectAnswer) {
            toast.error(`Question ${i + 1} must have a correct answer selected`)
            return
          }
        }
        
        if (question.type === "true-false") {
          if (!question.options || question.options.length !== 2) {
            toast.error(`Question ${i + 1} must have exactly 2 options (True/False)`)
            return
          }
        }
      }
      
      const response = await dashboardApi.updateQuiz(selectedQuiz.id, formData, token)
      if (response.status === "success") {
        toast.success("Quiz updated successfully")
        setShowEditDialog(false)
        fetchQuizzes()
      }
    } catch (error) {
      toast.error("Failed to update quiz")
    }
  }

  const deleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz?") || !token) return
    
    try {
      const response = await dashboardApi.deleteQuiz(quizId, token)
      if (response.status === "success") {
        toast.success("Quiz deleted successfully")
        fetchQuizzes()
      }
    } catch (error) {
      toast.error("Failed to delete quiz")
    }
  }

  const generateQuizFromAI = async () => {
    // First fetch available files and show selection dialog
    await fetchFiles()
    setShowFileSelectDialog(true)
  }

  const fetchFiles = async () => {
    try {
      if (!token) return
      const response = await filesApi.list(token)
      if (response.status === "success" && response.response) {
        setAvailableFiles(response.response.documents)
      }
    } catch (error) {
      toast.error("Failed to fetch files")
    }
  }

  const generateQuizFromSelectedFile = async () => {
    if (!selectedFile || !token) {
      toast.error("Please select a file first")
      return
    }
    
    setGeneratingQuiz(true)
    try {
      // Use the proper API function
      const response = await dashboardApi.generateQuizFromDocument(selectedFile, token, true)
      console.log('Full API response:', response)
      
      if (response && response.status === "success") {
        const quizData = response.response?.quiz
        console.log('Extracted quiz data:', quizData)
        let parsedQuiz = null
        
        try {
          // Try to parse the quiz JSON if it exists
          if (quizData?.quiz_json) {
            parsedQuiz = JSON.parse(quizData.quiz_json)
            console.log('Successfully parsed AI quiz:', parsedQuiz)
          } else if (quizData && typeof quizData === 'object') {
            // Use the quiz data directly if it's already an object
            parsedQuiz = quizData
            console.log('Using quiz data directly as parsed object')
          }
        } catch (parseError) {
          console.error('JSON parsing error:', parseError)
          parsedQuiz = null
        }
        
        // Convert to form format
        const convertedQuestions = parsedQuiz?.questions?.map((q: any, index: number) => {
          const correctAnswer = q.options?.indexOf(q.answer) >= 0 ? q.options?.indexOf(q.answer) : q.answer
          const questionType = q.options?.length > 2 ? "multiple-choice" : "true-false"
          
          console.log(`Converting question ${index}:`, {
            original: q,
            correctAnswer,
            questionType
          })
          
          return {
            id: (index + 1).toString(),
            type: questionType,
            question: q.question,
            options: q.options || [],
            correct_answer: correctAnswer,
            explanation: q.explanation || "",
            points: 10
          }
        }) || []
        
        console.log('Final converted questions:', convertedQuestions)
        
        const aiGeneratedQuiz: QuizFormData = {
          title: `AI Quiz: ${selectedFile}`,
          description: `Automatically generated quiz from document: ${selectedFile}`,
          category: "AI Generated",
          difficulty: "medium",
          time_limit_minutes: 15,
          passing_score: 70,
          questions: convertedQuestions
        }
        
        setFormData(aiGeneratedQuiz)
        setShowFileSelectDialog(false)
        setShowCreateDialog(true)
        
        if (parsedQuiz && convertedQuestions.length > 0) {
          toast.success("Quiz generated successfully! Review and save to create.")
        } else {
          toast.info("AI generation unavailable. Created a sample quiz for you to customize.")
          
          // Fallback to sample quiz if AI generation fails
          const fallbackQuiz: QuizFormData = {
            title: "AI Generated Knowledge Test",
            description: "Automatically generated quiz about your knowledge base",
            category: "General Knowledge",
            difficulty: "medium",
            time_limit_minutes: 10,
            passing_score: 75,
            questions: [
              {
                id: "1",
                type: "multiple-choice",
                question: "What is the primary purpose of a knowledge management system?",
                options: [
                  "To store documents only",
                  "To organize and retrieve information efficiently",
                  "To replace human employees",
                  "To create backups"
                ],
                correct_answer: 1,
                explanation: "Knowledge management systems organize information for efficient access and retrieval.",
                points: 10
              }
            ]
          }
          
          setFormData(fallbackQuiz)
          setShowFileSelectDialog(false)
          setShowCreateDialog(true)
        }
      } else {
        console.error('API response not successful:', response)
        const errorMessage = response?.message || "Failed to generate quiz from document"
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Quiz generation error:', error)
      toast.error("Failed to generate quiz")
    } finally {
      setGeneratingQuiz(false)
    }
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: "multiple-choice",
      question: "",
      options: ["", "", "", ""],
      correct_answer: 0,
      explanation: "",
      points: 10
    }
    
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }))
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }))
  }

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }))
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800"
      case "medium": return "bg-yellow-100 text-yellow-800"
      case "hard": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: t('nav.admin'), href: "/app/admin" }, { label: t('quizManagement.title') }]} />
        <main className="flex-1 p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </main>
      </>
    )
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: t('nav.admin'), href: "/app/admin" }, { label: t('quizManagement.title') }]} />
      <main className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{t('quizManagement.title')}</h1>
            <p className="text-muted-foreground">{t('quizManagement.createAndManageQuizzesForUsers')}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={generateQuizFromAI} variant="outline" disabled={generatingQuiz}>
              {generatingQuiz ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              {t('quizManagement.generateWithAI')}
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('quizManagement.createQuiz')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('quizManagement.createNewQuiz')}</DialogTitle>
                  <DialogDescription>
                    {t('quizManagement.createNewQuizForUsersToTestTheirKnowledge')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">{t('quizManagement.quizTitle')}</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={t('quizManagement.enterQuizTitle')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">{t('quizManagement.quizCategory')}</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        placeholder={t('quizManagement.enterCategory')}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">{t('quizManagement.description')}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={t('quizManagement.enterQuizDescription')}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">{t('quizManagement.difficulty')}</Label>
                      <Select
                        value={formData.difficulty}
                        onValueChange={(value: "easy" | "medium" | "hard") => 
                          setFormData(prev => ({ ...prev, difficulty: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">{t('quizManagement.easy')}</SelectItem>
                          <SelectItem value="medium">{t('quizManagement.medium')}</SelectItem>
                          <SelectItem value="hard">{t('quizManagement.hard')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time_limit_minutes">{t('quizManagement.timeLimitMinutes')}</Label>
                      <Input
                        id="time_limit_minutes"
                        type="number"
                        value={formData.time_limit_minutes}
                        onChange={(e) => setFormData(prev => ({ ...prev, time_limit_minutes: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passing_score">{t('quizManagement.passingScore')}</Label>
                      <Input
                        id="passing_score"
                        type="number"
                        value={formData.passing_score}
                        onChange={(e) => setFormData(prev => ({ ...prev, passing_score: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{t('quizManagement.questions')}</h3>
                      <Button onClick={addQuestion} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('quizManagement.addQuestion')}
                      </Button>
                    </div>

                    <ScrollArea className="h-64">
                      <div className="space-y-4">
                        {formData.questions.map((question, index) => (
                          <Card key={question.id}>
                            <CardContent className="pt-6">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">{t('quizManagement.question')} {index + 1}</h4>
                                  <Button
                                    onClick={() => removeQuestion(index)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>{t('quizManagement.questionType')}</Label>
                                    <Select
                                      value={question.type}
                                      onValueChange={(value: "multiple-choice" | "true-false" | "text") => 
                                        updateQuestion(index, "type", value)
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="multiple-choice">{t('quizManagement.multipleChoice')}</SelectItem>
                                        <SelectItem value="true-false">{t('quizManagement.trueFalse')}</SelectItem>
                                        <SelectItem value="text">{t('quizManagement.textAnswer')}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t('quizManagement.points')}</Label>
                                    <Input
                                      type="number"
                                      value={question.points}
                                      onChange={(e) => updateQuestion(index, "points", parseInt(e.target.value))}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>{t('quizManagement.question')}</Label>
                                  <Textarea
                                    value={question.question}
                                    onChange={(e) => updateQuestion(index, "question", e.target.value)}
                                    placeholder={t('quizManagement.enterYourQuestion')}
                                  />
                                </div>

                                {question.type === "multiple-choice" && (
                                  <div className="space-y-2">
                                    <Label>{t('quizManagement.options')}</Label>
                                    {question.options?.map((option, optIndex) => (
                                      <div key={optIndex} className="flex items-center gap-2">
                                        <Input
                                          value={option}
                                          onChange={(e) => {
                                            const newOptions = [...(question.options || [])]
                                            newOptions[optIndex] = e.target.value
                                            updateQuestion(index, "options", newOptions)
                                          }}
                                          placeholder={`${t('quizManagement.option')} ${optIndex + 1}`}
                                        />
                                        <Button
                                          onClick={() => updateQuestion(index, "correct_answer", optIndex)}
                                          variant={question.correct_answer === optIndex ? "default" : "outline"}
                                          size="sm"
                                        >
                                          {t('quizManagement.correct')}
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {question.type === "true-false" && (
                                  <div className="space-y-2">
                                    <Label>{t('quizManagement.correctAnswer')}</Label>
                                    <Select
                                      value={question.correct_answer.toString()}
                                      onValueChange={(value) => updateQuestion(index, "correct_answer", value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="true">{t('quizManagement.true')}</SelectItem>
                                        <SelectItem value="false">{t('quizManagement.false')}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {question.type === "text" && (
                                  <div className="space-y-2">
                                    <Label>{t('quizManagement.correctAnswer')}</Label>
                                    <Input
                                      value={question.correct_answer as string}
                                      onChange={(e) => updateQuestion(index, "correct_answer", e.target.value)}
                                      placeholder={t('quizManagement.enterTheCorrectAnswer')}
                                    />
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <Label>{t('quizManagement.explanationOptional')}</Label>
                                  <Textarea
                                    value={question.explanation || ""}
                                    onChange={(e) => updateQuestion(index, "explanation", e.target.value)}
                                    placeholder={t('quizManagement.explainWhyThisIsTheCorrectAnswer')}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    {t('actions.cancel')}
                  </Button>
                  <Button onClick={createQuiz}>{t('quizManagement.createQuiz')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quiz Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('quizManagement.totalQuizzes')}</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizzes.length}</div>
              <p className="text-xs text-muted-foreground">{t('quizManagement.activeQuizzes')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('quizManagement.totalQuestions')}</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {quizzes.reduce((acc, quiz) => acc + quiz.questions.length, 0)}
              </div>
              <p className="text-xs text-muted-foreground">{t('quizManagement.questionsAcrossAllQuizzes')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('quizManagement.categories')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(quizzes.map(q => q.category)).size}
              </div>
              <p className="text-xs text-muted-foreground">{t('quizManagement.quizCategories')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('quizManagement.avgDifficulty')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {quizzes.length > 0 
                  ? (quizzes.reduce((acc, q) => acc + (q.difficulty === "easy" ? 1 : q.difficulty === "medium" ? 2 : 3), 0) / quizzes.length).toFixed(1)
                  : "0.0"
                }
              </div>
              <p className="text-xs text-muted-foreground">{t('quizManagement.averageDifficultyLevel')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quiz List */}
        <div className="grid gap-4">
          {quizzes.map((quiz) => {
            const stats = quizStats[quiz.id]
            
            return (
              <Card key={quiz.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                      <CardDescription>{quiz.description}</CardDescription>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{quiz.category}</Badge>
                        <Badge className={getDifficultyColor(quiz.difficulty)}>
                          {quiz.difficulty}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {quiz.time_limit_minutes} min
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Target className="w-4 h-4" />
                          {quiz.passing_score}% {t('quizManagement.toPass')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuiz(quiz)
                          setShowStatsDialog(true)
                          fetchQuizStats(quiz.id)
                        }}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        {t('quizManagement.stats')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuiz(quiz)
                          setFormData({
                            title: quiz.title,
                            description: quiz.description,
                            category: quiz.category,
                            difficulty: quiz.difficulty,
                            time_limit_minutes: quiz.time_limit_minutes,
                            passing_score: quiz.passing_score,
                            questions: quiz.questions
                          })
                          setShowEditDialog(true)
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {t('quizManagement.edit')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteQuiz(quiz.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>{quiz.questions.length} {t('quizManagement.questionsCount')}</span>
                      <span>{t('quizManagement.created')} {new Date(quiz.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {stats && (
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-lg font-semibold">{stats.total_submissions}</div>
                          <p className="text-xs text-muted-foreground">{t('quizManagement.submissions')}</p>
                        </div>
                        <div>
                          <div className="text-lg font-semibold">{stats.pass_rate.toFixed(0)}%</div>
                          <p className="text-xs text-muted-foreground">{t('quizManagement.passRate')}</p>
                        </div>
                        <div>
                          <div className="text-lg font-semibold">{stats.avg_score.toFixed(0)}%</div>
                          <p className="text-xs text-muted-foreground">{t('quizManagement.avgScore')}</p>
                        </div>
                        <div>
                          <div className="text-lg font-semibold">{Math.round(stats.avg_time_spent / 60)}m</div>
                          <p className="text-xs text-muted-foreground">{t('quizManagement.avgTime')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Edit Quiz Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('quizManagement.editQuiz')}</DialogTitle>
              <DialogDescription>
                {t('quizManagement.updateQuiz')} details and questions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">{t('quizManagement.quizTitle')}</Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">{t('quizManagement.quizCategory')}</Label>
                  <Input
                    id="edit-category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">{t('quizManagement.description')}</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-difficulty">{t('quizManagement.difficulty')}</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: "easy" | "medium" | "hard") => 
                      setFormData(prev => ({ ...prev, difficulty: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">{t('quizManagement.easy')}</SelectItem>
                      <SelectItem value="medium">{t('quizManagement.medium')}</SelectItem>
                      <SelectItem value="hard">{t('quizManagement.hard')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-time_limit_minutes">{t('quizManagement.timeLimitMinutes')}</Label>
                  <Input
                    id="edit-time_limit_minutes"
                    type="number"
                    value={formData.time_limit_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, time_limit_minutes: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-passing_score">{t('quizManagement.passingScore')}</Label>
                  <Input
                    id="edit-passing_score"
                    type="number"
                    value={formData.passing_score}
                    onChange={(e) => setFormData(prev => ({ ...prev, passing_score: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                {t('actions.cancel')}
              </Button>
              <Button onClick={updateQuiz}>{t('quizManagement.updateQuiz')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats Dialog */}
        <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('quizManagement.quizStatistics')}</DialogTitle>
              <DialogDescription>
                {t('quizManagement.performanceAnalyticsFor')} {selectedQuiz?.title}
              </DialogDescription>
            </DialogHeader>
            {selectedQuiz && quizStats[selectedQuiz.id] && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{quizStats[selectedQuiz.id].total_submissions}</div>
                        <p className="text-sm text-muted-foreground">{t('quizManagement.totalSubmissions')}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{quizStats[selectedQuiz.id].pass_rate.toFixed(0)}%</div>
                        <p className="text-sm text-muted-foreground">{t('quizManagement.passRate')}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">{t('quizManagement.recentSubmissions')}</h3>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {quizStats[selectedQuiz.id].recent_submissions.map((submission, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            {submission.passed ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm">User {submission.user_id.slice(0, 8)}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{submission.score}%</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(submission.submitted_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* File Selection Dialog for AI Quiz Generation */}
        <Dialog open={showFileSelectDialog} onOpenChange={setShowFileSelectDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('quizManagement.generateQuizFromDocument')}</DialogTitle>
              <DialogDescription>
                {t('quizManagement.selectADocumentToGenerateAQuizFromUsingAI')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('quizManagement.selectDocument')}</Label>
                <ScrollArea className="h-64 w-full border rounded-md p-2">
                  <div className="space-y-2">
                    {availableFiles.length === 0 ? (
                      <p className="text-muted-foreground">{t('quizManagement.noDocumentsAvailable')}</p>
                    ) : (
                      availableFiles.map((file) => (
                        <div
                          key={file.document_id}
                          className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedFile === file.title
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => setSelectedFile(file.title)}
                        >
                          <div className="font-medium">{file.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(file.created_at).toLocaleDateString()} • {file.chunk_count} chunks
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFileSelectDialog(false)}>
                {t('actions.cancel')}
              </Button>
              <Button 
                onClick={generateQuizFromSelectedFile} 
                disabled={!selectedFile || generatingQuiz}
              >
                {generatingQuiz ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4 mr-2" />
                )}
                {t('quizManagement.generateQuiz')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  )
}
