/**
 * Returns the correct image src for a product.
 * If the image_file is a full URL (http/https), use it directly.
 * If it's a local filename, prepend the static path.
 */
export function getImageSrc(imageFile: string | null | undefined): string | undefined {
  if (!imageFile) return undefined
  if (imageFile.startsWith('http://') || imageFile.startsWith('https://')) {
    return imageFile
  }
  return `/api/static/${imageFile}`
}
