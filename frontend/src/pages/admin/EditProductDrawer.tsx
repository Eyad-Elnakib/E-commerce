import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminProductsApi } from '../../api/adminProducts'
import type { Product } from '../../api/products'
import { useToast } from '../../components/ToastProvider'
import { getImageSrc } from '../../utils/image'

interface EditProductDrawerProps {
  product?: Product
  onClose: () => void
}

export const EditProductDrawer: React.FC<EditProductDrawerProps> = ({ product, onClose }) => {
  const isNew = !product
  const [formData, setFormData] = useState<Partial<Product>>({
    name: product?.name || '',
    category: product?.category || '',
    brand: product?.brand || '',
    price: product?.price || 0,
    description: product?.description || '',
    stock: product?.stock || 0,
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(
    product?.image_file ? (getImageSrc(product.image_file) || null) : null
  )

  const queryClient = useQueryClient()
  const toast = useToast()

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      let savedProduct: Product
      if (isNew) {
        savedProduct = await adminProductsApi.createProduct(data)
      } else {
        savedProduct = await adminProductsApi.updateProduct(product.id, data)
      }

      if (imageFile) {
        savedProduct = await adminProductsApi.uploadImage(savedProduct.id, imageFile)
      }
      return savedProduct
    },
    onSuccess: () => {
      toast.success({ title: 'Success', body: `Product ${isNew ? 'created' : 'updated'}` })
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] })
      onClose()
    },
    onError: (err: any) => {
      toast.error({ title: 'Error', body: err.response?.data?.detail || 'Failed to save product' })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        toast.error({ title: 'Error', body: 'File too large (>5MB)' })
        return
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error({ title: 'Error', body: 'Only JPEG and PNG allowed' })
        return
      }
      setImageFile(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-[var(--bg-primary)] h-full overflow-y-auto shadow-xl p-6 transition-transform transform translate-x-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{isNew ? 'Create Product' : 'Edit Product'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input 
              required
              className="w-full border rounded px-3 py-2 bg-[var(--bg-card)]"
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input 
                className="w-full border rounded px-3 py-2 bg-[var(--bg-card)]"
                value={formData.category || ''}
                onChange={e => setFormData({...formData, category: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Brand</label>
              <input 
                className="w-full border rounded px-3 py-2 bg-[var(--bg-card)]"
                value={formData.brand || ''}
                onChange={e => setFormData({...formData, brand: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price</label>
              <input 
                type="number"
                step="0.01"
                required
                className="w-full border rounded px-3 py-2 bg-[var(--bg-card)]"
                value={formData.price || ''}
                onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock</label>
              <input 
                type="number"
                required
                className="w-full border rounded px-3 py-2 bg-[var(--bg-card)]"
                value={formData.stock || ''}
                onChange={e => setFormData({...formData, stock: parseInt(e.target.value, 10)})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea 
              className="w-full border rounded px-3 py-2 bg-[var(--bg-card)]"
              rows={3}
              value={formData.description || ''}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          {/* Image Uploader */}
          <div>
            <label className="block text-sm font-medium mb-1">Product Image</label>
            <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <input 
                type="file" 
                accept="image/jpeg, image/png"
                className="hidden" 
                id="image-upload"
                onChange={handleImageChange}
              />
              <label htmlFor="image-upload" className="cursor-pointer block w-full h-full">
                {preview ? (
                  <div className="flex flex-col items-center">
                    <img src={preview} alt="Preview" className="h-32 object-contain mb-2" />
                    <span className="text-sm text-blue-600">Change image</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Click to upload (JPEG/PNG, max 5MB)</span>
                )}
              </label>
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saveMutation.isPending}
              className="flex-1 px-4 py-2 bg-[var(--color-brand-maroon)] text-white rounded font-medium hover:bg-opacity-90 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
