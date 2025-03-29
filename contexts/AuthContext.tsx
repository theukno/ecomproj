"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

type User = {
  id: string
  name: string
  email: string
}

type AuthContextType = {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/auth/me")
        const userData = await response.json()
        setUser(userData)
      } catch (error) {
        console.error("Error fetching user data:", error)
        setUser(null)
      }
      setIsLoading(false)
    }

    fetchUser()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (data.success) {
        setUser(data.user)
        toast({ title: "Login Successful", description: `Welcome back, ${data.user.name}!` })
        return true
      }
      throw new Error(data.message)
    } catch (error) {
      console.error("Login error:", error)
      toast({ title: "Login Failed", description: error.message, variant: "destructive" })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await response.json()
      if (data.success) {
        setUser(data.user)
        toast({ title: "Signup Successful", description: `Welcome, ${name}!` })
        return true
      }
      throw new Error(data.message)
    } catch (error) {
      console.error("Signup error:", error)
      toast({ title: "Signup Failed", description: error.message, variant: "destructive" })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setUser(null)
      localStorage.clear()
      router.push("/")
      toast({ title: "Logged Out", description: "You have been successfully logged out." })
    } catch (error) {
      console.error("Logout error:", error)
      toast({ title: "Logout Failed", description: "An error occurred while logging out.", variant: "destructive" })
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
