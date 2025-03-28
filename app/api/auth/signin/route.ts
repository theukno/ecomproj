import { NextResponse } from "next/server"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const firebaseUser = userCredential.user

    // Get additional user data from Firestore
    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))

    // Get user token
    const token = await firebaseUser.getIdToken()

    // Create response with user data and token
    const response = NextResponse.json({
      success: true,
      message: "You have successfully signed in!",
      user: {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || userDoc.data()?.name || "User",
      },
      token,
    })

    return response
  } catch (error) {
    console.error("Signin error:", error)

    // Handle specific Firebase auth errors
    if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (error.code === "auth/too-many-requests") {
      return NextResponse.json({ error: "Too many failed login attempts. Please try again later." }, { status: 429 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

