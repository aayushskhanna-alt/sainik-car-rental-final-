import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mbwakezabviqsmdranzo.supabase.co'
const SUPABASE_KEY = 'sb_publishable_4bXFfiSBJKWF4uP93U-LUw_8Kmhbc-e'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export const uploadCarPhoto = async (fileNo, file) => {
  const ext = file.name.split('.').pop()
  const path = `${fileNo}/${Date.now()}.${ext}`
  const { data, error } = await supabase.storage
    .from('carphotos')
    .upload(path, file, { upsert: true })
  if (error) { console.error('Upload error:', error); return null }
  const { data: urlData } = supabase.storage.from('carphotos').getPublicUrl(path)
  return urlData.publicUrl
}

export const deleteCarPhoto = async (url) => {
  const path = url.split('/carphotos/')[1]
  if (!path) return
  await supabase.storage.from('carphotos').remove([path])
}