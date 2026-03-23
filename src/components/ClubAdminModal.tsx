import React, { useState } from 'react';
import { X, Shield, UserMinus, UserPlus, Save, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MovieService } from '../services/movieService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ClubAdminModal = ({ club, onClose }: any) => {
  const [rules, setRules] = useState(club.rules || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateRules = async () => {
    setIsSubmitting(true);
    try {
      await MovieService.updateClubRules(club.id, rules);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeRole = async (userId: string, role: 'admin' | 'editor' | 'member') => {
    try {
      await MovieService.updateMemberRole(club.id, userId, role);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого участника?')) return;
    try {
      await MovieService.removeMember(club.id, userId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-surface w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-on-surface/5 flex flex-col max-h-[90vh]"
      >
        <div className="p-10 flex justify-between items-center border-b border-on-surface/5">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Администрирование</span>
            <h2 className="text-3xl font-display font-black tracking-tighter uppercase">Настройки клуба</h2>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-surface-container rounded-2xl transition-all active:scale-95 group">
            <X className="w-6 h-6 text-on-surface/40 group-hover:text-on-surface transition-colors" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
          {/* Rules Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-widest text-on-surface/60">Правила клуба</h3>
            </div>
            <textarea 
              value={rules} 
              onChange={(e) => setRules(e.target.value)} 
              placeholder="Опишите правила вашего сообщества..." 
              className="w-full p-8 rounded-[2rem] bg-surface-container-lowest border border-on-surface/5 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-sm min-h-[150px] resize-none" 
            />
            <button 
              onClick={handleUpdateRules} 
              disabled={isSubmitting}
              className="btn-primary w-full py-5 rounded-[2rem] flex items-center justify-center gap-3"
            >
              <Save className="w-5 h-5" />
              <span>Сохранить правила</span>
            </button>
          </section>
          
          {/* Members Management */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-widest text-on-surface/60">Управление участниками</h3>
            </div>
            <div className="space-y-4">
              {club.members.map((m: any) => (
                <div key={m.userId} className="flex items-center justify-between p-6 bg-surface-container-lowest rounded-[2rem] border border-on-surface/5 group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-xs font-black uppercase text-on-surface/40">
                      {m.displayName?.[0] || m.userId[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-display font-black text-sm uppercase tracking-tight">{m.displayName || 'Участник'}</p>
                      <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-widest">{m.role}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <select 
                      value={m.role} 
                      onChange={(e) => handleChangeRole(m.userId, e.target.value as any)} 
                      className="bg-surface-container px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-none focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                    >
                      <option value="member">Участник</option>
                      <option value="editor">Редактор</option>
                      <option value="admin">Админ</option>
                    </select>
                    <button 
                      onClick={() => handleRemoveMember(m.userId)} 
                      className="p-3 text-error/40 hover:text-error hover:bg-error/5 rounded-xl transition-all active:scale-95"
                      title="Удалить из клуба"
                    >
                      <UserMinus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
};
