import React, { useState, useEffect } from 'react';
import { Users, Plus, BookOpen, Film, Search } from 'lucide-react';
import { MovieService } from '../services/movieService';
import { CreateClubModal } from './CreateClubModal';

export const CommunityView = ({ onSelectClub }: any) => {
  const [clubs, setClubs] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'members' | 'createdAt'>('createdAt');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    MovieService.seedClubs(); // Seed test clubs if empty
    const unsub = MovieService.getClubs((data) => setClubs(data));
    return () => unsub();
  }, []);

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    club.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedClubs = [...filteredClubs].sort((a, b) => {
    if (sortBy === 'members') {
      return (b.members?.length || 0) - (a.members?.length || 0);
    }
    if (sortBy === 'createdAt') {
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    }
    return 0;
  });

  return (
    <div className="p-4 pt-16 md:pt-4 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Сообщества</h2>
          <button onClick={() => setIsCreateModalOpen(true)} className="bg-indigo-600 text-white p-2 rounded-full">
            <Plus className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск сообществ..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="p-2 rounded-xl border text-sm bg-white"
          >
            <option value="createdAt">Новые</option>
            <option value="members">Популярные</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sortedClubs.map((club: any) => (
          <div key={club.id} onClick={() => onSelectClub(club)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              {club.type === 'film' ? <Film className="w-6 h-6 text-blue-500" /> : <BookOpen className="w-6 h-6 text-green-500" />}
              <h3 className="font-bold text-lg">{club.name}</h3>
            </div>
            <p className="text-gray-600 text-sm mb-2">{club.description}</p>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <Users className="w-4 h-4" />
              <span>{club.members?.length || 0} участников</span>
            </div>
          </div>
        ))}
      </div>

      {isCreateModalOpen && <CreateClubModal onClose={() => setIsCreateModalOpen(false)} />}
    </div>
  );
};
