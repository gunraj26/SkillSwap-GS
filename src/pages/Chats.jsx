import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/AuthContext'

export default function Chats() {
  const { user } = useAuth()
  const [chatRooms, setChatRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (user) {
      fetchChatRooms()
      
      const roomsSubscription = supabase
        .channel('chat_rooms_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'chat_rooms',
            filter: `participant1_id=eq.${user.id}`,
          }, 
          fetchChatRooms
        )
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'chat_rooms',
            filter: `participant2_id=eq.${user.id}`,
          }, 
          fetchChatRooms
        )
        .subscribe()

      return () => {
        roomsSubscription.unsubscribe()
      }
    }
  }, [user])

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages()
      
      const messagesSubscription = supabase
        .channel('messages_changes')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `chat_room_id=eq.${selectedRoom.id}`,
          }, 
          payload => {
            setMessages(current => [...current, payload.new])
          }
        )
        .subscribe()

      return () => {
        messagesSubscription.unsubscribe()
      }
    }
  }, [selectedRoom])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function fetchChatRooms() {
    try {
      setIsLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          requests (
            sender_name,
            recipient_id,
            sender_id,
            listing_id,
            listings (
              name
            )
          )
        `)
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      
      setChatRooms(data || [])
    } catch (err) {
      console.error('Error fetching chat rooms:', err)
      setError('Failed to load chat rooms')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchMessages() {
    if (!selectedRoom) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', selectedRoom.id)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      setMessages(data || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Failed to load messages')
    }
  }

  async function sendMessage(e) {
    e.preventDefault()
    
    if (!newMessage.trim() || !selectedRoom) return
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            chat_room_id: selectedRoom.id,
            sender_id: user.id,
            content: newMessage.trim()
          }
        ])

      if (error) throw error
      
      setNewMessage('')
      fetchMessages()
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
    }
  }

  function getOtherParticipantName(chatRoom) {
    if (!chatRoom?.requests) return 'Unknown User'
    
    if (user.id === chatRoom.requests.sender_id) {
      return chatRoom.requests.listings?.name || 'Unknown User'
    } else {
      return chatRoom.requests.sender_name || 'Unknown User'
    }
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-[#f2a93b]">Please Log In</h1>
          <p className="text-gray-400">You need to be logged in to view your chats.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-[#f2a93b]">Chats</h1>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-800/50 text-red-300 p-4 rounded-lg mb-4"
        >
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chat Rooms List */}
        <div className="bg-[#111122] rounded-lg shadow-sm border border-[#f2a93b]/30 p-4">
          <h2 className="font-semibold mb-4 text-[#f2a93b]">Conversations</h2>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f2a93b]"></div>
            </div>
          ) : chatRooms.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No conversations yet</p>
          ) : (
            <div className="space-y-2">
              {chatRooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedRoom?.id === room.id
                      ? 'bg-[#1A1A3F] text-[#f2a93b]'
                      : 'hover:bg-[#1A1A3F]/50 text-gray-300'
                  }`}
                >
                  <div className="font-medium">{getOtherParticipantName(room)}</div>
                  <div className="text-sm text-gray-400">
                    {format(new Date(room.updated_at), 'MMM d, h:mm a')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="md:col-span-2">
          {selectedRoom ? (
            <div className="bg-[#111122] rounded-lg shadow-sm border border-[#f2a93b]/30 h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-[#f2a93b]/30">
                <h3 className="font-semibold text-[#f2a93b]">
                  {getOtherParticipantName(selectedRoom)}
                </h3>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender_id === user.id
                          ? 'bg-[#f2a93b] text-[#111122]'
                          : 'bg-[#1A1A3F] text-gray-300'
                      }`}
                    >
                      <p className="break-words">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === user.id
                          ? 'text-[#111122]/70'
                          : 'text-gray-400'
                      }`}>
                        {format(new Date(message.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-[#f2a93b]/30">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-2 bg-[#1A1A3F] border border-[#f2a93b]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f2a93b] text-gray-300 placeholder-gray-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-[#f2a93b] text-[#111122] px-4 py-2 rounded-lg hover:bg-[#d98f2f] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-[#111122] rounded-lg shadow-sm border border-[#f2a93b]/30 h-[600px] flex items-center justify-center text-gray-400">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  )
}