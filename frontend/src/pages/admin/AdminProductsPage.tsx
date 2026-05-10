import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { adminProductsApi } from '../../api/adminProducts'
import type { Product } from '../../api/products'
import { useToast } from '../../components/ToastProvider'
import { EditProductDrawer } from './EditProductDrawer'

const columnHelper = createColumnHelper<Product & { deleted_at?: string | null }>()

export const AdminProductsPage: React.FC = () => {
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['adminProducts', includeDeleted],
    queryFn: () => adminProductsApi.getProducts(includeDeleted)
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminProductsApi.deleteProduct(id),
    onSuccess: () => {
      toast.success({ title: 'Success', body: 'Product soft-deleted' })
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] })
    },
    onError: () => {
      toast.error({ title: 'Error', body: 'Failed to delete product' })
    }
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => adminProductsApi.restoreProduct(id),
    onSuccess: () => {
      toast.success({ title: 'Success', body: 'Product restored' })
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] })
    },
    onError: () => {
      toast.error({ title: 'Error', body: 'Failed to restore product' })
    }
  })

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id)
    }
  }

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => <span className="font-medium">{info.getValue()}</span>
    }),
    columnHelper.accessor('category', {
      header: 'Category',
      cell: info => info.getValue() || '-'
    }),
    columnHelper.accessor('price', {
      header: 'Price',
      cell: info => `$${info.getValue().toFixed(2)}`
    }),
    columnHelper.accessor('stock', {
      header: 'Stock',
      cell: info => info.getValue()
    }),
    columnHelper.accessor('deleted_at', {
      header: 'Status',
      cell: info => info.getValue() ? (
        <span className="text-red-600 bg-red-100 px-2 py-1 rounded text-xs">Deleted</span>
      ) : (
        <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs">Active</span>
      )
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: props => {
        const product = props.row.original
        const isDeleted = !!product.deleted_at
        
        return (
          <div className="flex gap-2">
            <button
              onClick={() => setEditingProduct(product)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Edit
            </button>
            {isDeleted ? (
              <button
                onClick={() => restoreMutation.mutate(product.id)}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
                disabled={restoreMutation.isPending}
              >
                Restore
              </button>
            ) : (
              <button
                onClick={() => handleDelete(product.id)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
                disabled={deleteMutation.isPending}
              >
                Delete
              </button>
            )}
          </div>
        )
      }
    }),
  ]

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Products</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input 
              type="checkbox" 
              checked={includeDeleted}
              onChange={e => setIncludeDeleted(e.target.checked)}
            />
            Show Deleted
          </label>
          <button 
            onClick={() => setEditingProduct({} as any)} // Empty object for new product
            className="bg-[var(--color-brand-maroon)] text-white px-4 py-2 rounded hover:bg-opacity-90"
          >
            Add Product
          </button>
        </div>
      </div>

      {isLoading ? (
        <div>Loading products...</div>
      ) : (
        <div className="overflow-x-auto bg-[var(--bg-card)] rounded-lg shadow border border-[var(--border-color)]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)]">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="p-3 text-sm font-medium text-[var(--text-color-secondary)]">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => {
                const isDeleted = !!row.original.deleted_at
                return (
                  <tr 
                    key={row.id} 
                    className={`border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] ${
                      isDeleted ? 'opacity-50 grayscale' : ''
                    }`}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="p-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {products.length === 0 && (
            <div className="p-4 text-center text-gray-500">No products found.</div>
          )}
        </div>
      )}

      {editingProduct && (
        <EditProductDrawer 
          product={editingProduct.id ? editingProduct : undefined}
          onClose={() => setEditingProduct(null)} 
        />
      )}
    </div>
  )
}
