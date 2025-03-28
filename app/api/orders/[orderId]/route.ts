import { NextResponse } from "next/server"
import { auth } from "@/lib/firebase"
import { getOrderById } from "@/lib/firestore"

export async function GET(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params
    const token = request.headers.get("authorization")?.split("Bearer ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify token
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get order
    const order = await getOrderById(orderId)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Check if order belongs to user
    if (order.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error("Get order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

