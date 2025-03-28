import { NextResponse } from "next/server"
import { createContactMessage } from "@/lib/firestore"

export async function POST(request: Request) {
  try {
    const contactData = await request.json()

    // Validate input
    if (!contactData.name || !contactData.email || !contactData.message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create contact message
    const contact = await createContactMessage(contactData)

    return NextResponse.json({
      success: true,
      message: "Your message has been sent successfully!",
      contact,
    })
  } catch (error) {
    console.error("Contact error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

