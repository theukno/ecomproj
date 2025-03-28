import { NextResponse } from "next/server"
import { auth } from "@/lib/firebase"
import { getContactMessages } from "@/lib/firestore"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.split("Bearer ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify token
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check if user is admin
    const userDoc = await getDoc(doc(db, "users", userId))

    if (!userDoc.exists() || !userDoc.data().isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get contact messages
    const contacts = await getContactMessages()

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error("Get contacts error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

