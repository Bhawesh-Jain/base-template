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
import { createProduct } from "@/lib/actions/product"
import { getCategoryList } from "@/lib/actions/category"
import {
  Plus,
  Minus,
  Package,
  Image as ImageIcon,
  DollarSign,
  Layers,
  Hash,
  AlertCircle,
  Save,
  X,
  Upload
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProductFeatureList } from "./blocks/ProductFeatureList"

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

  product_details: z
    .array(
      z.string()
        .min(2, "Feature must be at least 2 characters")
        .max(200, "Feature too long")
    )
    .optional()
    .default([]),

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
});

const TAB_FIELDS: Record<string, string[]> = {
  basic: [
    "product_name",
    "product_slug",
    "category_id",
    "product_description",
    "product_details",
  ],
  pricing: [
    "base_price",
    "sale_price",
    "stock_quantity",
    "sku",
    "weight",
    "is_active",
    "is_featured",
    "allow_backorders",
  ],
  images: [],
  seo: [
    "meta_title",
    "meta_description",
  ],
}

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

interface ProductImage {
  id: string
  file: File
  previewUrl: string
}

export default function AddProduct() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeTab, setActiveTab] = useState("basic")
  const [productImages, setProductImages] = useState<ProductImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
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
      product_details: [],
      sku: "",
      is_active: true,
      is_featured: false,
      allow_backorders: false,
      meta_title: "",
      meta_description: "",
    },
  })

  useEffect(() => {
    const errors = form.formState.errors
    if (!errors || Object.keys(errors).length === 0) return

    for (const [tab, fields] of Object.entries(TAB_FIELDS)) {
      if (
        fields.some((field) =>
          Object.keys(errors).some((errorKey) =>
            errorKey === field || errorKey.startsWith(`${field}.`)
          )
        )
      ) {
        setActiveTab(tab)
        break
      }
    }
  }, [form.formState.submitCount])

  const tabHasError = (tab: string) => {
    const fields = TAB_FIELDS[tab]
    const errors = form.formState.errors

    return fields.some((field) =>
      Object.keys(errors).some(
        (key) => key === field || key.startsWith(`${field}.`)
      )
    )
  }

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
        const result = await getCategoryList({ status: 1, modifier: '=' })
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

  // Handle multiple image uploads
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newImages: ProductImage[] = []
    const maxImages = 10
    const remainingSlots = maxImages - productImages.length

    if (files.length > remainingSlots) {
      toast({
        title: "Too many images",
        description: `You can only upload ${remainingSlots} more image(s). Maximum is ${maxImages}.`,
        variant: "destructive",
      })
    }

    Array.from(files).slice(0, remainingSlots).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        })
        return
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: `${file.name} is not an image`,
          variant: "destructive",
        })
        return
      }

      const previewUrl = URL.createObjectURL(file)
      newImages.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl
      })
    })

    if (newImages.length > 0) {
      setProductImages(prev => [...prev, ...newImages])
      toast({
        title: "Images added",
        description: `Added ${newImages.length} image(s)`,
      })
    }

    // Reset input
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const maxImages = 10
    const remainingSlots = maxImages - productImages.length

    if (files.length > remainingSlots) {
      toast({
        title: "Too many images",
        description: `You can only upload ${remainingSlots} more image(s). Maximum is ${maxImages}.`,
        variant: "destructive",
      })
    }

    const newImages: ProductImage[] = []
    Array.from(files).slice(0, remainingSlots).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        })
        return
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: `${file.name} is not an image`,
          variant: "destructive",
        })
        return
      }

      const previewUrl = URL.createObjectURL(file)
      newImages.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl
      })
    })

    if (newImages.length > 0) {
      setProductImages(prev => [...prev, ...newImages])
      toast({
        title: "Images added",
        description: `Added ${newImages.length} image(s)`,
      })
    }
  }

  const removeImage = (id: string) => {
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

  const onInvalid = () => {
    toast({
      title: "Missing required fields",
      description: "Please fix the highlighted sections before submitting.",
      variant: "destructive",
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      productImages.forEach(image => {
        if (image.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(image.previewUrl)
        }
      })
    }
  }, [])

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <Package className="h-5 w-5 sm:h-6 sm:w-6" />
              Add New Product
            </CardTitle>
            <CardDescription className="text-sm">
              Add a new product to your inventory
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm w-fit">
            Draft
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 mb-6 sm:mb-8 h-auto">
                <TabsTrigger value="basic" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                  <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Basic Info</span>
                  <span className="xs:hidden">Basic</span>
                  {tabHasError("basic") && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Pricing & Stock</span>
                  <span className="xs:hidden">Pricing</span>
                  {tabHasError("pricing") && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="images" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                  <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Images</span>
                  {tabHasError("images") && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="seo" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                  <Hash className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>SEO</span>
                  {tabHasError("seo") && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-red-500" />
                  )}
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

                  <ProductFeatureList
                    form={form}
                    disabled={isSubmitting}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Size Name
                        </label>
                        <input
                          type="text"
                          value={newSize.name}
                          onChange={(e) => setNewSize({ ...newSize, name: e.target.value })}
                          placeholder="e.g., Large, XL, Premium"
                          className="w-full px-3 py-2 border rounded-md text-sm"
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
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="flex items-end sm:col-span-2 lg:col-span-1">
                        <Button
                          type="button"
                          onClick={addSizeOption}
                          disabled={isSubmitting || !newSize.name.trim()}
                          className="w-full text-sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Size
                        </Button>
                      </div>
                    </div>

                    {sizeOptions.length > 0 && (
                      <div className="border rounded-md overflow-x-auto">
                        <div className="min-w-[500px]">
                          <div className="grid grid-cols-12 gap-4 p-3 sm:p-4 border-b bg-muted/50">
                            <div className="col-span-5 font-medium text-sm">Size Option</div>
                            <div className="col-span-4 font-medium text-sm">Additional Price</div>
                            <div className="col-span-3 font-medium text-sm">Actions</div>
                          </div>
                          {sizeOptions.map((size, index) => (
                            <div key={size.id} className="grid grid-cols-12 gap-4 p-3 sm:p-4 border-b last:border-0">
                              <div className="col-span-5 flex items-center">
                                <Badge variant="secondary" className="mr-2 text-xs">
                                  {index + 1}
                                </Badge>
                                <span className="text-sm truncate">{size.name}</span>
                              </div>
                              <div className="col-span-4 flex items-center">
                                {size.additional_price > 0 ? (
                                  <span className="text-green-600 font-medium text-sm">
                                    +${size.additional_price.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">No charge</span>
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
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <AlertDescription className="text-xs sm:text-sm">
                    First image will be used as the main product image. You can upload up to 10 images. Recommended size: 1200x1600px
                  </AlertDescription>
                </Alert>

                {/* Upload Area */}
                <div
                  className={`
                    border-2 border-dashed rounded-lg p-4 sm:p-6 lg:p-8 text-center transition-all duration-200
                    ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'}
                    ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
                    ${productImages.length >= 10 ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (!isSubmitting && productImages.length < 10) {
                      document.getElementById('multiple-image-input')?.click()
                    }
                  }}
                >
                  <div className="flex flex-col items-center gap-2 sm:gap-3">
                    <div className="p-3 sm:p-4 bg-gray-100 rounded-full">
                      <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">
                        {isDragging ? 'Drop images here' : 'Click to upload or drag and drop multiple images'}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        PNG, JPG, GIF up to 10MB each • {productImages.length}/10 images uploaded
                      </p>
                    </div>
                  </div>
                  <input
                    id="multiple-image-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={isSubmitting || productImages.length >= 10}
                  />
                </div>

                {/* Image Grid */}
                {productImages.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h4 className="font-medium text-sm sm:text-base">Uploaded Images ({productImages.length}/10)</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        First image is main. Use arrows to reorder.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                      {productImages.map((image, index) => (
                        <div key={image.id} className="relative group">
                          <div className="aspect-square relative overflow-hidden rounded-lg border">
                            <img
                              src={image.previewUrl}
                              alt={`Product ${index + 1}`}
                              className="object-cover w-full h-full"
                            />
                            {index === 0 && (
                              <div className="absolute top-1 left-1 sm:top-2 sm:left-2">
                                <Badge className="bg-primary text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">Main</Badge>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-1.5 sm:p-2">
                              <div className="flex gap-1 sm:gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => moveImage(index, 'up')}
                                  disabled={index === 0 || isSubmitting}
                                  className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm"
                                >
                                  ↑
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => moveImage(index, 'down')}
                                  disabled={index === productImages.length - 1 || isSubmitting}
                                  className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm"
                                >
                                  ↓
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeImage(image.id)}
                                  disabled={isSubmitting}
                                  className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                                >
                                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                              <span className="text-[10px] sm:text-xs text-white text-center">
                                Image {index + 1}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>All fields marked with * are required</span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial min-w-[120px] text-sm"
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