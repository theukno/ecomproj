import { NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import { collection, addDoc, doc, updateDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

// PayPal API endpoints
const PAYPAL_API_BASE =
  process.env.NODE_ENV === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"

// Get PayPal access token
async function getPayPalAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured")
  }

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  })

  const data = await response.json()
  return data.access_token
}

// Create PayPal order
async function createPayPalOrder(amount: number, currency = "USD") {
  const accessToken = await getPayPalAccessToken()

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
        },
      ],
    }),
  })

  return await response.json()
}

// Capture PayPal payment
async function capturePayPalPayment(orderId: string) {
  const accessToken = await getPayPalAccessToken()

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return await response.json()
}

export async function POST(request: Request) {
  try {
    const { action, orderId, amount } = await request.json()
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    // Verify token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Handle different PayPal actions
    if (action === "create_order") {
      const paypalOrder = await createPayPalOrder(amount)

      // Store PayPal order reference in Firestore
      const paymentRef = collection(db, "payments")
      await addDoc(paymentRef, {
        userId,
        paypalOrderId: paypalOrder.id,
        amount,
        status: "created",
        createdAt: Timestamp.now(),
      })

      return NextResponse.json({ orderId: paypalOrder.id })
    } else if (action === "capture_order") {
      const captureData = await capturePayPalPayment(orderId)

      if (captureData.status === "COMPLETED") {
        // Update order status in Firestore
        if (request.headers.get("x-order-id")) {
          const firestoreOrderId = request.headers.get("x-order-id")
          const orderRef = doc(db, "orders", firestoreOrderId)
          await updateDoc(orderRef, {
            paymentStatus: "paid",
            paypalOrderId: orderId,
            updatedAt: Timestamp.now(),
          })
        }

        // Record payment in Firestore
        const paymentRef = collection(db, "payments")
        await addDoc(paymentRef, {
          userId,
          paypalOrderId: orderId,
          captureId: captureData.purchase_units[0].payments.captures[0].id,
          amount: captureData.purchase_units[0].payments.captures[0].amount.value,
          status: "completed",
          completedAt: Timestamp.now(),
        })
      }

      return NextResponse.json(captureData)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("PayPal payment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

