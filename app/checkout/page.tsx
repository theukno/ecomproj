"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import PayPalButton from "@/components/paypal-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [shippingInfo, setShippingInfo] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  })

  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated && !loading) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access the checkout page",
        variant: "destructive",
      })
      router.push("/signin")
      return
    }

    // Load cart from localStorage
    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        setCart(parsedCart)

        // Calculate total
        const cartTotal = parsedCart.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0)
        setTotal(cartTotal)
      } catch (error) {
        console.error("Error parsing cart:", error)
      }
    }

    // Pre-fill user info if available
    if (user) {
      setShippingInfo((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }))
    }
  }, [isAuthenticated, loading, router, toast, user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setShippingInfo((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCreateOrder = async () => {
    try {
      setLoading(true)

      // Validate shipping info
      const requiredFields = ["name", "email", "address", "city", "state", "zip", "country"]
      const missingFields = requiredFields.filter((field) => !shippingInfo[field as keyof typeof shippingInfo])

      if (missingFields.length > 0) {
        toast({
          title: "Missing Information",
          description: `Please fill in all required fields: ${missingFields.join(", ")}`,
          variant: "destructive",
        })
        return
      }

      // Create order in database
      const token = localStorage.getItem("token")
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart,
          total,
          shippingInfo,
          paymentMethod: "paypal",
          paymentStatus: "pending",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create order")
      }

      setOrderId(data.order.id)

      toast({
        title: "Order Created",
        description: "Your order has been created. Please complete payment.",
      })

      return data.order.id
    } catch (error) {
      console.error("Create order error:", error)
      toast({
        title: "Order Error",
        description: "Failed to create your order. Please try again.",
        variant: "destructive",
      })
      return null
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = (details: any) => {
    // Clear cart after successful payment
    localStorage.removeItem("cart")

    toast({
      title: "Order Complete",
      description: "Your order has been placed successfully!",
    })

    // Store order details for confirmation page
    localStorage.setItem(
      "lastOrderDetails",
      JSON.stringify({
        orderId,
        items: cart,
        total,
        shippingInfo,
      }),
    )

    // Redirect to order confirmation
    router.push(`/account/orders/${orderId}`)
  }

  const handlePaymentError = (error: any) => {
    console.error("Payment error:", error)
    toast({
      title: "Payment Failed",
      description: "There was an error processing your payment. Please try again.",
      variant: "destructive",
    })
  }

  if (cart.length === 0) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
            <CardDescription>Your cart is empty</CardDescription>
          </CardHeader>
          <CardContent>
            <p>You don't have any items in your cart.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/products")}>Continue Shopping</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Shipping Information */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping Information</CardTitle>
            <CardDescription>Enter your shipping details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" value={shippingInfo.name} onChange={handleInputChange} required />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={shippingInfo.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" value={shippingInfo.address} onChange={handleInputChange} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" value={shippingInfo.city} onChange={handleInputChange} required />
                </div>

                <div>
                  <Label htmlFor="state">State/Province</Label>
                  <Input id="state" name="state" value={shippingInfo.state} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zip">ZIP/Postal Code</Label>
                  <Input id="zip" name="zip" value={shippingInfo.zip} onChange={handleInputChange} required />
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    value={shippingInfo.country}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
            <CardDescription>Review your order</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-16 h-16 rounded overflow-hidden mr-4">
                      <img
                        src={item.image || "/placeholder.svg?height=64&width=64"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}

              <Separator className="my-4" />

              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>Free</span>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            {!orderId ? (
              <Button className="w-full" onClick={handleCreateOrder} disabled={loading}>
                {loading ? "Creating Order..." : "Create Order"}
              </Button>
            ) : (
              <div className="w-full">
                <h3 className="font-medium mb-2">Complete Payment</h3>
                <PayPalButton
                  amount={total}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  orderId={orderId}
                />
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

