import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const avatarInputRef = useRef(null)
  
  const [profile, setProfile] = useState(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    name: '',
    tagline: '',
    teachableSkills: '',
  })
  const [skillMedia, setSkillMedia] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [editingCaption, setEditingCaption] = useState(null)

  const isOwnProfile = !userId || userId === user?.id

  useEffect(() => {
    if (!user && !userId) {
      navigate('/login')
      return
    }
    fetchProfile()
    fetchSkillMedia()
  }, [user, userId, navigate])

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId || user.id)
        .single()

      if (error) throw error
      setProfile(data)
      
      if (isOwnProfile) {
        setEditedProfile({
          name: data?.name || '',
          tagline: data?.tagline || '',
          teachableSkills: data?.teachable_skills || '',
        })
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile')
    }
  }

  async function handleAvatarUpload(e) {
    try {
      setError(null)
      setIsUploading(true)
      setUploadProgress(0)

      const file = e.target.files?.[0]
      if (!file) return

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file')
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB')
      }

      // Create a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldAvatarPath = profile.avatar_url.split('/').pop()
        if (oldAvatarPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldAvatarPath}`])
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100
            setUploadProgress(percentage)
          },
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      setSuccessMessage('Avatar updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setError(err.message || 'Failed to upload avatar')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ''
      }
    }
  }

  async function handleMediaUpload(e) {
    try {
      setError(null)
      setIsUploading(true)
      setUploadProgress(0)

      const file = e.target.files?.[0]
      if (!file) return

      // Validate file type
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')
      if (!isVideo && !isImage) {
        throw new Error('Please upload a video or image file')
      }

      // Validate file size (max 50MB for videos, 5MB for images)
      const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error(`File size must be less than ${isVideo ? '50MB' : '5MB'}`)
      }

      // Create a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const bucketName = isVideo ? 'skill_videos' : 'skill_photos'

      // Upload media
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100
            setUploadProgress(percentage)
          },
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName)

      // Create media record
      const { error: insertError } = await supabase
        .from('skill_media')
        .insert([{
          profile_id: user.id,
          title: file.name,
          media_type: isVideo ? 'video' : 'photo',
          [isVideo ? 'video_url' : 'photo_url']: publicUrl,
        }])

      if (insertError) throw insertError

      fetchSkillMedia()
      setSuccessMessage('Media uploaded successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Error uploading media:', err)
      setError(err.message || 'Failed to upload media')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleMediaDelete(mediaId, mediaType, url) {
    try {
      setError(null)

      // Delete from storage
      const bucketName = mediaType === 'video' ? 'skill_videos' : 'skill_photos'
      const filePath = url.split('/').pop()
      if (filePath) {
        await supabase.storage
          .from(bucketName)
          .remove([`${user.id}/${filePath}`])
      }

      // Delete from database
      const { error } = await supabase
        .from('skill_media')
        .delete()
        .eq('id', mediaId)

      if (error) throw error

      setSkillMedia(skillMedia.filter(media => media.id !== mediaId))
      setSuccessMessage('Media deleted successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Error deleting media:', err)
      setError('Failed to delete media')
    }
  }

  async function handleCaptionUpdate(mediaId, caption) {
    try {
      setError(null)

      const { error } = await supabase
        .from('skill_media')
        .update({ caption })
        .eq('id', mediaId)

      if (error) throw error

      setSkillMedia(skillMedia.map(media =>
        media.id === mediaId ? { ...media, caption } : media
      ))
      setEditingCaption(null)
      setSuccessMessage('Caption updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Error updating caption:', err)
      setError('Failed to update caption')
    }
  }

  async function handleProfileUpdate() {
    try {
      setError(null)

      const { error } = await supabase
        .from('profiles')
        .update({
          name: editedProfile.name,
          tagline: editedProfile.tagline,
          teachable_skills: editedProfile.teachableSkills,
        })
        .eq('id', user.id)

      if (error) throw error

      setProfile({
        ...profile,
        name: editedProfile.name,
        tagline: editedProfile.tagline,
        teachable_skills: editedProfile.teachableSkills,
      })
      setIsEditingProfile(false)
      setSuccessMessage('Profile updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update profile')
    }
  }

  async function fetchSkillMedia() {
    try {
      const { data, error } = await supabase
        .from('skill_media')
        .select('*')
        .eq('profile_id', userId || user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSkillMedia(data || [])
    } catch (err) {
      console.error('Error fetching skill media:', err)
      setError('Failed to load skill media')
    }
  }

  if (!user && !userId) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Section */}
      <div className="bg-[#111122] rounded-lg shadow-sm border border-[#f2a93b]/50 p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[#1A1A3F] overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            {isOwnProfile && (
              <label className="absolute bottom-0 right-0 bg-[#f2a93b] text-white p-2 rounded-full cursor-pointer hover:bg-[#d98f2f]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  ref={avatarInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
              </label>
            )}
          </div>
          <div className="flex-1">
            {isOwnProfile && isEditingProfile ? (
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={editedProfile.name}
                    onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                    placeholder="Your name"
                    className="w-full p-2 bg-[#1A1A3F] border border-[#f2a93b]/30 rounded-lg focus:ring-2 focus:ring-[#f2a93b] text-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={editedProfile.tagline}
                    onChange={(e) => setEditedProfile({ ...editedProfile, tagline: e.target.value })}
                    placeholder="Add a tagline"
                    className="w-full p-2 bg-[#1A1A3F] border border-[#f2a93b]/30 rounded-lg focus:ring-2 focus:ring-[#f2a93b] text-white"
                  />
                </div>
                <div>
                  <textarea
                    value={editedProfile.teachableSkills}
                    onChange={(e) => setEditedProfile({ ...editedProfile, teachableSkills: e.target.value })}
                    placeholder="List the skills you can teach (separate with commas)"
                    className="w-full p-2 bg-[#1A1A3F] border border-[#f2a93b]/30 rounded-lg focus:ring-2 focus:ring-[#f2a93b] text-white"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleProfileUpdate}
                    className="bg-[#f2a93b] text-white px-4 py-2 rounded-lg hover:bg-[#d98f2f]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingProfile(false)
                      setEditedProfile({
                        name: profile?.name || '',
                        tagline: profile?.tagline || '',
                        teachableSkills: profile?.teachable_skills || '',
                      })
                    }}
                    className="border border-[#f2a93b]/30 px-4 py-2 rounded-lg hover:bg-[#1A1A3F]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-white">{profile?.name || 'User'}</h1>
                <p className="text-gray-400">{profile?.tagline || 'No tagline yet'}</p>
                {profile?.teachable_skills && (
                  <div className="mt-2">
                    <h2 className="text-sm font-semibold text-[#f2a93b]">Skills I can teach:</h2>
                    <p className="text-gray-300">{profile.teachable_skills}</p>
                  </div>
                )}
                {isOwnProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="mt-2 text-[#f2a93b] hover:text-[#d98f2f]"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-800/50 text-green-300 p-4 rounded-lg mb-4"
        >
          {successMessage}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-800/50 text-red-300 p-4 rounded-lg mb-4"
        >
          {error}
        </motion.div>
      )}

      {/* Skill Media Section */}
      <div className="bg-[#111122] rounded-lg shadow-sm border border-[#f2a93b]/50 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Skill Media</h2>
          {isOwnProfile && (
            <label className="bg-[#f2a93b] text-white px-4 py-2 rounded-lg hover:bg-[#d98f2f] cursor-pointer">
              Upload Media
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                disabled={isUploading}
              />
            </label>
          )}
        </div>

        {isUploading && (
          <div className="mb-4">
            <div className="h-2 bg-[#1A1A3F] rounded">
              <div
                className="h-full bg-[#f2a93b] rounded transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {skillMedia.map((media) => (
            <motion.div
              key={media.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#1A1A3F] rounded-lg overflow-hidden"
            >
              {media.media_type === 'video' ? (
                <video
                  src={media.video_url}
                  controls
                  className="w-full aspect-video object-cover"
                />
              ) : (
                <img
                  src={media.photo_url}
                  alt={media.title}
                  className="w-full aspect-video object-cover"
                />
              )}
              <div className="p-4">
                {isOwnProfile && editingCaption === media.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={media.caption || ''}
                      onChange={(e) => {
                        setSkillMedia(skillMedia.map(m =>
                          m.id === media.id ? { ...m, caption: e.target.value } : m
                        ))
                      }}
                      placeholder="Add a caption..."
                      className="w-full p-2 bg-[#111122] border border-[#f2a93b]/30 rounded-lg focus:ring-2 focus:ring-[#f2a93b] text-white"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCaptionUpdate(media.id, media.caption)}
                        className="bg-[#f2a93b] text-white px-3 py-1 rounded hover:bg-[#d98f2f]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCaption(null)}
                        className="border border-[#f2a93b]/30 px-3 py-1 rounded hover:bg-[#1A1A3F]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <p className="text-gray-300">{media.caption || 'No caption'}</p>
                    {isOwnProfile && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingCaption(media.id)}
                          className="text-[#f2a93b] hover:text-[#d98f2f]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleMediaDelete(media.id, media.media_type, media[media.media_type === 'video' ? 'video_url' : 'photo_url'])}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}