import { NextResponse } from "next/server"
import { auth } from "@/lib/firebase"
import { getWishlistByUserId, addToWishlist, removeFromWishlist } from "@/lib/firestore"

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.split("Bearer ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify token
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get wishlist
    const wishlist = await getWishlistByUserId(userId)

    return NextResponse.json({ wishlist })
  } catch (error) {
    console.error("Get wishlist error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { productId } = await request.json()
    const token = request.headers.get("authorization")?.split("Bearer ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Verify token
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Add to wishlist
    await addToWishlist(userId, productId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Add to wishlist error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { productId } = await request.json()
    const token = request.headers.get("authorization")?.split("Bearer ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Verify token
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Remove from wishlist
    await removeFromWishlist(userId, productId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove from wishlist error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

