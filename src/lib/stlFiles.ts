import { supabase } from './supabaseClient'

const STL_BUCKET = 'stl-files'

// stl_file_url is stored as a full storage URL — extract the path after the bucket name.
export function getStlPathFromUrl(stlFileUrl: string): string {
  const marker = `/${STL_BUCKET}/`
  const idx = stlFileUrl.indexOf(marker)
  return idx === -1 ? stlFileUrl : stlFileUrl.slice(idx + marker.length)
}

export async function getStlSignedUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STL_BUCKET)
    .createSignedUrl(filePath, 3600)
  if (error) return null
  return data?.signedUrl ?? null
}

// Shared by any flow that lets a student attach an STL for staff review
// (service/machine requests, and filament-style equipment requests).
export async function uploadStlFile(
  file: File,
  ownerId: string | null | undefined,
  ownerEmail: string,
): Promise<{ url: string; name: string }> {
  const safePath = ownerId ?? ownerEmail.replace('@', '_at_').replace(/\./g, '_')
  const filePath = `${safePath}/${Date.now()}_${file.name}`
  const { error: uploadError } = await supabase.storage.from(STL_BUCKET).upload(filePath, file)
  if (uploadError) throw uploadError

  const { data: publicUrlData } = supabase.storage.from(STL_BUCKET).getPublicUrl(filePath)
  return { url: publicUrlData.publicUrl, name: file.name }
}
