import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MovieService } from '../services/movieService';

export const CreateClubModal = ({ onClose }: any) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'book' | 'film'>('book');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await MovieService.createClub(name, description, type);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Создать клуб</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Название клуба" className="w-full p-3 rounded-2xl border mb-2" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание" className="w-full p-3 rounded-2xl border mb-2" />
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-3 rounded-2xl border mb-4">
          <option value="book">Книжный</option>
          <option value="film">Кино</option>
        </select>
        <button onClick={handleCreate} className="w-full bg-indigo-600 text-white p-3 rounded-2xl font-bold">Создать</button>
      </div>
    </div>
  );
};
