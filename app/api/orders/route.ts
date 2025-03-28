import { NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import { collection, addDoc, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get orders from Firestore
    const ordersRef = collection(db, "orders")
    const q = query(ordersRef, where("userId", "==", userId), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const orders = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    }))

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Get orders error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const orderData = await request.json()
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Create order in Firestore
    const ordersRef = collection(db, "orders")
    const newOrder = await addDoc(ordersRef, {
      ...orderData,
      userId,
      createdAt: Timestamp.now(),
      status: "pending",
    })

    return NextResponse.json({
      order: {
        id: newOrder.id,
        ...orderData,
        userId,
        createdAt: new Date(),
        status: "pending",
      },
    })
  } catch (error) {
    console.error("Create order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

