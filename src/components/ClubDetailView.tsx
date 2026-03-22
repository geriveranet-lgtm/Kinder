import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, X, Settings } from 'lucide-react';
import { MovieService } from '../services/movieService';
import { ClubAdminModal } from './ClubAdminModal';

export const ClubDetailView = ({ club, onClose }: any) => {
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    const unsub = MovieService.getClubDiscussions(club.id, (data) => setDiscussions(data));
    return () => unsub();
  }, [club.id]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await MovieService.addDiscussion(club.id, message);
    setMessage('');
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <button onClick={onClose}><X /></button>
        <h2 className="text-xl font-bold">{club.name}</h2>
        <button onClick={() => setIsAdminModalOpen(true)}><Settings /></button>
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {discussions.map((d: any) => (
          <div key={d.id} className="bg-gray-100 p-3 rounded-2xl">
            <p className="font-bold text-sm">{d.userName}</p>
            <p>{d.text}</p>
          </div>
        ))}
      </div>
      <div className="p-4 border-t flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Написать сообщение..."
          className="flex-1 p-3 rounded-2xl border"
        />
        <button onClick={handleSendMessage} className="bg-indigo-600 text-white p-3 rounded-2xl">
          <Send className="w-6 h-6" />
        </button>
      </div>
      {isAdminModalOpen && <ClubAdminModal club={club} onClose={() => setIsAdminModalOpen(false)} />}
    </div>
  );
};
