import React, { useState } from 'react';
import { Search, Star, Plus, Film, BookOpen, X, Heart } from 'lucide-react';
import { MovieService } from '../services/movieService';

export const ReviewsView = ({ reviews, movies, books, onAddContent }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
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
    <div className="p-4 space-y-6">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск рецензий..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white p-3 rounded-2xl">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'movie', 'book'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type as any)}
            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap ${filterType === type ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100'}`}
          >
            {type === 'all' ? 'Все' : type === 'movie' ? 'Фильмы' : 'Книги'}
          </button>
        ))}
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as any)}
          className="ml-auto px-4 py-2 rounded-full bg-gray-100 font-medium"
        >
          <option value="createdAt">Новые</option>
          <option value="likes">По лайкам</option>
          <option value="rating">По рейтингу</option>
        </select>
      </div>

      <div className="space-y-4">
        {sortedReviews.map((review: any) => {
          const content = [...movies, ...books].find(c => c.id === review.contentId);
          return (
            <div key={review.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  {review.userName[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold">{review.userName}</p>
                  <p className="text-sm text-gray-500">
                    Рецензия на: <span className="font-semibold text-gray-800">{content?.title || review.contentTitle}</span>
                  </p>
                </div>
                {content?.posterUrl && (
                  <img src={content.posterUrl} alt="" className="w-10 h-14 object-cover rounded ml-auto" referrerPolicy="no-referrer" />
                )}
                {!content?.posterUrl && (
                  <div className="ml-auto">
                    {review.contentType === 'movie' ? <Film className="w-5 h-5 text-blue-500" /> : <BookOpen className="w-5 h-5 text-green-500" />}
                  </div>
                )}
              </div>
              <p className="text-gray-700 mb-3">{review.comment}</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`w-5 h-5 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                ))}
                <button onClick={() => handleLike(review)} className="ml-auto flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors">
                  <Heart className={`w-5 h-5 ${review.likes > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                  {review.likes || 0}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Добавить рецензию</h2>
              <button onClick={() => setIsModalOpen(false)}><X /></button>
            </div>
            <p>Форма добавления контента будет здесь.</p>
          </div>
        </div>
      )}
    </div>
  );
};
