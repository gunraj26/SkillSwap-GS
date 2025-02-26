import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function Requests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [processingRequest, setProcessingRequest] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    fetchRequests()
    
    const subscription = supabase
      .channel('requests_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'requests',
          filter: `recipient_id=eq.${user.id}`,
        }, 
        fetchRequests
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'requests',
          filter: `sender_id=eq.${user.id}`,
        }, 
        fetchRequests
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user, navigate])

  async function fetchRequests() {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)
      
      // Use the request_details view to get all data in one query
      const { data, error } = await supabase
        .from('request_details')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setRequests(data || [])
    } catch (err) {
      console.error('Error fetching requests:', err)
      setError('Failed to load requests')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRequest(requestId, status, listingId) {
    if (!user || processingRequest) return

    try {
      setProcessingRequest(true)
      setError(null)

      // First, check if the request is still pending
      const { data: currentRequest, error: checkError } = await supabase
        .from('requests')
        .select('status')
        .eq('id', requestId)
        .single()

      if (checkError) throw checkError

      if (currentRequest.status !== 'pending') {
        throw new Error('This request has already been processed')
      }

      // Begin transaction-like operations
      if (status === 'accepted') {
        // 1. Update the current request status
        const { error: updateError } = await supabase
          .from('requests')
          .update({ status })
          .eq('id', requestId)
          .eq('status', 'pending')

        if (updateError) throw updateError

        // 2. Update other pending requests for this listing
        const { error: updateOtherRequestsError } = await supabase
          .from('requests')
          .update({ status: 'rejected' })
          .eq('listing_id', listingId)
          .eq('status', 'pending')
          .neq('id', requestId)

        if (updateOtherRequestsError) throw updateOtherRequestsError

        // 3. Create chat room
        const request = requests.find(r => r.id === requestId)
        const { error: chatError } = await supabase
          .from('chat_rooms')
          .insert([{
            participant1_id: request.sender_id,
            participant2_id: request.recipient_id,
            request_id: requestId
          }])

        if (chatError) throw chatError

        // 4. Delete the listing
        const { error: deleteError } = await supabase
          .from('listings')
          .delete()
          .eq('id', listingId)

        if (deleteError) throw deleteError
      } else {
        // For rejection, simply update the request status
        const { error: updateError } = await supabase
          .from('requests')
          .update({ status })
          .eq('id', requestId)
          .eq('status', 'pending')

        if (updateError) throw updateError
      }

      setSuccessMessage(status === 'accepted' ? 'Request accepted and chat room created!' : 'Request declined successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      
      await fetchRequests()
    } catch (err) {
      console.error('Error handling request:', err)
      setError(err.message || 'Failed to process request. Please try again.')
    } finally {
      setProcessingRequest(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-[#0A0A23] text-white">
      <h1 className="text-2xl font-bold mb-6">Skill Swap Requests</h1>

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
      ) : requests.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No requests found</p>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {requests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111122] p-6 rounded-lg shadow-sm border border-[#f2a93b]/50"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {request.sender_id === user.id ? (
                      <>
                        Request to{' '}
                        <Link
                          to={`/profile/${request.recipient_id}`}
                          className="text-[#f2a93b] hover:text-orange-300"
                        >
                          {request.recipient_profile_name || 'Unknown User'}
                        </Link>
                      </>
                    ) : (
                      <>
                        Request from{' '}
                        <Link
                          to={`/profile/${request.sender_id}`}
                          className="text-[#f2a93b] hover:text-orange-300"
                        >
                          {request.sender_profile_name || request.sender_name || 'Unknown User'}
                        </Link>
                      </>
                    )}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm ${
                    request.status === 'pending'
                      ? 'bg-[#f2a93b]/20 text-[#f2a93b]'
                      : request.status === 'accepted'
                      ? 'bg-green-800/50 text-green-400'
                      : 'bg-red-800/50 text-red-400'
                  }`}
                >
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-[#1A1A3F] p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-[#f2a93b]">Listing Details</h4>
                  <div className="space-y-2">
                    <p>
                      <span className="text-gray-400">Wants to learn:</span>{' '}
                      {request.listing_title}
                    </p>
                    <p>
                      <span className="text-gray-400">Can teach:</span>{' '}
                      {request.listing_skill_category}
                    </p>
                    <p>
                      <span className="text-gray-400">Experience:</span>{' '}
                      {request.listing_type}
                    </p>
                    <p>
                      <span className="text-gray-400">Description:</span>{' '}
                      {request.listing_description}
                    </p>
                  </div>
                </div>

                <div className="bg-[#1A1A3F] p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-[#f2a93b]">Swap Conditions</h4>
                  <p>{request.swap_conditions}</p>
                </div>

                {request.recipient_id === user.id && request.status === 'pending' && (
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleRequest(request.id, 'accepted', request.listing_id)}
                      disabled={processingRequest}
                      className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingRequest ? 'Processing...' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleRequest(request.id, 'rejected', request.listing_id)}
                      disabled={processingRequest}
                      className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingRequest ? 'Processing...' : 'Decline'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}