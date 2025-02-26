import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/AuthContext'
import { Dialog } from '@headlessui/react'

export default function Hive() {
  const [listings, setListings] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isRequestOpen, setIsRequestOpen] = useState(false)
  const [selectedListing, setSelectedListing] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [userProfile, setUserProfile] = useState(null)
  const [newListing, setNewListing] = useState({
    name: '',
    wantSkill: '',
    giveSkill: '',
    experience: 'Beginner',
    location: '',
    description: '',
  })
  const [request, setRequest] = useState({
    senderName: '',
    swapConditions: '',
  })
  const [searchWant, setSearchWant] = useState('')
  const [searchOffer, setSearchOffer] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
    fetchListings()
  }, [user])

  async function fetchUserProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, teachable_skills')
        .eq('id', user.id)
        .single()

      if (error) throw error
      
      setUserProfile(data)
      setNewListing(prev => ({ ...prev, name: data?.name || '' }))
    } catch (err) {
      console.error('Error fetching user profile:', err)
    }
  }

  async function fetchListings() {
    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          profile:profiles!listings_user_id_fkey (
            avatar_url,
            name
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setListings(data || [])
    } catch (err) {
      console.error('Error fetching listings:', err)
      setError('Failed to load listings')
    } finally {
      setIsLoading(false)
    }
  }

  const sortedAndFilteredListings = useMemo(() => {
    const teachableSkills = userProfile?.teachable_skills
      ? userProfile.teachable_skills
          .toLowerCase()
          .split(',')
          .map(skill => skill.trim())
          .filter(Boolean)
      : []

    return listings
      .filter(listing => {
        const matchesWant = !searchWant || 
          listing.title.toLowerCase().includes(searchWant.toLowerCase())
        const matchesOffer = !searchOffer || 
          listing.skillCategory.toLowerCase().includes(searchOffer.toLowerCase())
        return matchesWant && matchesOffer
      })
      .sort((a, b) => {
        if (!teachableSkills.length) {
          return new Date(b.created_at) - new Date(a.created_at)
        }

        const aMatches = teachableSkills.some(skill => 
          a.title.toLowerCase().includes(skill))
        const bMatches = teachableSkills.some(skill => 
          b.title.toLowerCase().includes(skill))

        if (aMatches && !bMatches) return -1
        if (!aMatches && bMatches) return 1
        return new Date(b.created_at) - new Date(a.created_at)
      })
  }, [listings, searchWant, searchOffer, userProfile?.teachable_skills])

  function handleMatchConnect(listing) {
    if (!user) {
      setError('Please log in to send a request')
      return
    }
    setSelectedListing(listing)
    setRequest(prev => ({
      ...prev,
      senderName: userProfile?.name || ''
    }))
    setIsRequestOpen(true)
  }

  async function createListing(e) {
    e.preventDefault()
    
    try {
      setError(null)
      
      const { error } = await supabase
        .from('listings')
        .insert([
          {
            user_id: user.id,
            title: newListing.wantSkill,
            skillCategory: newListing.giveSkill,
            type: newListing.experience,
            location: newListing.location,
            description: newListing.description,
            name: newListing.name
          }
        ])

      if (error) throw error
      
      setNewListing({
        name: userProfile?.name || '',
        wantSkill: '',
        giveSkill: '',
        experience: 'Beginner',
        location: '',
        description: '',
      })
      setIsOpen(false)
      setSuccessMessage('Listing created successfully!')
      
      setTimeout(() => setSuccessMessage(''), 3000)
      fetchListings()
    } catch (err) {
      console.error('Error creating listing:', err)
      setError('Failed to create listing. Please try again.')
    }
  }

  async function createRequest(e) {
    e.preventDefault()
    
    try {
      setError(null)
      
      const { error } = await supabase
        .from('requests')
        .insert([
          {
            listing_id: selectedListing.id,
            sender_id: user.id,
            recipient_id: selectedListing.user_id,
            sender_name: userProfile?.name || request.senderName,
            swap_conditions: request.swapConditions,
            status: 'pending'
          }
        ])

      if (error) throw error
      
      setRequest({
        senderName: '',
        swapConditions: ''
      })
      setIsRequestOpen(false)
      setSuccessMessage('Request sent successfully!')
      
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Error creating request:', err)
      setError('Failed to send request. Please try again.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-[#f2a93b]">Skill Swap Listings</h1>
        {user && (
          <button
            onClick={() => setIsOpen(true)}
            className="bg-[#f2a93b] text-white px-4 py-2 rounded-lg hover:bg-[#d98f2f] flex items-center"
          >
            <span className="mr-2">+</span> Create Request
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Search the skill you want..."
            value={searchWant}
            onChange={(e) => setSearchWant(e.target.value)}
            className="w-full p-3 pl-10 bg-[#111122] border border-[#f2a93b]/30 rounded-lg text-white placeholder-gray-400"
          />
          <svg className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search the skill you offer..."
            value={searchOffer}
            onChange={(e) => setSearchOffer(e.target.value)}
            className="w-full p-3 pl-10 bg-[#111122] border border-[#f2a93b]/30 rounded-lg text-white placeholder-gray-400"
          />
          <svg className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

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

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f2a93b]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAndFilteredListings.map((listing) => {
            const isMatch = userProfile?.teachable_skills && 
              userProfile.teachable_skills
                .toLowerCase()
                .split(',')
                .map(skill => skill.trim())
                .some(skill => listing.title.toLowerCase().includes(skill))

            return (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#111122] p-6 rounded-lg shadow-sm border border-[#f2a93b]/50 relative"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-[#1A1A3F] rounded-full overflow-hidden flex items-center justify-center">
                    {listing.profile?.avatar_url ? (
                      <img
                        src={listing.profile.avatar_url}
                        alt={listing.profile.name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-6 h-6 text-[#f2a93b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <Link 
                      to={`/profile/${listing.user_id}`}
                      className="font-semibold text-[#f2a93b] hover:text-[#d98f2f] transition-colors"
                    >
                      {listing.profile?.name || listing.name || 'User'}
                    </Link>
                  </div>
                  {isMatch && (
                    <span className="ml-auto bg-green-800/50 text-green-300 text-sm px-2 py-1 rounded-full">
                      Skill Match!
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#f2a93b] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-gray-300">Wants to learn: {listing.title}</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#f2a93b] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    <span className="text-gray-300">Can teach: {listing.skillCategory}</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#f2a93b] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <span className="text-gray-300">Experience: {listing.type}</span>
                  </div>
                  {listing.location && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-[#f2a93b] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-gray-300">Location: {listing.location}</span>
                    </div>
                  )}
                </div>
                
                <p className="text-gray-400 mb-4">{listing.description}</p>
                
                {user && user.id !== listing.user_id && (
                  <button
                    onClick={() => handleMatchConnect(listing)}
                    className="w-full bg-[#1A1A3F] text-[#f2a93b] px-4 py-2 rounded-lg hover:bg-[#1A1A3F]/80 border border-[#f2a93b]/30"
                  >
                    Match & Connect
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create Listing Dialog */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-[#111122] rounded-lg max-w-md w-full mx-4 p-6 text-white">
            <Dialog.Title className="text-lg font-medium mb-4 text-[#f2a93b]">Create New Listing</Dialog.Title>
            
            <form onSubmit={createListing} className="space-y-4">
              <div>
                <label className="block mb-2 text-gray-300">Name</label>
                <input
                  type="text"
                  value={newListing.name}
                  onChange={(e) => setNewListing({...newListing, name: e.target.value})}
                  className="w-full p-2 bg-[#1A1A3F] border border-[#f2a93b]/30 rounded text-white"
                  required
                  placeholder="Your name"
                  disabled={!!userProfile?.name}
                />
              </div>
              <div>
                <label className="block mb-2 text-gray-300">Skill you want</label>
                <input
                  type="text"
                  value={newListing.wantSkill}
                  onChange={(e) => setNewListing({...newListing, wantSkill: e.target.value})}
                  className="w-full p-2 bg-[#1A1A3F] border border-[#f2a93b]/30 rounded text-white"
                  required
                  placeholder="Skill you want to learn"
                />
              </div>
              <div>
                <label className="block mb-2 text-gray-300">Skill you give</label>
                <input
                  type="text"
                  value={newListing.giveSkill}
                  onChange={(e) => setNewListing({...newListing, giveSkill: e.target.value})}
                  className="w-full p-2 bg-[#1A1A3F] border border-[#f2a93b]/30 rounded text-white"
                  required
                  placeholder="Skill you can teach"
                />
              </div>
              <div>
                <label className="block mb-2 text-gray-300">Experience</label>
                <select
                  value={newListing.experience}
                  onChange={(e) => setNewListing({...newListing, experience: e.target.value})}
                  className="w-full p-2 bg-[#1A1A3F] border border-[#f2a93b]/30 rounded text-white"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Proficient">Proficient</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 text-gray-300">Location</label>
                <input
                  type="text"
                  value={newListing.location}
                  onChange={(e) => setNewListing({...newListing, location: e.target.value})}
                  className="w-full p-2 bg-[#1A1A3F] border border-[#f2a93b]/30 rounded text-white"
                  placeholder="Your location (e.g., City, Country)"
                />
              </div>
              <div>
                <label className="block mb-2 text-gray-300">Description</label>
                <textarea
                  value={newListing.description}
                  onChange={(e) => setNewListing({...newListing, description: e.target.value})}
                  className="w-full p-2 bg-[#1A1A3F] border border-[#f2a93b]/30 rounded text-white"
                  required
                  placeholder="Describe your skill exchange request"
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-[#f2a93b]/30 rounded-lg hover:bg-[#1A1A3F] text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#f2a93b] text-white px-4 py-2 rounded-lg hover:bg-[#d98f2f]"
                >
                  Create Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>

      {/* Request Dialog */}
      <Dialog
        open={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-[#111122] rounded-lg max-w-md w-full mx-4 p-6 text-white">
            <Dialog.Title className="text-lg font-medium mb-4 text-[#f2a93b]">Send Match Request</Dialog.Title>
            
            <form onSubmit={createRequest} className="space-y-4">
              <div>
                <label className="block mb-2 text-gray-300">Your Name</label>
                <input
                  type="text"
                  value={request.senderName}
                  onChange={(e) => setRequest({...request, senderName: e.target.value})}
                  className="w-full p-2 bg-[#1A1A3F] border border-[#f2a93b]/30 rounded text-white"
                  required
                  placeholder="Enter your name"
                  disabled={!!userProfile?.name}
                />
              </div>
              <div>
                <label className="block mb-2 text-gray-300">Your Swap Conditions</label>
                <textarea
                  value={request.swapConditions}
                  onChange={(e) => setRequest({...request, swapConditions: e.target.value})}
                  className="w-full p-2 bg-[#1A1A3F] border border-[#f2a93b]/30 rounded text-white"
                  required
                  placeholder="Describe your availability, preferred learning method, and any other conditions"
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsRequestOpen(false)}
                  className="px-4 py-2 border border-[#f2a93b]/30 rounded-lg hover:bg-[#1A1A3F] text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#f2a93b] text-white px-4 py-2 rounded-lg hover:bg-[#d98f2f]"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>
    </div>
  )
}