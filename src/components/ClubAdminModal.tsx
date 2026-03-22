import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MovieService } from '../services/movieService';

export const ClubAdminModal = ({ club, onClose }: any) => {
  const [rules, setRules] = useState(club.rules || '');

  const handleUpdateRules = async () => {
    await MovieService.updateClubRules(club.id, rules);
    onClose();
  };

  const handleChangeRole = async (userId: string, role: 'admin' | 'moderator' | 'member') => {
    await MovieService.updateMemberRole(club.id, userId, role);
  };

  const handleRemoveMember = async (userId: string) => {
    await MovieService.removeMember(club.id, userId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white p-6 rounded-2xl w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Администрирование</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <textarea value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Правила клуба" className="w-full p-3 rounded-2xl border mb-4" />
        <button onClick={handleUpdateRules} className="w-full bg-indigo-600 text-white p-3 rounded-2xl font-bold mb-4">Сохранить правила</button>
        
        <h3 className="font-bold mb-2">Участники</h3>
        <div className="space-y-2">
          {club.members.map((m: any) => (
            <div key={m.userId} className="flex items-center justify-between p-2 border rounded-xl">
              <span>{m.userId}</span>
              <div className="flex gap-2">
                <select value={m.role} onChange={(e) => handleChangeRole(m.userId, e.target.value as any)} className="p-1 rounded border">
                  <option value="admin">Админ</option>
                  <option value="moderator">Модератор</option>
                  <option value="member">Участник</option>
                </select>
                <button onClick={() => handleRemoveMember(m.userId)} className="text-red-500"><X /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
