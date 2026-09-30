"use client"

import { useState } from "react"
import { useTranslation } from "@/src/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Clock, Target, Award, Brain, Play, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

export interface Quiz {
  id: string
  title: string
  description: string
  category: string
  difficulty: "easy" | "medium" | "hard"
  time_limit_minutes: number
  passing_score: number
  question_count?: number
  created_at?: string
  updated_at?: string
  organization_id?: string
  questions?: Question[]
}

export interface Question {
  id: string
  type: "multiple-choice" | "true-false" | "text"
  question: string
  options?: string[]
  correct_answer: string | number
  explanation?: string
  points: number
}

export interface QuizResult {
  quizId: string
  score: number
  totalPoints: number
  passed: boolean
  timeSpent: number
  answers: Record<string, string | number>
  completedAt: string
}

interface QuizCardProps {
  quiz: Quiz
  onStartQuiz?: (quiz: Quiz) => void
  onViewStats?: (quiz: Quiz) => void
  onEdit?: (quiz: Quiz) => void
  onDelete?: (quiz: Quiz) => void
  showActions?: boolean
  isAdmin?: boolean
}

export function QuizCard({ quiz, onStartQuiz, onViewStats, onEdit, onDelete, showActions = true, isAdmin = false }: QuizCardProps) {
  const { t } = useTranslation()
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800"
      case "medium": return "bg-yellow-100 text-yellow-800"
      case "hard": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{quiz.title}</CardTitle>
            <CardDescription className="mt-2">{quiz.description}</CardDescription>
          </div>
          <Badge className={getDifficultyColor(quiz.difficulty)}>
            {quiz.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              <span>{quiz.passing_score}% {t('quizzes.passingScore')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{quiz.time_limit_minutes} {t('quizTaking.minutes')}</span>
            </div>
            {quiz.question_count && (
              <div className="flex items-center gap-1">
                <Award className="h-4 w-4" />
                <span>{quiz.question_count} {t('quizzes.questions')}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline">{quiz.category}</Badge>
          </div>

          {showActions && (
            <div className="flex gap-2 pt-4">
              {!isAdmin && onStartQuiz && (
                <Button onClick={() => onStartQuiz(quiz)} className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  {t('quizzes.startQuiz')}
                </Button>
              )}
              
              {isAdmin && (
                <>
                  {onEdit && (
                    <Button variant="outline" onClick={() => onEdit(quiz)}>
                      {t('actions.edit')}
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="destructive" onClick={() => onDelete(quiz)}>
                      {t('actions.delete')}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface QuizQuestionProps {
  question: Question
  answer?: string | number
  onAnswerChange?: (questionId: string, answer: string | number) => void
  showResult?: boolean
  disabled?: boolean
}

export function QuizQuestion({ question, answer, onAnswerChange, showResult = false, disabled = false }: QuizQuestionProps) {
  const { t } = useTranslation()
  const isCorrect = showResult && answer === question.correct_answer

  const renderQuestion = () => {
    switch (question.type) {
      case "multiple-choice":
        return (
          <RadioGroup
            value={answer?.toString()}
            onValueChange={(value) => onAnswerChange?.(question.id, value)}
            disabled={disabled}
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
            value={answer?.toString()}
            onValueChange={(value) => onAnswerChange?.(question.id, value)}
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true" className="cursor-pointer">{t('quizzes.trueFalse')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false" className="cursor-pointer">{t('quizzes.false')}</Label>
            </div>
          </RadioGroup>
        )
      
      case "text":
        return (
          <div className="space-y-2">
            <Label>{t('quizzes.yourAnswer')}:</Label>
            <textarea
              className="w-full p-3 border rounded-md"
              rows={3}
              value={answer?.toString() || ""}
              onChange={(e) => onAnswerChange?.(question.id, e.target.value)}
              disabled={disabled}
              placeholder={t('quizzes.questionText')}
            />
          </div>
        )
      
      default:
        return <div>{t('status.error')}</div>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-4">{question.question}</h3>
          {renderQuestion()}
        </div>
        <div className="text-sm text-muted-foreground">
          {question.points} {t('quizzes.points')}{question.points !== 1 ? 's' : ''}
        </div>
      </div>
      
      {showResult && (
        <div className={`p-4 rounded-md ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
          <div className="flex items-center gap-2 mb-2">
            {isCorrect ? (
              <span className="text-green-700 font-medium">✓ {t('quizzes.passed')}</span>
            ) : (
              <span className="text-red-700 font-medium">✗ {t('quizzes.notPassed')}</span>
            )}
          </div>
          {question.explanation && (
            <p className="text-sm text-muted-foreground">{question.explanation}</p>
          )}
        </div>
      )}
    </div>
  )
}

interface QuizProgressProps {
  current: number
  total: number
  timeRemaining?: number
  timeLimit?: number
}

export function QuizProgress({ current, total, timeRemaining, timeLimit }: QuizProgressProps) {
  const { t } = useTranslation()
  const progress = ((current + 1) / total) * 100
  const timeProgress = timeLimit && timeRemaining !== undefined 
    ? ((timeLimit - timeRemaining) / timeLimit) * 100 
    : 0

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>{t('quizTaking.questionOf', { current: current + 1, total })}</span>
        {timeRemaining !== undefined && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span className={timeRemaining < 60 ? 'text-red-500' : ''}>
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>
      
      <Progress value={progress} className="w-full" />
      
      {timeLimit && timeRemaining !== undefined && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('quizTaking.progress')}</span>
            <span>{Math.floor((timeLimit - timeRemaining) / 60)}:{((timeLimit - timeRemaining) % 60).toString().padStart(2, '0')} / {Math.floor(timeLimit / 60)}:{(timeLimit % 60).toString().padStart(2, '0')}</span>
          </div>
          <Progress value={timeProgress} className="w-full" />
        </div>
      )}
    </div>
  )
}

interface QuizResultsProps {
  result: QuizResult
  quiz: Quiz
  onRetake?: () => void
  onBack?: () => void
}

export function QuizResults({ result, quiz, onRetake, onBack }: QuizResultsProps) {
  const { t } = useTranslation()
  const percentage = Math.round((result.score / result.totalPoints) * 100)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('quizzes.quizCompleted')}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-6xl font-bold">
            {result.score}/{result.totalPoints}
          </div>
          
          <div className={`text-lg font-medium ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
            {result.passed ? `✓ ${t('quizzes.passed')}` : `✗ ${t('quizzes.notPassed')}`}
          </div>
          
          <div className="text-lg">
            {t('quizzes.scoreOutOf', { score: result.score, totalPoints: result.totalPoints, percentage })}
          </div>
          
          <div className="text-sm text-muted-foreground">
            {t('quizzes.passingScore')}: {quiz.passing_score}% to pass
          </div>
          
          <div className="text-sm text-muted-foreground">
            {t('quizzes.timeSpent')}: {Math.floor(result.timeSpent / 60)}:{(result.timeSpent % 60).toString().padStart(2, '0')}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-center">
        {onRetake && (
          <Button onClick={onRetake} variant="outline">
            {t('quizzes.retakeQuiz')}
          </Button>
        )}
        {onBack && (
          <Button onClick={onBack}>
            {t('quizzes.backToQuizzes')}
          </Button>
        )}
      </div>
    </div>
  )
}
