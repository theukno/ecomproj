import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "firebase-admin"
import { getApp, getApps, initializeApp, cert } from "firebase-admin/app"

// Initialize Firebase Admin
const firebaseAdmin =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      })
    : getApp()

export async function middleware(request: NextRequest) {
  const token = request.headers.get("authorization")?.split("Bearer ")[1]

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const decodedToken = await auth().verifyIdToken(token)
    const response = NextResponse.next()
    response.headers.set("x-user-id", decodedToken.uid)
    return response
  } catch (error) {
    console.error("Token verification failed:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export const config = {
  matcher: ["/api/protected/:path*"],
}

