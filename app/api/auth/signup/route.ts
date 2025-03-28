import { NextResponse } from "next/server"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // Create user with Firebase
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

    // Get user token
    const token = await firebaseUser.getIdToken()

    // Create response with user data and token
    const response = NextResponse.json({
      success: true,
      message: "Your account has been created successfully!",
      user: {
        id: firebaseUser.uid,
        name,
        email,
      },
      token,
    })

    return response
  } catch (error) {
    console.error("Signup error:", error)

    // Handle specific Firebase auth errors
    if (error.code === "auth/email-already-in-use") {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }

    if (error.code === "auth/weak-password") {
      return NextResponse.json({ error: "Password is too weak" }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 },
    )
  }
}

