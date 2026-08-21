import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  X,
  User,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  Shield,
  Trash2,
  Image as ImageIcon,
  Paperclip,
  Upload,
  Link,
  Maximize2,
  ExternalLink,
  Download,
  Phone,
  Mic
} from 'lucide-react';
import { UserProfile, DirectMessage, SUPER_ADMIN_EMAIL } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { VoiceNoteRecorder, VoiceNotePlayer } from './VoiceNotes';

interface DirectMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedUserId?: string | null;
}

export const DirectMessagesModal: React.FC<DirectMessagesModalProps> = ({
  isOpen,
  onClose,
  initialSelectedUserId,
}) => {
  const {
    currentUser,
    users,
    directMessages,
    sendDirectMessage,
    sendDirectVoiceMessage,
    markConversationAsRead,
    deleteDirectMessage,
    initiateVoiceCall,
  } = usePitchStore();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialSelectedUserId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [urlInputText, setUrlInputText] = useState('');
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Set initial selected user if passed
  useEffect(() => {
    if (initialSelectedUserId) {
      setSelectedUserId(initialSelectedUserId);
    } else if (!selectedUserId && users.length > 1) {
      const otherUser = users.find((u) => u.id !== currentUser.id);
      if (otherUser) {
        setSelectedUserId(otherUser.id);
      }
    }
  }, [initialSelectedUserId, currentUser.id, users]);

  // Mark conversation as read
  useEffect(() => {
    if (selectedUserId && isOpen) {
      markConversationAsRead(selectedUserId);
    }
  }, [selectedUserId, directMessages, isOpen]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedUserId, directMessages, attachedImage]);

  if (!isOpen) return null;

  const otherUsers = users.filter((u) => u.id !== currentUser.id);
  const filteredUsers = otherUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  // Filter messages between current user and selected user
  const conversationMessages = directMessages
    .filter(
      (m) =>
        (m.senderId === currentUser.id && m.receiverId === selectedUserId) ||
        (m.senderId === selectedUserId && m.receiverId === currentUser.id)
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && !attachedImage) || !selectedUserId) return;

    await sendDirectMessage(selectedUserId, messageInput.trim(), attachedImage || undefined);
    setMessageInput('');
    setAttachedImage(null);
    setIsUrlInputOpen(false);
    setUrlInputText('');
  };

  const handleSendVoiceNote = async (audioUrl: string, durationSeconds: number) => {
    if (!selectedUserId) return;
    await sendDirectVoiceMessage(selectedUserId, audioUrl, durationSeconds);
  };

  const handleStartCall = () => {
    if (!selectedUserId) return;
    initiateVoiceCall(selectedUserId);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setAttachedImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddUrlImage = () => {
    if (!urlInputText.trim()) return;
    setAttachedImage(urlInputText.trim());
    setIsUrlInputOpen(false);
    setUrlInputText('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          setAttachedImage(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
        <div
          id="direct-messages-modal"
          className="w-full max-w-5xl h-[90vh] sm:h-[84vh] bg-[#0E1526] border border-[#1E293B] rounded-3xl shadow-2xl flex overflow-hidden text-white relative"
        >
          {/* Left Sidebar: User List */}
          <div className="w-full max-w-[280px] sm:max-w-[320px] bg-[#090D16] border-r border-[#1E293B] flex flex-col h-full shrink-0">
            {/* Header & Search */}
            <div className="p-4 border-b border-[#1E293B] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black font-display text-white">Direct Messages</h3>
                    <p className="text-[10px] text-slate-400">Teammate Voice & Chat</p>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search teammates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#0E1526] border border-[#1E293B] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Teammates List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]/40">
              {filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No teammates found matching query.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = u.id === selectedUserId;
                  // Get unread count from this specific user
                  const unreadFromUser = directMessages.filter(
                    (m) => m.senderId === u.id && m.receiverId === currentUser.id && !m.read
                  ).length;

                  // Get latest message
                  const userMessages = directMessages
                    .filter(
                      (m) =>
                        (m.senderId === currentUser.id && m.receiverId === u.id) ||
                        (m.senderId === u.id && m.receiverId === currentUser.id)
                    )
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                  const lastMsg = userMessages[0];

                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full p-3.5 flex items-center gap-3 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#131C31] border-l-4 border-emerald-500'
                          : 'hover:bg-[#0E1526]'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover border border-[#1E293B]"
                          referrerPolicy="no-referrer"
                        />
                        {u.isAdmin && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center text-[9px] font-black">
                            ★
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-white truncate block">
                            {u.name}
                          </span>
                          {lastMsg && (
                            <span className="text-[10px] text-slate-500">
                              {new Date(lastMsg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                            {lastMsg ? (
                              lastMsg.audioUrl ? (
                                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                  <Mic className="w-3 h-3" /> Voice Note
                                </span>
                              ) : lastMsg.imageUrl ? (
                                <span className="flex items-center gap-1 text-blue-400">
                                  <ImageIcon className="w-3 h-3" /> Photo
                                </span>
                              ) : (
                                lastMsg.text
                              )
                            ) : (
                              'Ready to play'
                            )}
                          </p>

                          {unreadFromUser > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-black shrink-0">
                              {unreadFromUser}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom Current Profile Tag */}
            <div className="p-3 bg-[#0E1526] border-t border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-emerald-500 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="truncate text-xs">
                  <span className="font-bold text-slate-200 block truncate">{currentUser.name}</span>
                  <span className="text-[10px] text-emerald-400">Connected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Active Chat Thread */}
          <div
            className="flex-1 flex flex-col bg-[#0E1526] h-full min-w-0 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag & Drop overlay */}
            {isDraggingOver && (
              <div className="absolute inset-0 z-30 bg-emerald-950/80 border-2 border-dashed border-emerald-400 flex flex-col items-center justify-center text-emerald-300 backdrop-blur-sm">
                <Upload className="w-12 h-12 mb-2 animate-bounce" />
                <p className="text-sm font-bold">Drop Image to Share in Chat</p>
                <p className="text-xs text-emerald-400/80">Supports JPG, PNG, GIF, WebP</p>
              </div>
            )}

            {selectedUser ? (
              <>
                {/* Chat Thread Header */}
                <div className="p-3.5 sm:p-4 border-b border-[#1E293B] bg-[#0E1526] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={selectedUser.name}
                      className="w-9 h-9 rounded-full object-cover border border-emerald-500/40"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white font-display">
                          {selectedUser.name}
                        </h4>
                        {selectedUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Super Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active Player
                      </span>
                    </div>
                  </div>

                  {/* Header Actions: Live Voice Call + Close */}
                  <div className="flex items-center gap-2">
                    <button
                      id="start-voice-call-btn"
                      type="button"
                      onClick={handleStartCall}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition-all cursor-pointer"
                      title={`Start Voice Call with ${selectedUser.name}`}
                    >
                      <Phone className="w-3.5 h-3.5 fill-current" />
                      <span className="hidden sm:inline">Voice Call</span>
                    </button>

                    <button
                      onClick={onClose}
                      className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Chat Message Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#090D16]/40">
                  {conversationMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-semibold text-slate-300">
                        Start a direct conversation with {selectedUser.name}!
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Coordinate match timings, team bib colors, send voice notes, or launch a live voice call.
                      </p>
                    </div>
                  ) : (
                    conversationMessages.map((msg) => {
                      const isMine = msg.senderId === currentUser.id;
                      const msgTime = new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 group ${
                            isMine ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {!isMine && (
                            <img
                              src={selectedUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={selectedUser.name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0 mb-1"
                              referrerPolicy="no-referrer"
                            />
                          )}

                          <div
                            className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-2.5 text-xs relative shadow-md space-y-2 ${
                              isMine
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-[#131C31] text-slate-200 border border-[#1E293B] rounded-bl-none'
                            }`}
                          >
                            {/* Voice Note Player */}
                            {msg.audioUrl && (
                              <VoiceNotePlayer
                                audioUrl={msg.audioUrl}
                                durationSeconds={msg.audioDuration}
                                isSender={isMine}
                              />
                            )}

                            {/* Attached Image Thumbnail */}
                            {msg.imageUrl && (
                              <div className="relative rounded-xl overflow-hidden border border-black/20 bg-black/40 group/img">
                                <img
                                  src={msg.imageUrl}
                                  alt="Chat attachment"
                                  onClick={() => setActiveLightboxImage(msg.imageUrl || null)}
                                  className="w-full max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600';
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setActiveLightboxImage(msg.imageUrl || null)}
                                  className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                                  title="View full size"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  <span className="text-[10px]">Expand</span>
                                </button>
                              </div>
                            )}

                            {/* Message Text */}
                            {msg.text && (
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            )}

                            {/* Message Timestamp & Status */}
                            <div
                              className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${
                                isMine ? 'text-blue-200' : 'text-slate-400'
                              }`}
                            >
                              <span>{msgTime}</span>
                              {isMine && (
                                <span>
                                  {msg.read ? (
                                    <CheckCheck className="w-3 h-3 text-emerald-300 inline" />
                                  ) : (
                                    <Check className="w-3 h-3 text-blue-200 inline" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {isMine && (
                            <button
                              onClick={() => deleteDirectMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 transition-opacity cursor-pointer mb-1"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Image Upload / URL Preview Bar */}
                {attachedImage && (
                  <div className="p-3 bg-[#090D16] border-t border-[#1E293B] flex items-center gap-3 animate-in fade-in">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-emerald-500 shrink-0">
                      <img
                        src={attachedImage}
                        alt="Attachment preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setAttachedImage(null)}
                        className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 hover:bg-rose-600 text-white cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-xs text-slate-300">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" /> Image attached
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Type an optional caption below and click send.
                      </p>
                    </div>
                  </div>
                )}

                {/* Paste Image URL Input Dialog */}
                {isUrlInputOpen && (
                  <div className="p-3 bg-[#090D16] border-t border-[#1E293B] flex items-center gap-2 animate-in fade-in">
                    <Link className="w-4 h-4 text-emerald-400 shrink-0" />
                    <input
                      type="url"
                      placeholder="Paste image URL (https://...)"
                      value={urlInputText}
                      onChange={(e) => setUrlInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddUrlImage();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-[#0E1526] border border-[#1E293B] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddUrlImage}
                      disabled={!urlInputText.trim()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Attach
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUrlInputOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Message Input Box & Voice Controls */}
                <div className="p-3 bg-[#0E1526] border-t border-[#1E293B] space-y-2">
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-center gap-2"
                  >
                    {/* Hidden File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />

                    {/* Device Image Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-2xl bg-[#090D16] hover:bg-[#131C31] border border-[#1E293B] text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                      title="Upload image from device"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Image URL Link Button */}
                    <button
                      type="button"
                      onClick={() => setIsUrlInputOpen(!isUrlInputOpen)}
                      className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
                        isUrlInputOpen
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-[#090D16] hover:bg-[#131C31] border-[#1E293B] text-slate-400 hover:text-emerald-400'
                      }`}
                      title="Attach image from URL link"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    {/* Voice Note Recorder Button */}
                    <VoiceNoteRecorder
                      compact
                      onSendVoiceNote={handleSendVoiceNote}
                    />

                    {/* Text Input */}
                    <input
                      type="text"
                      placeholder={`Message ${selectedUser.name}...`}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={!messageInput.trim() && !attachedImage}
                      className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-2xl transition-all shadow-md shadow-emerald-950 cursor-pointer"
                      title="Send Message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center p-6 text-xs text-slate-500">
                Select a player to open direct chat
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox / Fullscreen Image Preview Modal */}
      {activeLightboxImage && (
        <div
          id="image-lightbox-modal"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setActiveLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#0E1526] border border-[#1E293B] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-[#090D16] border-b border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Shared Match Media Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeLightboxImage}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setActiveLightboxImage(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-center bg-black/60 overflow-auto">
              <img
                src={activeLightboxImage}
                alt="Enlarged view"
                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
