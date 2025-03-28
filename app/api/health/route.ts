import { NextResponse } from "next/server"
import prisma, { checkDatabaseConnection } from "@/lib/prisma"

export async function GET() {
  try {
    // Check database connection
    const dbStatus = await checkDatabaseConnection()

    if (!dbStatus.connected) {
      return NextResponse.json(
        {
          status: "error",
          message: "Database connection failed",
          error: dbStatus.error,
        },
        { status: 500 },
      )
    }

    // Check if tables exist
    const tablesStatus = {}

    try {
      const userCount = await prisma.user.count()
      tablesStatus.user = { exists: true, count: userCount }
    } catch (error) {
      tablesStatus.user = { exists: false, error: error.message }
    }

    try {
      const productCount = await prisma.product.count()
      tablesStatus.product = { exists: true, count: productCount }
    } catch (error) {
      tablesStatus.product = { exists: false, error: error.message }
    }

    // Return health status
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: {
        connected: dbStatus.connected,
        tables: tablesStatus,
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? "Set" : "Not set",
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Health check failed",
        error: error.message,
      },
      { status: 500 },
    )
  }
}

