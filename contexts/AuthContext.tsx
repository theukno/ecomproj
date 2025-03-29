"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"

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

  // Check if user is logged in on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true)

      if (firebaseUser) {
        // Get additional user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))

          const userData = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || userDoc.data()?.name || "User",
            email: firebaseUser.email || "",
          }

          setUser(userData)
        } catch (error) {
          console.error("Error fetching user data:", error)
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || "User",
            email: firebaseUser.email || "",
          })
        }
      } else {
        setUser(null)
      }

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // Get additional user data from Firestore
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))

      if (!userDoc.exists()) {
        // Create user document if it doesn't exist
        await setDoc(doc(db, "users", firebaseUser.uid), {
          name: firebaseUser.displayName || "User",
          email: firebaseUser.email,
          createdAt: new Date(),
        })
      }

      toast({
        title: "Login Successful",
        description: `Welcome back, ${firebaseUser.displayName || "User"}!`,
      })

      return true
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // Update profile with name
      await updateProfile(firebaseUser, { displayName: name })

      // Create user document in Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), {
        name,
        email,
        createdAt: new Date(),
      })

      // Create empty wishlist for the user
      await setDoc(doc(db, "wishlists", firebaseUser.uid), {
        userId: firebaseUser.uid,
        products: [],
        createdAt: new Date(),
      })

      toast({
        title: "Signup Successful",
        description: `Welcome, ${name}!`,
      })

      return true
    } catch (error) {
      console.error("Signup error:", error)
      toast({
        title: "Signup Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)

      // Clear any user-specific data from localStorage
      localStorage.removeItem("cart")
      localStorage.removeItem("lastOrderDetails")
      localStorage.removeItem("userOrders")

      router.push("/")

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      })
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        title: "Logout Failed",
        description: "An error occurred while logging out.",
        variant: "destructive",
      })
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

