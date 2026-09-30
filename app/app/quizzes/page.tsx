"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { getApiUrl } from "@/lib/config"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { QuizCard, QuizQuestion, QuizProgress, QuizResults, Quiz, Question, QuizResult } from "@/components/quiz-components"
import {
  Brain,
  Clock,
  CheckCircle,
  XCircle,
  Award,
  BookOpen,
  Target,
  TrendingUp,
  Play,
  RotateCcw,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/src/i18n"

export default function QuizzesPage() {
  const { token, user } = useAuth()
  const { t } = useTranslation()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [quizResults, setQuizResults] = useState<QuizResult | null>(null)
  const [userQuizHistory, setUserQuizHistory] = useState<QuizResult[]>([])
  const [bestScores, setBestScores] = useState<Record<string, QuizResult>>({})
  const [loading, setLoading] = useState(true)

  const fetchQuizzes = async () => {
    try {
      setLoading(true)
      console.log("Fetching quizzes...")
      console.log("Token:", token ? "present" : "missing")
      
      const url = getApiUrl('/v1/quizzes')
      console.log("Fetching from URL:", url)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        }
      })

      console.log("Response status:", response.status)
      console.log("Response ok:", response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log("Response data:", data)

        // GET /v1/quizzes (learning-service) returns {items, next_cursor},
        // not a {status, response} envelope - a 2xx response here always
        // means success, including a legitimately empty items: [].
        console.log("Setting quizzes:", data.items)
        setQuizzes(data.items ?? [])
      } else {
        const errorText = await response.text()
        console.error("HTTP error:", response.status, errorText)
        toast.error(`${t('quizzes.failedToFetchQuizzes')}: ${response.status}`)
      }
    } catch (error) {
      console.error("Fetch error:", error)
      toast.error(t('quizzes.failedToFetchQuizzes'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch-on-mount pattern; fetchQuizzes sets quizzes/loading state from
    // the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQuizzes()
  }, [])

  const submitQuizResults = async () => {
    if (!selectedQuiz || !token) return

    try {
      const response = await fetch(getApiUrl(`/v1/quizzes/${selectedQuiz.id}/submit`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: answers,
          time_spent: selectedQuiz.time_limit_minutes * 60 - timeRemaining
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Update local history
          const newResult: QuizResult = {
            quizId: selectedQuiz.id,
            score: result.response.score,
            totalPoints: result.response.total_points,
            passed: result.response.passed,
            timeSpent: result.response.time_spent,
            answers: answers,
            completedAt: new Date().toISOString()
          }
          
          setUserQuizHistory(prev => [...prev, newResult])
          setQuizResults(newResult)
          setQuizCompleted(true)
          
          if (result.response.passed) {
            toast.success(`${t('quizzes.congratulationsYouPassedWith')} ${result.response.score}/${result.response.totalPoints} ${t('quizzes.pointsExclamation')}`)
          } else {
            toast.error(`${t('quizzes.quizCompletedYouScored')} ${result.response.score}/${result.response.totalPoints} ${t('quizzes.pointsTryAgain')}`)
          }
        }
      }
    } catch (error) {
      toast.error(t('quizzes.failedToSubmitQuiz'))
    }
  }


  const startQuiz = (quiz: Quiz) => {
    if (!quiz.questions) {
      toast.error(t('quizzes.quizHasNoQuestions'))
      return
    }
    
    setSelectedQuiz(quiz)
    setQuizStarted(true)
    setCurrentQuestionIndex(0)
    setAnswers({})
    setTimeRemaining(quiz.time_limit_minutes * 60)
    setQuizCompleted(false)
    setQuizResults(null)
  }

  const handleAnswerChange = (questionId: string, answer: string | number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const nextQuestion = () => {
    if (selectedQuiz && selectedQuiz.questions && currentQuestionIndex < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const calculateScore = () => {
    if (!selectedQuiz || !selectedQuiz.questions) return { score: 0, totalPoints: 0, passed: false }
    
    let score = 0
    let totalPoints = 0
    
    selectedQuiz.questions.forEach(question => {
      totalPoints += question.points
      if (answers[question.id] === question.correct_answer) {
        score += question.points
      }
    })
    
    const passed = (score / totalPoints) * 100 >= selectedQuiz.passing_score
    
    return { score, totalPoints, passed }
  }

  const handleQuizSubmit = () => {
    if (!selectedQuiz || !selectedQuiz.questions) return
    
    const { score, totalPoints, passed } = calculateScore()
    const timeSpent = selectedQuiz.time_limit_minutes * 60 - timeRemaining
    
    const result: QuizResult = {
      quizId: selectedQuiz.id,
      score,
      totalPoints,
      passed,
      timeSpent,
      answers,
      completedAt: new Date().toISOString()
    }
    
    setQuizResults(result)
    setQuizCompleted(true)
    setUserQuizHistory(prev => [...prev, result])
    
    // Update best scores
    setBestScores(prev => {
      const currentBest = prev[selectedQuiz.id]
      if (!currentBest || score > currentBest.score) {
        return {
          ...prev,
          [selectedQuiz.id]: result
        }
      }
      return prev
    })
    
    if (passed) {
      toast.success(`${t('quizzes.congratulationsYouPassedWith')} ${score}/${totalPoints} ${t('quizzes.pointsExclamation')}`)
    } else {
      toast.error(`${t('quizzes.quizCompletedYouScored')} ${score}/${totalPoints} ${t('quizzes.pointsTryAgain')}`)
    }
  }

  // Timer effect
  useEffect(() => {
    if (quizStarted && !quizCompleted && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeRemaining === 0 && quizStarted && !quizCompleted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleQuizSubmit()
    }
    // handleQuizSubmit intentionally omitted: it's a plain (non-memoized)
    // function that gets a new identity every render, and this effect must
    // only re-run when the actual timer state changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizStarted, quizCompleted, timeRemaining])

  const resetQuiz = () => {
    setSelectedQuiz(null)
    setQuizStarted(false)
    setQuizCompleted(false)
    setCurrentQuestionIndex(0)
    setAnswers({})
    setTimeRemaining(0)
    setQuizResults(null)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800"
      case "medium": return "bg-yellow-100 text-yellow-800"
      case "hard": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case "multiple-choice":
        return (
          <RadioGroup
            value={answers[question.id]?.toString()}
            onValueChange={(value) => handleAnswerChange(question.id, parseInt(value))}
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )
      
      case "true-false":
        return (
          <RadioGroup
            value={answers[question.id]?.toString()}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true" className="cursor-pointer">{t('quizzes.true')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false" className="cursor-pointer">{t('quizzes.false')}</Label>
            </div>
          </RadioGroup>
        )
      
      case "text":
        return (
          <Textarea
            value={answers[question.id] as string || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={t('quizzes.typeYourAnswerHere')}
            className="min-h-[100px]"
          />
        )
      
      default:
        return null
    }
  }

  if (!selectedQuiz) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: t('navigation.quizzes') }]} />
        <main className="flex-1 p-6 space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{t('quizzes.title')}</h1>
            <p className="text-muted-foreground">{t('quizzes.testYourKnowledgeAndTrackYourProgress')}</p>
          </div>

          {/* Quiz Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('quizzes.totalQuizzes')}</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quizzes.length}</div>
                <p className="text-xs text-muted-foreground">{t('quizzes.availableQuizzes')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('quizzes.quizzesFinished')}</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userQuizHistory.length}</div>
                <p className="text-xs text-muted-foreground">{t('quizzes.quizzesFinished')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('quizzes.passRate')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userQuizHistory.length > 0 
                    ? Math.round((userQuizHistory.filter(r => r.passed).length / userQuizHistory.length) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">{t('quizzes.quizzesPassed')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t('quizzes.avgScore')}</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userQuizHistory.length > 0
                    ? Math.round(userQuizHistory.reduce((acc, r) => acc + (r.score / r.totalPoints) * 100, 0) / userQuizHistory.length)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">{t('quizzes.averagePerformance')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Quiz List */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => {
              const attempts = userQuizHistory.filter(r => r.quizId === quiz.id)
              const bestScoreResult = bestScores[quiz.id]
              const bestScore = bestScoreResult 
                ? (bestScoreResult.score / bestScoreResult.totalPoints) * 100
                : null
              const passed = attempts.some(r => r.passed)

              return (
                <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        <CardDescription>{quiz.description}</CardDescription>
                      </div>
                      <Badge className={getDifficultyColor(quiz.difficulty)}>
                        {quiz.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {quiz.time_limit_minutes} {t('quizzes.min')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {quiz.passing_score}% {t('quizzes.toPass')}
                      </div>
                    </div>

                    {attempts.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{t('quizzes.bestScore')}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{bestScore?.toFixed(0)}%</span>
                            {bestScoreResult?.passed && <CheckCircle className="w-4 h-4 text-green-600" />}
                          </div>
                        </div>
                        <Progress value={bestScore || 0} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {attempts.length} {attempts.length !== 1 ? t('quizzes.attemptsPlural') : t('quizzes.attempts')}
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <Button 
                        onClick={() => startQuiz(quiz)} 
                        className="w-full"
                        size="sm"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {attempts.length > 0 ? t('quizzes.retakeQuiz') : t('quizzes.startQuiz')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </main>
      </>
    )
  }

  if (quizCompleted && quizResults) {
    const percentage = (quizResults.score / quizResults.totalPoints) * 100

    return (
      <>
        <AppHeader breadcrumbs={[{ label: t('navigation.quizzes') }]} />
        <main className="flex-1 h-screen overflow-hidden">
          <div className="h-full flex">
            {/* Left Section - Header */}
            <div className="flex-shrink-0 w-1/3 p-6 border-r bg-background">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight">{t('quizzes.quizCompleted')}</h1>
                  <p className="text-muted-foreground">{t('quizzes.hereAreYourResultsFor')} {selectedQuiz.title}</p>
                </div>
                
                {/* Stats Square - Top Right */}
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <div className="space-y-3">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                      quizResults.passed ? "bg-green-100" : "bg-red-100"
                    }`}>
                      {quizResults.passed ? (
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      ) : (
                        <XCircle className="w-8 h-8 text-red-600" />
                      )}
                    </div>
                    <div className="text-center">
                      <div className={`text-xl font-bold ${quizResults.passed ? "text-green-600" : "text-red-600"}`}>
                        {quizResults.passed ? t('quizzes.passed') : t('quizzes.notPassed')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {quizResults.score}/{quizResults.totalPoints} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-center pt-2">
                      <div>
                        <div className="text-lg font-bold">{formatTime(quizResults.timeSpent)}</div>
                        <div className="text-xs text-muted-foreground">{t('quizzes.time')}</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{selectedQuiz.questions?.length || 0}</div>
                        <div className="text-xs text-muted-foreground">{t('quizzes.questions')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Questions and Actions */}
            <div className="flex-1 flex flex-col h-full">
              {/* Questions Rectangular Field - Right */}
              <div className="flex-1 p-6 overflow-hidden">
                <div className="h-full bg-muted/30 rounded-lg border overflow-hidden">
                  <div className="h-full flex flex-col">
                    <div className="flex-shrink-0 p-4 border-b bg-background/80">
                      <h2 className="text-lg font-semibold">{t('quizzes.questionReview')}</h2>
                      <p className="text-sm text-muted-foreground">{t('quizzes.reviewAnswers')}</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {selectedQuiz.questions?.map((question, index) => {
                        const userAnswer = answers[question.id]
                        const isCorrect = userAnswer === question.correct_answer

                        return (
                          <div key={question.id} className="bg-background rounded-lg border p-3">
                            <div className="flex items-start gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                                isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {index + 1}
                              </div>
                              <div className="flex-1 space-y-2">
                                <div>
                                  <p className="font-medium text-sm">{question.question}</p>
                                </div>
                                <div className="flex gap-3 text-xs">
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">{t('quizzes.you')}</span>
                                    <span className={`font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                      {userAnswer}
                                    </span>
                                  </div>
                                  {!isCorrect && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-muted-foreground">{t('quizzes.correct')}</span>
                                      <span className="font-medium text-green-600">{question.correct_answer}</span>
                                    </div>
                                  )}
                                </div>
                                {question.explanation && (
                                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                    <p className="text-xs text-blue-800">
                                      <strong>{t('quizzes.explanation')}</strong> {question.explanation}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Bar - Right Bottom */}
              <div className="flex-shrink-0 p-4 border-t bg-background">
                <div className="flex gap-3">
                  <Button onClick={resetQuiz} variant="outline" className="flex-1">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t('quizzes.backToQuizzes')}
                  </Button>
                  <Button onClick={() => startQuiz(selectedQuiz!)} className="flex-1">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t('quizzes.retakeQuiz')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  const currentQuestion: Question | undefined = selectedQuiz.questions?.[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / (selectedQuiz.questions?.length || 1)) * 100

  return (
    <>
      <AppHeader />
      <main className="flex-1 p-6 space-y-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Quiz Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{selectedQuiz.title}</h1>
                <p className="text-muted-foreground">
                  {t('quizzes.question')} {currentQuestionIndex + 1} {t('quizzes.of')} {selectedQuiz.questions?.length || 0}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span className={timeRemaining < 60 ? "text-red-600 font-semibold" : ""}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
            
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{currentQuestion?.question || t('quizzes.loadingQuestion')}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{currentQuestion?.type || "unknown"}</Badge>
                    <span className="text-sm text-muted-foreground">{currentQuestion?.points || 0} {t('quizzes.points')}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentQuestion ? renderQuestion(currentQuestion) : (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={previousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              {t('quizzes.previous')}
            </Button>

            <div className="flex items-center gap-2">
              {(selectedQuiz.questions || []).map((_, index) => (
                <div
                  key={index}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    index === currentQuestionIndex
                      ? "bg-primary text-primary-foreground"
                      : answers[_.id]
                      ? "bg-green-100 text-green-800"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
              ))}
            </div>

            {currentQuestionIndex === (selectedQuiz.questions?.length || 0) - 1 ? (
              <Button onClick={handleQuizSubmit}>
                {t('quizzes.submitQuiz')}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={nextQuestion}>
                {t('quizzes.next')}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
