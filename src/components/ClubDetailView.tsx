import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, X, Settings, Users, Circle, Shield, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MovieService } from '../services/movieService';
import { ClubAdminModal } from './ClubAdminModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ClubDetailView = ({ club, onClose }: any) => {
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    const unsubDiscussions = MovieService.getClubDiscussions(club.id, (data) => setDiscussions(data));
    const unsubMembers = MovieService.getClubMembers(club.id, (data) => setMembers(data));
    return () => {
      unsubDiscussions();
      unsubMembers();
    };
  }, [club.id]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await MovieService.addDiscussion(club.id, message);
    setMessage('');
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'editor': return 'Главный редактор';
      case 'owner': return 'Создатель';
      default: return 'Участник';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-surface z-[100] flex flex-col md:flex-row overflow-hidden"
    >
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div className="p-8 flex justify-between items-center bg-surface/80 backdrop-blur-2xl sticky top-0 z-20 border-b border-on-surface/5">
          <div className="flex items-center gap-8">
            <button onClick={onClose} className="p-4 hover:bg-surface-container rounded-2xl transition-all active:scale-95 group">
              <X className="w-6 h-6 text-on-surface/40 group-hover:text-on-surface transition-colors" />
            </button>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Сообщество</span>
                <span className="w-1 h-1 bg-primary/30 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface/30">Клуб</span>
              </div>
              <h2 className="text-4xl font-display font-black tracking-tighter uppercase truncate max-w-[200px] md:max-w-xl leading-none">{club.name}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowMembers(!showMembers)} 
              className={cn(
                "p-5 rounded-[2rem] transition-all active:scale-95 flex items-center gap-3",
                showMembers ? "bg-primary text-on-primary shadow-2xl shadow-primary/30" : "bg-surface-container text-on-surface/40 hover:bg-surface-container-high"
              )}
            >
              <Users className="w-6 h-6" />
              <span className="hidden md:block text-xs font-black uppercase tracking-widest">Участники</span>
            </button>
            <button 
              onClick={() => setIsAdminModalOpen(true)} 
              className="p-5 bg-surface-container text-on-surface/40 hover:bg-surface-container-high rounded-[2rem] transition-all active:scale-95"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 p-8 space-y-10 overflow-y-auto bg-surface no-scrollbar pb-32">
          <AnimatePresence mode="popLayout">
            {discussions.map((d: any, idx) => (
              <motion.div 
                key={d.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex flex-col gap-3 max-w-[85%] md:max-w-[70%]"
              >
                <div className="flex items-center gap-4 px-4">
                  <div className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center text-[10px] font-black uppercase text-on-surface/40">
                    {d.userName?.[0] || '?'}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-[10px] uppercase tracking-widest text-on-surface/60">{d.userName}</span>
                    <span className="text-[9px] font-bold text-on-surface/20 uppercase tracking-tighter">
                      {d.createdAt?.toDate ? d.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Только что'}
                    </span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-6 rounded-[2.5rem] rounded-tl-none shadow-sm border border-on-surface/5 hover:border-primary/10 transition-colors">
                  <p className="text-sm text-on-surface/80 leading-relaxed font-medium">{d.text}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {discussions.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30">
              <MessageSquare className="w-16 h-16" />
              <p className="font-display font-black uppercase tracking-widest text-sm">Начните обсуждение первым</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-surface via-surface to-transparent pointer-events-none">
          <div className="max-w-4xl mx-auto flex gap-4 pointer-events-auto">
            <div className="flex-1 relative group">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Написать в обсуждение..."
                className="w-full p-6 bg-surface-container-lowest rounded-[2.5rem] border border-on-surface/5 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-sm shadow-2xl shadow-on-surface/5"
              />
            </div>
            <button 
              onClick={handleSendMessage} 
              disabled={!message.trim()}
              className="bg-primary text-on-primary p-6 rounded-[2.5rem] hover:scale-105 transition-all shadow-2xl shadow-primary/30 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar for members */}
      <AnimatePresence>
        {showMembers && (
          <motion.div 
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="md:relative fixed inset-0 md:inset-auto md:flex flex-col w-full md:w-96 bg-surface-container-low h-full overflow-hidden border-l border-on-surface/5 z-50"
          >
            <div className="p-10 flex justify-between items-center border-b border-on-surface/5">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Сообщество</span>
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter flex items-center gap-4">
                  Участники
                  <span className="text-primary bg-primary/10 px-3 py-1 rounded-xl text-xs font-black">{members.length}</span>
                </h3>
              </div>
              <button onClick={() => setShowMembers(false)} className="p-4 hover:bg-surface-container rounded-2xl transition-all active:scale-95">
                <X className="w-6 h-6 text-on-surface/40" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {members.map((member: any) => (
                <div key={member.userId} className="flex items-center gap-5 p-5 rounded-[2.5rem] hover:bg-surface-container-lowest transition-all group cursor-default border border-transparent hover:border-on-surface/5">
                  <div className="relative shrink-0">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt="" className="w-14 h-14 rounded-[1.5rem] object-cover border-2 border-surface shadow-md" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-14 h-14 rounded-[1.5rem] bg-primary/5 text-primary flex items-center justify-center font-display font-black text-xl border-2 border-surface shadow-md">
                        {member.displayName ? member.displayName[0].toUpperCase() : '?'}
                      </div>
                    )}
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-surface shadow-sm",
                      member.isOnline ? "bg-secondary" : "bg-on-surface/10"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-display font-black text-base uppercase tracking-tight truncate group-hover:text-primary transition-colors leading-none">{member.displayName}</p>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest flex items-center gap-1.5",
                        member.role === 'owner' ? "bg-secondary/10 text-secondary" : 
                        member.role === 'admin' ? "bg-error/10 text-error" : 
                        member.role === 'editor' ? "bg-primary/10 text-primary" : "bg-on-surface/5 text-on-surface/40"
                      )}>
                        {member.role === 'owner' && <Shield className="w-2.5 h-2.5" />}
                        {getRoleLabel(member.role)}
                      </span>
                      {!member.isOnline && member.lastSeen && (
                        <span className="text-[9px] font-bold uppercase tracking-tighter text-on-surface/20">
                          {member.lastSeen.toDate ? member.lastSeen.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isAdminModalOpen && <ClubAdminModal club={club} onClose={() => setIsAdminModalOpen(false)} />}
    </motion.div>
  );
};
