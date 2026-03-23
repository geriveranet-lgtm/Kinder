import React, { useState } from 'react';
import { Search, Star, Plus, Film, BookOpen, X, Heart, MessageSquare, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { MovieService } from '../services/movieService';
import { cn } from '../lib/utils';

export const ReviewsView = ({ reviews, movies, books, onAddContent, onContentClick }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [contentSearchTerm, setContentSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'book'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'likes' | 'rating'>('createdAt');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredReviews = reviews.filter((review: any) => {
    const matchesSearch = (review.contentTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || review.contentType === filterType;
    return matchesSearch && matchesType;
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });

  const handleLike = async (review: any) => {
    await MovieService.likeReview(review.id, review.userId);
  };

  return (
    <div className="p-6 pt-20 md:pt-6 space-y-10">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Мнения</span>
            <h2 className="text-5xl font-display font-black tracking-tighter uppercase">Рецензии</h2>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
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
              placeholder="Поиск рецензий..."
              className="w-full pl-12 pr-6 py-4 rounded-3xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-on-surface/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {['all', 'movie', 'book'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={cn(
                  "chip",
                  filterType === type ? "chip-active" : "chip-inactive"
                )}
              >
                {type === 'all' ? 'Все' : type === 'movie' ? 'Фильмы' : 'Книги'}
              </button>
            ))}
          </div>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-6 py-4 rounded-3xl bg-surface-container-low border-none text-sm font-black uppercase tracking-widest text-on-surface/60 focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
          >
            <option value="createdAt">Новые</option>
            <option value="likes">По лайкам</option>
            <option value="rating">По рейтингу</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {sortedReviews.map((review: any) => {
          const content = [...movies, ...books].find(c => c.id === review.contentId);
          const userTitle = MovieService.getUserTitle(review.userReviewCount || 0);
          
          return (
            <motion.div 
              key={review.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm hover:shadow-2xl hover:shadow-on-surface/5 transition-all group"
            >
              <div className="flex items-start gap-6 mb-6">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center font-display font-black text-xl text-primary border-2 border-surface">
                    {review.userName ? review.userName[0].toUpperCase() : '?'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-secondary rounded-full flex items-center justify-center border-2 border-surface">
                    <Award className="w-3 h-3 text-on-secondary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-display font-black text-xl tracking-tight uppercase truncate">{review.userName}</p>
                    <span className={cn(
                      "text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest",
                      MovieService.getTitleColor(userTitle)
                    )}>
                      {userTitle}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface/40 font-medium">
                    Рецензия на:{' '}
                    <span 
                      className={cn(
                        "font-black uppercase tracking-wider transition-colors",
                        content ? "text-primary cursor-pointer hover:text-primary/70" : "text-on-surface/60"
                      )}
                      onClick={() => content && onContentClick && onContentClick(content)}
                    >
                      {content?.title || review.contentTitle}
                    </span>
                  </p>
                </div>
                {content?.posterUrl && (
                  <img 
                    src={content.posterUrl} 
                    alt="" 
                    className="w-16 h-24 object-cover rounded-2xl shadow-lg group-hover:scale-105 transition-transform cursor-pointer" 
                    referrerPolicy="no-referrer" 
                    onClick={() => content && onContentClick && onContentClick(content)}
                  />
                )}
              </div>

              <div className="relative">
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/10 rounded-full" />
                <p className="text-on-surface/70 font-medium leading-relaxed mb-6 italic pl-4">"{review.comment}"</p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-on-surface/5">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={cn(
                      "w-5 h-5 transition-colors",
                      star <= review.rating ? "text-secondary fill-secondary" : "text-on-surface/10"
                    )} />
                  ))}
                </div>
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => {
                      const text = prompt('Ваш комментарий к отзыву:');
                      if (text && content) MovieService.addComment(content.id, content.type, text, review.id, review.userId);
                    }}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-on-surface/40 hover:text-primary transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>{review.commentCount || 0}</span>
                  </button>
                  <button 
                    onClick={() => handleLike(review)} 
                    className={cn(
                      "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors",
                      review.likes > 0 ? "text-error" : "text-on-surface/40 hover:text-error"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", review.likes > 0 && "fill-error")} />
                    <span>{review.likes || 0}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={() => setIsModalOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-display font-black tracking-tighter uppercase">Найти контент</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X /></button>
            </div>
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface/30" />
              <input
                type="text"
                placeholder="Название фильма или книги..."
                className="w-full pl-12 pr-6 py-4 rounded-3xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-on-surface/30"
                value={contentSearchTerm}
                onChange={(e) => setContentSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 space-y-4 pr-2 no-scrollbar">
              {contentSearchTerm.trim() === '' ? (
                <div className="flex flex-col items-center justify-center py-12 text-on-surface/30 space-y-4">
                  <Search className="w-12 h-12 opacity-20" />
                  <p className="font-display font-black uppercase tracking-widest text-xs">Введите название для поиска</p>
                </div>
              ) : (
                [...movies, ...books]
                  .filter(c => c.title.toLowerCase().includes(contentSearchTerm.toLowerCase()))
                  .slice(0, 20)
                  .map(content => (
                    <motion.div 
                      key={content.id} 
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-4 p-4 hover:bg-surface-container rounded-[1.5rem] cursor-pointer transition-all group"
                      onClick={() => {
                        setIsModalOpen(false);
                        setContentSearchTerm('');
                        if (onContentClick) onContentClick(content);
                      }}
                    >
                      <div className="relative w-16 h-24 flex-shrink-0">
                        {content.posterUrl ? (
                          <img src={content.posterUrl} alt="" className="w-full h-full object-cover rounded-xl shadow-md" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-surface-container-high rounded-xl flex items-center justify-center">
                            {content.type === 'movie' ? <Film className="w-6 h-6 text-on-surface/20" /> : <BookOpen className="w-6 h-6 text-on-surface/20" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-black text-xl tracking-tight uppercase group-hover:text-primary transition-colors truncate">{content.title}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface/40 mt-1">{content.releaseYear} • {content.type === 'movie' ? 'Фильм' : 'Книга'}</p>
                      </div>
                    </motion.div>
                  ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
