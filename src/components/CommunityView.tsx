import React, { useState, useEffect } from 'react';
import { Users, Plus, BookOpen, Film, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { MovieService } from '../services/movieService';
import { CreateClubModal } from './CreateClubModal';
import { cn } from '../lib/utils';

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
    <div className="p-6 pt-20 md:pt-6 space-y-10">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Сообщество</span>
            <h2 className="text-5xl font-display font-black tracking-tighter uppercase">Клубы</h2>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="btn-primary p-4 rounded-2xl shadow-xl shadow-primary/20"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface/30 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Поиск сообществ..."
              className="w-full pl-12 pr-6 py-4 rounded-3xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-on-surface/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-6 py-4 rounded-3xl bg-surface-container-low border-none text-sm font-black uppercase tracking-widest text-on-surface/60 focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
          >
            <option value="createdAt">Новые</option>
            <option value="members">Популярные</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {sortedClubs.map((club: any) => (
          <motion.div 
            key={club.id} 
            onClick={() => onSelectClub(club)} 
            whileHover={{ y: -4 }}
            className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm hover:shadow-2xl hover:shadow-on-surface/5 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-2xl transition-colors",
                  club.type === 'film' ? "bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white" : "bg-green-50 text-green-500 group-hover:bg-green-500 group-hover:text-white"
                )}>
                  {club.type === 'film' ? <Film className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                </div>
                <h3 className="font-display font-black text-2xl tracking-tight">{club.name}</h3>
              </div>
              <div className="flex items-center gap-2 text-on-surface/30 text-[10px] font-black uppercase tracking-widest">
                <Users className="w-4 h-4" />
                <span>{club.members?.length || 0}</span>
              </div>
            </div>
            <p className="text-on-surface/60 font-medium leading-relaxed mb-6">{club.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-surface-container flex items-center justify-center text-[10px] font-bold">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
                {club.members?.length > 3 && (
                  <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-surface-container-high flex items-center justify-center text-[10px] font-bold">
                    +{club.members.length - 3}
                  </div>
                )}
              </div>
              {!club.members?.some((m: any) => m.userId === MovieService.getCurrentUserId()) && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    MovieService.joinClub(club.id);
                  }}
                  className="btn-primary text-[10px] px-6 py-2 uppercase tracking-[0.2em]"
                >
                  Вступить
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {isCreateModalOpen && <CreateClubModal onClose={() => setIsCreateModalOpen(false)} />}
    </div>
  );
};
