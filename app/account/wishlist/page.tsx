"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, arrayRemove, collection, getDocs } from "firebase/firestore"

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/signin")
      return
    }

    const fetchWishlist = async () => {
      if (!user) return

      try {
        setIsLoading(true)

        // Get wishlist document
        const wishlistRef = doc(db, "wishlists", user.id)
        const wishlistDoc = await getDoc(wishlistRef)

        if (!wishlistDoc.exists()) {
          setWishlistItems([])
          setIsLoading(false)
          return
        }

        const wishlistData = wishlistDoc.data()
        const productIds = wishlistData.products || []

        if (productIds.length === 0) {
          setWishlistItems([])
          setIsLoading(false)
          return
        }

        // Get product details for each product in wishlist
        const productsRef = collection(db, "products")
        const productsSnapshot = await getDocs(productsRef)
        const allProducts = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Filter products that are in the wishlist
        const wishlistProducts = allProducts.filter((product) => productIds.includes(product.id))

        setWishlistItems(wishlistProducts)
      } catch (error) {
        console.error("Error fetching wishlist:", error)
        toast({
          title: "Error",
          description: "Failed to load wishlist. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchWishlist()
  }, [user, isAuthenticated, router, toast])

  const removeFromWishlist = async (productId: string) => {
    if (!user) return

    try {
      // Update wishlist in Firestore
      const wishlistRef = doc(db, "wishlists", user.id)
      await updateDoc(wishlistRef, {
        products: arrayRemove(productId),
        updatedAt: new Date(),
      })

      // Update local state
      setWishlistItems((prev) => prev.filter((item) => item.id !== productId))

      toast({
        title: "Removed from Wishlist",
        description: "Product has been removed from your wishlist",
      })
    } catch (error) {
      console.error("Error removing from wishlist:", error)
      toast({
        title: "Error",
        description: "Failed to remove product from wishlist. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">My Wishlist</h1>
        <p>Loading wishlist...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">My Wishlist</h1>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500 mb-4">Your wishlist is empty</p>
          <Button asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative h-48 w-full">
                  <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
                  <p className="text-gray-500 mb-2">${item.price.toFixed(2)}</p>
                  <div className="flex justify-between items-center mt-4">
                    <Button asChild variant="outline">
                      <Link href={`/products/${item.id}`}>View Product</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromWishlist(item.id)}
                      aria-label="Remove from wishlist"
                    >
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

