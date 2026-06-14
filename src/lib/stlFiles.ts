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
