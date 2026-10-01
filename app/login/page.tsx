import type { Metadata } from "next"
import "../landing/landing.css"
import ru from "@/src/i18n/locales/ru.json"
import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: ru.landing.auth.login.metaTitle,
}

export default function LoginPage() {
  return <LoginForm />
}
