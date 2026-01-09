'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/contexts/user-context"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Container } from "@/components/ui/container"
import { Separator } from "@/components/ui/separator"
import Loading from "@/app/dashboard/loading"
import { 
  DefaultFormTextField, 
  DefaultFormTextArea,
  DefaultFormSelect,
  DefaultFormCheckbox 
} from "@/components/ui/default-form-field"
import ImageUploader, { UploaderFile } from "@/components/image-uploader"
import { createProduct } from "@/lib/actions/product"
import { getCategoryList } from "@/lib/actions/category"
import { 
  Plus, 
  Minus, 
  Package, 
  Tag, 
  Image as ImageIcon,
  DollarSign,
  Truck,
  Layers,
  Hash,
  AlertCircle,
  Save,
  X
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Product form schema
export const ProductFormSchema = z.object({
  product_name: z.string()
    .min(2, "Product name must be at least 2 characters")
    .max(200, "Product name must be less than 200 characters"),
    
  product_slug: z.string()
    .min(2, "Slug must be at least 2 characters")
    .max(200, "Slug must be less than 200 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only"),
    
  category_id: z.string()
    .min(1, "Please select a category"),
    
  product_description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be less than 2000 characters")
    .optional()
    .or(z.literal('')),
    
  product_details: z.string()
    .max(1000, "Details must be less than 1000 characters")
    .optional()
    .or(z.literal('')),
    
  base_price: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price")
    .transform(val => parseFloat(val)),
    
  sale_price: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price")
    .optional()
    .or(z.literal(''))
    .transform(val => val ? parseFloat(val) : undefined),
    
  sku: z.string()
    .min(1, "SKU is required")
    .max(50, "SKU must be less than 50 characters"),
    
  stock_quantity: z.string()
    .regex(/^\d+$/, "Enter a valid quantity")
    .transform(val => parseInt(val, 10)),
    
  weight: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid weight")
    .optional()
    .or(z.literal(''))
    .transform(val => val ? parseFloat(val) : undefined),
    
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  allow_backorders: z.boolean().default(false),
  
  meta_title: z.string()
    .max(60, "Meta title must be less than 60 characters")
    .optional()
    .or(z.literal('')),
    
  meta_description: z.string()
    .max(160, "Meta description must be less than 160 characters")
    .optional()
    .or(z.literal('')),
})

export type ProductFormValues = z.infer<typeof ProductFormSchema>

interface Category {
  category_id: number
  category_name: string
  category_slug: string
}

interface SizeOption {
  id: string
  name: string
  additional_price: number
}

export default function AddProduct() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeTab, setActiveTab] = useState("basic")
  const [productImages, setProductImages] = useState<UploaderFile[]>([])
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>([
    { id: "1", name: "Standard", additional_price: 0 }
  ])
  const [newSize, setNewSize] = useState({ name: "", additional_price: 0 })

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: {
      product_name: "",
      product_slug: "",
      category_id: "",
      product_description: "",
      product_details: "",
      sku: "",
      is_active: true,
      is_featured: false,
      allow_backorders: false,
      meta_title: "",
      meta_description: "",
    },
  })

  // Watch slug generation from product name
  const productName = form.watch("product_name")
  useEffect(() => {
    if (productName && !form.getValues("product_slug")) {
      const slug = productName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      form.setValue("product_slug", slug)
    }
  }, [productName, form])

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true)
      try {
        const result = await getCategoryList({status: 1, modifier: '='})
        if (result.success && result.result) {
          setCategories(result.result)
        } else {
          toast({
            title: "Warning",
            description: "Could not load categories",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
        toast({
          title: "Error",
          description: "Failed to load categories",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [toast])

  // Handle size options
  const addSizeOption = () => {
    if (newSize.name.trim() === "") {
      toast({
        title: "Error",
        description: "Please enter a size name",
        variant: "destructive",
      })
      return
    }

    if (sizeOptions.some(size => size.name.toLowerCase() === newSize.name.toLowerCase())) {
      toast({
        title: "Error",
        description: "Size option already exists",
        variant: "destructive",
      })
      return
    }

    setSizeOptions([
      ...sizeOptions,
      {
        id: Date.now().toString(),
        name: newSize.name,
        additional_price: newSize.additional_price
      }
    ])
    setNewSize({ name: "", additional_price: 0 })
    
    toast({
      title: "Size added",
      description: `Added ${newSize.name} size option`,
    })
  }

  const removeSizeOption = (id: string) => {
    setSizeOptions(sizeOptions.filter(size => size.id !== id))
  }

  // Handle image upload from ImageUploader component
  const handleImageUpload = (file: File | null, url?: string) => {
    if (file && url) {
      // Add new image to the list
      setProductImages(prev => [
        ...prev,
        { file, previewUrl: url, id: Date.now().toString() }
      ])
    }
  }

  const handleMultipleImageUpload = (file: File | null, url?: string) => {
    if (file && url) {
      setProductImages(prev => [
        ...prev,
        { file, previewUrl: url, id: Date.now().toString() }
      ])
    }
  }

  const removeImage = (id?: string) => {
    const imageToRemove = productImages.find(img => img.id === id)
    if (imageToRemove?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imageToRemove.previewUrl)
    }
    setProductImages(productImages.filter(img => img.id !== id))
  }

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...productImages]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex >= 0 && newIndex < newImages.length) {
      const temp = newImages[index]
      newImages[index] = newImages[newIndex]
      newImages[newIndex] = temp
      setProductImages(newImages)
    }
  }

  // Main form submission
  async function onSubmit(data: ProductFormValues) {
    setIsSubmitting(true)
    
    try {
      // Prepare product data
      const productData = {
        ...data,
        user_id: user.user_id,
        company_id: user.company_id,
        size_options: sizeOptions,
      }

      // Create product
      const result = await createProduct(productData)
      
      if (!result.success) {
        toast({
          title: "Error",
          description: result.message || "Failed to create product",
          variant: "destructive",
        })
        return
      }

      const productId = result.result?.product_id

      // Upload images if any
      if (productImages.length > 0 && productId) {
        const uploadPromises = productImages.map(async (image, index) => {
          try {
            const formData = new FormData()
            formData.append("product_id", String(productId))
            formData.append("user_id", String(user.user_id))
            formData.append("company_id", String(user.company_id))
            formData.append("image", image.file)
            formData.append("sort_order", String(index))

            const response = await fetch("/api/uploads/save-file/product", {
              method: "POST",
              body: formData,
            })

            if (!response.ok) {
              throw new Error(`Failed to upload image ${index + 1}`)
            }

            return await response.json()
          } catch (error) {
            console.error(`Error uploading image ${index + 1}:`, error)
            return null
          }
        })

        // Wait for all image uploads to complete
        await Promise.all(uploadPromises)
      }

      // Success
      toast({
        title: "Success!",
        description: "Product created successfully",
      })

      // Redirect to products list
      router.push("/dashboard/products")
      router.refresh()

    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    // Clean up blob URLs before leaving
    productImages.forEach(image => {
      if (image.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(image.previewUrl)
      }
    })
    router.back()
  }

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              Add New Product
            </CardTitle>
            <CardDescription>
              Add a new product to your inventory
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            Draft
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 mb-8">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing & Stock
                </TabsTrigger>
                <TabsTrigger value="images" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Images
                </TabsTrigger>
                <TabsTrigger value="seo" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  SEO & Options
                </TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DefaultFormTextField
                    form={form}
                    name="product_name"
                    label="Product Name"
                    placeholder="Enter product name"
                    disabled={isSubmitting}
                  />

                  <DefaultFormTextField
                    form={form}
                    name="product_slug"
                    label="Product Slug"
                    placeholder="URL-friendly version of the name"
                    disabled={isSubmitting}
                  />
                </div>

                <DefaultFormSelect
                  form={form}
                  name="category_id"
                  label="Category"
                  placeholder="Select a category"
                  options={categories.map(cat => ({
                    value: cat.category_id.toString(),
                    label: cat.category_name
                  }))}
                  disabled={isSubmitting}
                />

                <div className="space-y-6">
                  <DefaultFormTextArea
                    form={form}
                    name="product_description"
                    label="Product Description"
                    placeholder="Describe your product..."
                    disabled={isSubmitting}
                    className="min-h-[150px]"
                  />

                  <DefaultFormTextArea
                    form={form}
                    name="product_details"
                    label="Product Details / Features"
                    placeholder="Bullet points or specifications (one per line)"
                    disabled={isSubmitting}
                    className="min-h-[120px]"
                  />
                </div>
              </TabsContent>

              {/* Pricing & Stock Tab */}
              <TabsContent value="pricing" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DefaultFormTextField
                    form={form}
                    name="base_price"
                    label="Base Price ($)"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    disabled={isSubmitting}
                  />

                  <DefaultFormTextField
                    form={form}
                    name="sale_price"
                    label="Sale Price ($)"
                    placeholder="0.00 (leave empty for no sale)"
                    type="number"
                    step="0.01"
                    disabled={isSubmitting}
                  />

                  <DefaultFormTextField
                    form={form}
                    name="stock_quantity"
                    label="Stock Quantity"
                    placeholder="0"
                    type="number"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DefaultFormTextField
                    form={form}
                    name="sku"
                    label="SKU (Stock Keeping Unit)"
                    placeholder="PROD-001"
                    disabled={isSubmitting}
                  />

                  <DefaultFormTextField
                    form={form}
                    name="weight"
                    label="Weight (kg)"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Size Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Size / Fitment Options
                    </CardTitle>
                    <CardDescription>
                      Add different size options with additional pricing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Size Name
                        </label>
                        <input
                          type="text"
                          value={newSize.name}
                          onChange={(e) => setNewSize({ ...newSize, name: e.target.value })}
                          placeholder="e.g., Large, XL, Premium"
                          className="w-full px-3 py-2 border rounded-md"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Additional Price ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={newSize.additional_price}
                          onChange={(e) => setNewSize({ ...newSize, additional_price: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border rounded-md"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={addSizeOption}
                          disabled={isSubmitting || !newSize.name.trim()}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Size
                        </Button>
                      </div>
                    </div>

                    {sizeOptions.length > 0 && (
                      <div className="border rounded-md">
                        <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/50">
                          <div className="col-span-5 font-medium">Size Option</div>
                          <div className="col-span-4 font-medium">Additional Price</div>
                          <div className="col-span-3 font-medium">Actions</div>
                        </div>
                        {sizeOptions.map((size, index) => (
                          <div key={size.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0">
                            <div className="col-span-5 flex items-center">
                              <Badge variant="secondary" className="mr-2">
                                {index + 1}
                              </Badge>
                              {size.name}
                            </div>
                            <div className="col-span-4">
                              {size.additional_price > 0 ? (
                                <span className="text-green-600 font-medium">
                                  +${size.additional_price.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">No additional charge</span>
                              )}
                            </div>
                            <div className="col-span-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSizeOption(size.id)}
                                disabled={sizeOptions.length === 1 || isSubmitting}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <DefaultFormCheckbox
                    form={form}
                    name="is_active"
                    label="Active"
                    description="Make product visible on store"
                  />
                  <DefaultFormCheckbox
                    form={form}
                    name="is_featured"
                    label="Featured"
                    description="Highlight product on homepage"
                  />
                  <DefaultFormCheckbox
                    form={form}
                    name="allow_backorders"
                    label="Allow Backorders"
                    description="Allow purchases when out of stock"
                  />
                </div>
              </TabsContent>

              {/* Images Tab */}
              <TabsContent value="images" className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    First image will be used as the main product image. Recommended size: 1200x1600px
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Upload Product Images
                    </label>
                    <ImageUploader
                      label="Add Product Images"
                      onChange={handleMultipleImageUpload}
                      disabled={isSubmitting}
                      maxSize={10} 
                      accept="image/*"
                      enableCompression={true}
                      compressionQuality={0.8}
                      maxWidth={1920}
                      maxHeight={1920}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Click the upload area or drag & drop images here. You can upload up to 10 images.
                    </p>
                  </div>

                  {productImages.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Uploaded Images ({productImages.length}/10)</h4>
                        <p className="text-sm text-muted-foreground">
                          First image is main. Drag thumbnails to reorder.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {productImages.map((image, index) => (
                          <div key={image.id} className="relative group">
                            <div className="aspect-square relative overflow-hidden rounded-lg border">
                              {/* Using img tag for blob URLs */}
                              <img
                                src={image.previewUrl}
                                alt={`Product image ${index + 1}`}
                                className="object-cover w-full h-full"
                              />
                              {index === 0 && (
                                <div className="absolute top-2 left-2">
                                  <Badge className="bg-primary">Main</Badge>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      moveImage(index, 'up')
                                    }}
                                    disabled={index === 0 || isSubmitting}
                                    className="h-8 w-8 p-0"
                                  >
                                    ↑
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      moveImage(index, 'down')
                                    }}
                                    disabled={index === productImages.length - 1 || isSubmitting}
                                    className="h-8 w-8 p-0"
                                  >
                                    ↓
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeImage(image.id)
                                    }}
                                    disabled={isSubmitting}
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                <span className="text-xs text-white text-center">
                                  Image {index + 1}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* SEO & Options Tab */}
              <TabsContent value="seo" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Hash className="h-5 w-5" />
                      SEO Settings
                    </CardTitle>
                    <CardDescription>
                      Optimize your product for search engines
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DefaultFormTextField
                      form={form}
                      name="meta_title"
                      label="Meta Title"
                      placeholder="Best Car Part | Your Store Name"
                      disabled={isSubmitting}
                    />

                    <DefaultFormTextArea
                      form={form}
                      name="meta_description"
                      label="Meta Description"
                      placeholder="Discover the best car part with premium quality..."
                      disabled={isSubmitting}
                      className="min-h-[100px]"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Form Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>All fields marked with * are required</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <span className="mr-2">Creating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Product
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Container>
  )
}