import React, { useState, useEffect, Component, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { 
  Heart, 
  X, 
  Trophy, 
  MessageSquare, 
  Image as ImageIcon, 
  Star, 
  TrendingUp, 
  Swords, 
  User,
  LogOut,
  ChevronRight,
  Sparkles,
  Send,
  Loader2,
  PlayCircle,
  Bookmark,
  RefreshCw,
  RotateCcw,
  ChevronLeft,
  BookOpen,
  Plus,
  Database,
  Settings,
  Edit2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, signIn, logOut, db } from './firebase';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { MovieService, Movie, Book, Content, Review, Comment, UserProfile, Collection, Message } from './services/movieService';
import { GeminiService } from './services/geminiService';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Navbar = ({ activeTab, onTabChange, user, isSyncing, onSync }: any) => {
  return (
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-50 md:top-0 md:bottom-auto md:px-12">
    <div className="hidden md:flex items-center gap-2 font-bold text-xl text-indigo-600">
      <Trophy className="w-6 h-6" />
      <span>КиноТиндер</span>
    </div>
    <div className="flex justify-around w-full md:w-auto md:gap-8">
      {[
        { id: 'swipe', icon: Heart, label: 'Свайп' },
        { id: 'battle', icon: Swords, label: 'Битва' },
        { id: 'ranking', icon: Trophy, label: 'Рейтинг' },
        { id: 'user-ranking', icon: User, label: 'Топ' },
        { id: 'suggestions', icon: Sparkles, label: 'Советы' },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            if (tab.id === 'profile' && !user) {
              console.log("Profile tab clicked, but no user. Calling signIn...");
              signIn().catch(err => console.error("Profile tab sign in error:", err));
              return;
            }
            onTabChange(tab.id);
          }}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 transition-colors",
            activeTab === tab.id ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <tab.icon className="w-6 h-6" />
          <span className="text-[10px] uppercase font-bold tracking-wider hidden md:block">{tab.label}</span>
        </button>
      ))}
    </div>
    <div className="fixed top-4 right-4 md:static flex items-center gap-4 z-50">
      {user ? (
        <div className="flex items-center gap-3 bg-white/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none px-3 py-2 md:p-0 rounded-full md:rounded-none shadow-sm md:shadow-none border border-gray-200 md:border-none">
          {user.email === "geriveranet@gmail.com" && (
            <button 
              onClick={onSync}
              disabled={isSyncing}
              className={cn(
                "text-xs px-2 py-1 rounded-md font-medium transition-colors flex items-center gap-1",
                isSyncing ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
              )}
              title="Sync Movies"
            >
              {isSyncing && <Loader2 className="w-3 h-3 animate-spin" />}
              {isSyncing ? "Syncing..." : "Sync"}
            </button>
          )}
          <button onClick={() => onTabChange('profile')} className="focus:outline-none">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-gray-200 hover:ring-2 hover:ring-indigo-500 transition-all object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border border-gray-200 hover:ring-2 hover:ring-indigo-500 transition-all">
                <User className="w-4 h-4" />
              </div>
            )}
          </button>
          <button onClick={logOut} className="text-gray-500 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <button 
          onClick={async () => {
            try {
              console.log("Navbar sign in button clicked");
              await signIn();
              console.log("Navbar sign in call finished");
            } catch (err) {
              console.error("Navbar sign in error:", err);
            }
          }} 
          className="bg-indigo-600 text-white px-4 py-2 rounded-full md:rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm md:shadow-none"
        >
          Войти
        </button>
      )}
    </div>
  </nav>
  );
};

const SwipeCard = ({ item, onSwipe }: { item: Content, onSwipe: (dir: 'like' | 'dislike' | 'not_watched') => void, key?: any }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacityLike = useTransform(x, [50, 150], [0, 1]);
  const opacityDislike = useTransform(x, [-150, -50], [1, 0]);
  const opacityNotWatched = useTransform(y, [-150, -50], [1, 0]);

  const [exitX, setExitX] = useState(0);
  const [exitY, setExitY] = useState(0);

  const isMovie = item.type === 'movie';
  const movie = isMovie ? item as Movie : null;
  const book = !isMovie ? item as Book : null;

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      style={{ x, y, rotate }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100) {
          setExitX(1000);
          onSwipe('like');
        } else if (info.offset.x < -100) {
          setExitX(-1000);
          onSwipe('dislike');
        } else if (info.offset.y < -100) {
          setExitY(-1000);
          onSwipe('not_watched');
        }
      }}
      animate={{ x: 0, y: 0, rotate: 0 }}
      exit={{ x: exitX, y: exitY, rotate: exitX / 10, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-gray-900">
        <img 
          src={isMovie ? movie?.posterUrl : book?.posterUrl} 
          alt={item.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.src = isMovie ? 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500' : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=500'; }}
        />
        
        {/* Feedback Overlays */}
        <motion.div 
          style={{ opacity: opacityLike }}
          className="absolute top-10 left-10 border-4 border-green-500 rounded-xl px-4 py-2 rotate-[-20deg] pointer-events-none z-10"
        >
          <span className="text-green-500 text-4xl font-black uppercase tracking-widest">ЛАЙК</span>
        </motion.div>

        <motion.div 
          style={{ opacity: opacityDislike }}
          className="absolute top-10 right-10 border-4 border-red-500 rounded-xl px-4 py-2 rotate-[20deg] pointer-events-none z-10"
        >
          <span className="text-red-500 text-4xl font-black uppercase tracking-widest">НЕ МОЁ</span>
        </motion.div>

        <motion.div 
          style={{ opacity: opacityNotWatched }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 border-4 border-indigo-500 rounded-xl px-4 py-2 pointer-events-none z-10"
        >
          <span className="text-indigo-500 text-2xl font-black uppercase tracking-widest text-center block">НЕ СМОТРЕЛ</span>
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="bg-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              {isMovie ? 'Фильм' : 'Книга'}
            </span>
            {item.genre && (
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {item.genre}
              </span>
            )}
            {(isMovie ? movie?.releaseYear : book?.releaseYear) && (
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {isMovie ? movie?.releaseYear : book?.releaseYear}
              </span>
            )}
          </div>
          <h2 className="text-4xl font-black mb-2 tracking-tight">{item.title}</h2>
          {(isMovie ? movie?.director : book?.author) && (
            <p className="text-white/60 text-sm mb-3 font-medium">
              {isMovie ? `Режиссер: ${movie?.director}` : `Автор: ${book?.author}`}
            </p>
          )}
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="font-bold text-lg">{(item.rating || 0).toFixed(1)}</span>
            <span className="text-white/60 text-sm">({item.totalVotes} голосов)</span>
          </div>
          <p className="text-white/80 line-clamp-3 text-lg leading-relaxed">{item.description}</p>
        </div>
      </div>
    </motion.div>
  );
};

const SwipeView = ({ movies, books, onSwipe }: { 
  movies: Movie[], 
  books: Book[], 
  onSwipe: (id: string, dir: 'like' | 'dislike' | 'not_watched', contentType: 'movie' | 'book') => void 
}) => {
  const [items, setItems] = useState<Content[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (movies.length > 0 || books.length > 0) {
      const mixed = [...movies, ...books].sort(() => 0.5 - Math.random());
      setItems(mixed);
    }
  }, [movies, books]);

  const handleSwipe = (dir: 'like' | 'dislike' | 'not_watched') => {
    if (currentIndex < items.length) {
      const item = items[currentIndex];
      onSwipe(item.id, dir, item.type);
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (items.length === 0 || currentIndex >= items.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
          <Heart className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Контент закончился!</h2>
        <p className="text-gray-500">Зайдите позже за новыми рекомендациями.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md aspect-[3/4] mx-auto mt-8">
      <AnimatePresence mode="popLayout">
        <SwipeCard 
          key={items[currentIndex].id} 
          item={items[currentIndex]} 
          onSwipe={handleSwipe} 
        />
      </AnimatePresence>
      <div className="absolute -bottom-16 left-0 right-0 flex justify-center items-center gap-4">
        <button 
          onClick={() => handleSwipe('dislike')}
          className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-red-500 hover:scale-110 transition-transform border border-red-50"
          title="Не нравится"
        >
          <X className="w-6 h-6" />
        </button>
        <button 
          onClick={() => handleSwipe('not_watched')}
          className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-400 hover:scale-110 transition-transform border border-gray-100"
          title="Не смотрел/читал"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button 
          onClick={() => handleSwipe('like')}
          className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-emerald-500 hover:scale-110 transition-transform border border-emerald-50"
          title="Нравится"
        >
          <Heart className="w-6 h-6 fill-emerald-500" />
        </button>
      </div>
    </div>
  );
};

const BattleMainView = ({ movies, books, onBattle }: { 
  movies: Movie[], 
  books: Book[],
  onBattle: (winnerId: string, loserId: string, contentType: 'movie' | 'book') => void 
}) => {
  const [battleType, setBattleType] = useState<'movies' | 'books' | null>(null);

  if (!battleType) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-0 gap-4 p-4 overflow-y-auto">
        <div className="text-center space-y-1">
          <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase">Выберите битву</h2>
          <p className="text-gray-500 text-sm">Что вы хотите сравнить сегодня?</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setBattleType('movies')}
            className="group relative h-32 sm:h-64 rounded-[2rem] overflow-hidden shadow-xl bg-indigo-600 text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-800 opacity-90" />
            <div className="relative h-full flex flex-row items-center justify-start p-6 text-left gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Swords className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Фильмы</h3>
                <p className="text-indigo-100 text-xs mt-0.5 font-medium">Лучшие картины</p>
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setBattleType('books')}
            className="group relative h-32 sm:h-64 rounded-[2rem] overflow-hidden shadow-xl bg-emerald-600 text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-800 opacity-90" />
            <div className="relative h-full flex flex-row items-center justify-start p-6 text-left gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Книги</h3>
                <p className="text-emerald-100 text-xs mt-0.5 font-medium">Лучшие произведения</p>
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <button 
        onClick={() => setBattleType(null)}
        className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-sm hover:bg-white transition-colors border border-gray-100 flex items-center gap-2 px-3"
      >
        <X className="w-4 h-4 text-gray-600" />
        <span className="text-xs font-bold uppercase tracking-widest text-gray-600">Назад</span>
      </button>
      
      <div className="h-full pt-12 overflow-y-auto min-h-0">
        {battleType === 'movies' ? (
          <BattleView items={movies} onBattle={(w, l) => onBattle(w, l, 'movie')} contentType="movie" />
        ) : (
          <BattleView items={books} onBattle={(w, l) => onBattle(w, l, 'book')} contentType="book" />
        )}
      </div>
    </div>
  );
};

const BattleView = ({ items, onBattle, contentType }: { items: Content[], onBattle: (winnerId: string, loserId: string) => void, contentType: 'movie' | 'book' }) => {
  const [pair, setPair] = useState<[Content, Content] | null>(null);

  useEffect(() => {
    if (items.length >= 2) {
      const shuffled = [...items].sort(() => 0.5 - Math.random());
      setPair([shuffled[0], shuffled[1]]);
    }
  }, [items]);

  const handleSelect = (winnerId: string) => {
    if (!pair) return;
    const loserId = winnerId === pair[0].id ? pair[1].id : pair[0].id;
    onBattle(winnerId, loserId);
    
    // Get new pair
    if (items.length >= 2) {
      const shuffled = [...items].sort(() => 0.5 - Math.random());
      setPair([shuffled[0], shuffled[1]]);
    }
  };

  if (!pair) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
          <Swords className="w-10 h-10 text-indigo-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black mb-2">Загрузка битвы...</h2>
        <p className="text-gray-500">
          {items.length < 2 ? `Недостаточно ${contentType === 'movie' ? 'фильмов' : 'книг'} для битвы.` : `Мы подбираем для вас пару ${contentType === 'movie' ? 'фильмов' : 'книг'}.`}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4 max-w-md mx-auto w-full h-full min-h-0">
      <div className="flex flex-col gap-4 w-full flex-1 min-h-0 relative">
        {pair.map((item, idx) => {
          const isMovie = item.type === 'movie';
          const movie = isMovie ? item as Movie : null;
          const book = !isMovie ? item as Book : null;
          const posterUrl = isMovie ? movie?.posterUrl : book?.posterUrl;

          return (
            <React.Fragment key={item.id}>
              {idx === 1 && contentType === 'book' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full flex items-center justify-center font-bold text-emerald-600 shadow-lg border-4 border-emerald-100">
                  VS
                </div>
              )}
              <motion.button
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(item.id)}
              className="flex-1 relative rounded-2xl overflow-hidden shadow-xl group w-full max-h-[40vh]"
            >
              <img 
                src={posterUrl} 
                alt={item.title} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = isMovie ? 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500' : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=500'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white text-left">
                {item.genre && (
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1 block">
                    {item.genre}
                  </span>
                )}
                <h3 className="text-xl font-bold mb-1 leading-tight">{item.title}</h3>
                
                {((isMovie ? movie?.releaseYear : book?.releaseYear) || (isMovie ? movie?.director : book?.author)) && (
                  <div className="flex items-center gap-2 text-xs text-white/70 mb-2 font-medium">
                    {isMovie ? <span>{movie?.releaseYear}</span> : <span>{book?.releaseYear}</span>}
                    {(isMovie ? movie?.releaseYear : book?.releaseYear) && (isMovie ? movie?.director : book?.author) && <span>•</span>}
                    {isMovie ? <span>{movie?.director}</span> : <span>{book?.author}</span>}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm mt-2">
                  <div className="flex items-center gap-1.5 text-yellow-400">
                    <Star className="w-4 h-4 fill-yellow-400" />
                    <span className="font-bold">{(item.rating || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-300">
                    <Trophy className="w-4 h-4" />
                    <span className="font-bold">
                      {((item.battleWins || 0) + (item.battleLosses || 0) > 0 
                        ? Math.round(((item.battleWins || 0) / ((item.battleWins || 0) + (item.battleLosses || 0))) * 100) 
                        : 0)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Выбрать
              </div>
            </motion.button>
            </React.Fragment>
          );
        })}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl flex items-center justify-center font-black text-xl md:text-2xl border-4 border-indigo-600 z-10">
          VS
        </div>
      </div>
    </div>
  );
};

const RankingView = ({ 
  movies, 
  books,
  onSelect, 
  isAdmin, 
  onSync, 
  isSyncing,
  defaultContentType = 'movie'
}: { 
  movies: Movie[], 
  books: Book[],
  onSelect: (item: Content) => void,
  isAdmin?: boolean,
  onSync?: () => void,
  isSyncing?: boolean,
  defaultContentType?: 'movie' | 'book' | 'user'
}) => {
  const [contentType, setContentType] = useState<'movie' | 'book' | 'user'>(defaultContentType);

  useEffect(() => {
    setContentType(defaultContentType);
  }, [defaultContentType]);
  const [sortBy, setSortBy] = useState<'rating' | 'likes' | 'wins' | 'activity'>('likes');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (contentType === 'user') {
      setLoadingUsers(true);
      MovieService.getUsersRanking().then(res => {
        setUsers(res);
        setLoadingUsers(false);
      });
    }
  }, [contentType]);

  const items = contentType === 'movie' ? movies : books;
  const genres = Array.from(new Set(items.map(m => m.genre).filter(Boolean))) as string[];

  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'likes') return (b.swipeLikes || 0) - (a.swipeLikes || 0);
    if (sortBy === 'wins') return (b.battleWins || 0) - (a.battleWins || 0);
    return 0;
  });

  const filteredItems = selectedGenre 
    ? sortedItems.filter(m => m.genre === selectedGenre)
    : sortedItems;

  const totalPages = contentType === 'user' ? Math.ceil(users.length / limit) : Math.ceil(filteredItems.length / limit);
  const displayedItems = contentType === 'user' ? users.slice((currentPage - 1) * limit, currentPage * limit) : filteredItems.slice((currentPage - 1) * limit, currentPage * limit);

  useEffect(() => {
    setCurrentPage(1);
    if (contentType === 'user') setSortBy('activity');
    else if (sortBy === 'activity') setSortBy('likes');
  }, [selectedGenre, limit, contentType, sortBy]);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-indigo-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black mb-2">Загрузка рейтинга...</h2>
        <p className="text-gray-500 mb-8">Мы готовим для вас список лучших {contentType === 'movie' ? 'фильмов' : 'книг'}. Пожалуйста, подождите.</p>
        {isAdmin && onSync && (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Синхронизация...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Синхронизировать сейчас
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black tracking-tight">Рейтинг</h2>
        <Trophy className="w-8 h-8 text-indigo-600" />
      </div>

      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
        <button 
          onClick={() => setContentType('movie')} 
          className={cn("flex-1 py-2 rounded-xl font-bold text-sm transition-all", contentType === 'movie' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700")}
        >
          Фильмы
        </button>
        <button 
          onClick={() => setContentType('book')} 
          className={cn("flex-1 py-2 rounded-xl font-bold text-sm transition-all", contentType === 'book' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700")}
        >
          Книги
        </button>
        <button 
          onClick={() => setContentType('user')} 
          className={cn("flex-1 py-2 rounded-xl font-bold text-sm transition-all", contentType === 'user' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700")}
        >
          Пользователи
        </button>
      </div>

      <div className="space-y-6 mb-8">
        {contentType !== 'user' && (
          <>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Сортировать по</p>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'likes', label: 'Лайкам', icon: Heart },
                  { id: 'rating', label: 'Рейтингу', icon: Star },
                  { id: 'wins', label: 'Победам', icon: Swords },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSortBy(opt.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-lg text-base font-bold transition-all",
                      sortBy === opt.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
                    )}
                  >
                    <opt.icon className="w-5 h-5" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Жанр</p>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setSelectedGenre(null)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-base font-bold transition-all",
                    selectedGenre === null ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
                  )}
                >
                  Все
                </button>
                {genres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-base font-bold transition-all",
                      selectedGenre === genre ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
                    )}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Показывать по</p>
          <div className="flex flex-wrap gap-1">
            {[10, 20, 50, 100].map(opt => (
              <button
                key={opt}
                onClick={() => setLimit(opt)}
                className={cn(
                  "px-3 py-1 rounded-lg text-base font-bold transition-all",
                  limit === opt ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {loadingUsers ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : displayedItems.length > 0 ? (
          displayedItems.map((item: any, idx) => {
            if (contentType === 'user') {
              const user = item as UserProfile;
              return (
                <motion.div
                  key={user.uid}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onSelect({ id: user.uid, type: 'user' } as any)}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow group"
                >
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-black text-lg shrink-0 overflow-hidden">
                    {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : user.displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg leading-tight group-hover:text-indigo-600 transition-colors truncate">{user.displayName || 'Пользователь'}</h3>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                      <div className="flex items-center gap-1" title="Лайки на отзывы">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-gray-700">{user.totalLikesReceived || 0}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Лайки на комментарии">
                        <Heart className="w-3 h-3 text-pink-500 fill-pink-500" />
                        <span className="font-bold text-gray-700">{user.totalCommentLikesReceived || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-gray-100 group-hover:text-indigo-50 text-right pr-2">
                    #{idx + 1 + (currentPage - 1) * limit}
                  </div>
                </motion.div>
              );
            }

            const isMovie = item.type === 'movie';
            const movie = isMovie ? item as Movie : null;
            const book = !isMovie ? item as Book : null;
            const posterUrl = isMovie ? movie?.posterUrl : book?.posterUrl;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onSelect(item)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow group relative"
              >
                <div className="shrink-0">
                  <img 
                    src={posterUrl} 
                    alt="" 
                    className="w-16 h-24 object-cover rounded-lg shadow-sm"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.src = isMovie ? 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500' : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=500'; }}
                  />
                </div>
                <div className="flex-1 min-w-0 py-1 flex flex-col justify-center min-h-[96px] pr-10">
                  <h3 className="font-bold text-lg leading-tight group-hover:text-indigo-600 transition-colors mb-1 line-clamp-2 text-balance">{item.title}</h3>
                  <div className="flex items-center gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "w-3 h-3",
                          (item.rating / 2) >= star 
                            ? "text-yellow-400 fill-yellow-400" 
                            : (item.rating / 2) >= star - 0.5 
                              ? "text-yellow-400 fill-yellow-400 opacity-50" 
                              : "text-gray-200 fill-gray-200"
                        )}
                      />
                    ))}
                    <span className="ml-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">{(item.rating || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 truncate">
                    <span className="shrink-0">{isMovie ? movie?.releaseYear : book?.releaseYear}</span>
                    {(isMovie ? movie?.director : book?.author) && (
                      <>
                        <span className="shrink-0">•</span>
                        <span className="truncate">{isMovie ? `Реж. ${movie?.director}` : `Авт. ${book?.author}`}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-auto text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                      <span className="font-bold text-gray-900">{item.swipeLikes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Swords className="w-4 h-4 text-indigo-500 fill-indigo-500" />
                      <span className="font-bold text-indigo-600">{item.battleWins}</span>
                      <span className="text-gray-300">/</span>
                      <span className="font-bold text-rose-500">{item.battleLosses}</span>
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-sm",
                  ((currentPage - 1) * limit + idx) === 0 ? "bg-yellow-100 text-yellow-700" : 
                  ((currentPage - 1) * limit + idx) === 1 ? "bg-gray-100 text-gray-700" :
                  ((currentPage - 1) * limit + idx) === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-400"
                )}>
                  {(currentPage - 1) * limit + idx + 1}
                </div>
                <div className="absolute bottom-4 right-4 shrink-0 self-center">
                  <ChevronRight className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">{contentType === 'movie' ? 'Фильмы' : 'Книги'} не найдены</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-3 rounded-xl bg-white border border-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "w-10 h-10 rounded-xl font-bold text-sm transition-all",
                    currentPage === pageNum 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                      : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-3 rounded-xl bg-white border border-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};








const SuggestionsView = ({ 
  userProfile, 
  movies, 
  books,
  onSelect
}: { 
  userProfile: UserProfile | null, 
  movies: Movie[], 
  books: Book[],
  onSelect: (item: Content) => void
}) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const likedMovieTitles = movies
        .filter(m => userProfile.likedMovies?.includes(m.id))
        .map(m => m.title);
      const likedBookTitles = books
        .filter(b => userProfile.likedBooks?.includes(b.id))
        .map(b => b.title);

      const res = await GeminiService.getContentSuggestions(likedMovieTitles, likedBookTitles);
      setSuggestions(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile && suggestions.length === 0) {
      fetchSuggestions();
    }
  }, [userProfile]);

  return (
    <div className="h-full overflow-y-auto pb-24 scrollbar-hide">
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-12">
        {/* Recommendations Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Персональные советы</h2>
                <p className="text-sm text-gray-500">На основе ваших предпочтений</p>
              </div>
            </div>
            <button 
              onClick={fetchSuggestions}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              title="Обновить советы"
            >
              <RefreshCw className={cn("w-5 h-5 text-gray-400", loading && "animate-spin")} />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Анализируем ваши вкусы...</p>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="grid gap-4">
              {suggestions.map((s, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                        s.type === 'movie' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {s.type === 'movie' ? 'Фильм' : 'Книга'}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-600 transition-colors">{s.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">{s.description}</p>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs text-gray-500 italic">
                      <span className="font-bold text-gray-700 not-italic mr-1">Почему это вам понравится:</span>
                      {s.reason}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
              <Sparkles className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">Оцените больше фильмов и книг, чтобы получить персональные советы!</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const ChatView = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await GeminiService.chat(userMsg, []);
      setMessages(prev => [...prev, { role: 'ai', text: response || 'Sorry, I couldn\'t process that.' }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', text: 'Error connecting to AI.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Movie Expert AI</h2>
          <p className="text-xs text-gray-500">Ask anything about cinema</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Try asking: "What are some good sci-fi movies from the 90s?"</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={cn(
            "flex",
            msg.role === 'user' ? "justify-end" : "justify-start"
          )}>
            <div className={cn(
              "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
              msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          className="flex-1 bg-transparent px-4 py-2 outline-none"
        />
        <button 
          onClick={handleSend}
          disabled={loading}
          className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const ContentDetails = ({ 
  content, 
  onClose, 
  onSelect,
  isFavorite,
  onToggleFavorite,
  onUserClick
}: { 
  content: Content, 
  onClose: () => void, 
  onSelect: (item: Content) => void,
  isFavorite: boolean,
  onToggleFavorite: (isFav: boolean) => void,
  onUserClick: (userId: string) => void
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [similarItems, setSimilarItems] = useState<Content[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [userCollections, setUserCollections] = useState<Collection[]>([]);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);

  const isMovie = content.type === 'movie';
  const movie = isMovie ? content as Movie : null;
  const book = !isMovie ? content as Book : null;
  const posterUrl = content.posterUrl;
  const backdropUrl = isMovie ? movie?.backdropUrl : content.posterUrl;

  useEffect(() => {
    const unsubReviews = MovieService.getReviews(content.id, setReviews);
    const unsubComments = MovieService.getComments(content.id, setComments);
    
    const fetchSimilar = async () => {
      if (isMovie && movie) {
        const similar = await MovieService.getSimilarMovies(movie);
        setSimilarItems(similar);
      } else if (book) {
        const similar = await MovieService.getSimilarBooks(book);
        setSimilarItems(similar);
      }
    };
    fetchSimilar();

    if (auth.currentUser) {
      MovieService.getUserCollections(auth.currentUser.uid).then(setUserCollections);
    }

    return () => {
      unsubReviews();
      unsubComments();
    };
  }, [content.id]);

  const handleSubmit = async () => {
    if (rating === 0 || !comment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await MovieService.addReview(content.id, content.type, rating, comment);
      setRating(0);
      setComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      await MovieService.addComment(content.id, content.type, newComment);
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-50 w-full max-w-2xl h-[90vh] rounded-t-[2rem] md:rounded-[2rem] overflow-hidden flex flex-col"
      >
        <div className="relative h-80 flex-shrink-0">
          <img 
            src={backdropUrl || posterUrl} 
            alt="" 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
            onError={(e) => { e.currentTarget.src = isMovie ? 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500' : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=500'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-8 flex gap-6 items-end">
            <div className="hidden md:block w-32 h-48 rounded-xl overflow-hidden shadow-2xl border-4 border-white flex-shrink-0">
              <img src={posterUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = isMovie ? 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500' : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=500'; }} />
            </div>
            <div className="mb-2">
              <h2 className="text-4xl font-black text-white drop-shadow-lg">{content.title}</h2>
              <p className="text-white/80 font-bold drop-shadow-md">{isMovie ? movie?.releaseYear : book?.releaseYear} • {content.genre}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(!isFavorite); }}
            className="absolute top-4 right-16 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors"
          >
            <Bookmark className={cn("w-5 h-5", isFavorite ? "fill-white" : "")} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowCollectionPicker(!showCollectionPicker); }}
            className="absolute top-4 right-28 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
          {showCollectionPicker && (
            <div className="absolute top-16 right-4 w-64 bg-white rounded-2xl shadow-2xl p-4 z-50 border border-gray-100">
              <h4 className="text-sm font-black mb-3 text-gray-900">Добавить в коллекцию</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {userCollections.map(col => (
                  <button 
                    key={col.id}
                    onClick={async () => {
                      await MovieService.addContentToCollection(col.id, content.id, content.type);
                      setShowCollectionPicker(false);
                    }}
                    className="w-full text-left p-2 hover:bg-indigo-50 rounded-xl transition-colors text-xs font-bold text-gray-600 flex items-center justify-between group"
                  >
                    <span className="truncate group-hover:text-indigo-600">{col.name}</span>
                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
                {userCollections.length === 0 && (
                  <p className="text-[10px] text-gray-400 italic">У вас пока нет коллекций</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="md:hidden">
                <h2 className="text-4xl font-black mb-2">{content.title}</h2>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-4 text-gray-500">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-gray-900 text-xl">{(content.rating || 0).toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <span>{content.totalVotes} отзывов</span>
                  {content.genre && (
                    <>
                      <span>•</span>
                      <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider">{content.genre}</span>
                    </>
                  )}
                  {content.releaseYear && (
                    <>
                      <span>•</span>
                      <span className="font-medium">{content.releaseYear}</span>
                    </>
                  )}
                </div>
                <p className="mt-6 text-gray-600 leading-relaxed text-lg">{content.description}</p>
              </div>

              {isMovie && movie?.actors && movie.actors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Актеры</h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.actors.map((actor, i) => (
                      <span key={i} className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 shadow-sm">
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Инфо</h3>
                <div className="space-y-4">
                  {(isMovie ? movie?.director : book?.author) && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400 uppercase font-bold mb-1">{isMovie ? 'Режиссер' : 'Автор'}</p>
                      <p className="font-bold text-gray-900">{isMovie ? movie?.director : book?.author}</p>
                      {!isMovie && book?.authorDescription && (
                        <p className="text-[10px] text-gray-500 leading-tight italic mt-1">{book.authorDescription}</p>
                      )}
                    </div>
                  )}
                  {isMovie && movie?.budget && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold mb-1">Бюджет</p>
                      <p className="font-bold text-gray-900">{movie.budget}</p>
                    </div>
                  )}
                  {!isMovie && book?.pages && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold mb-1">Страниц</p>
                      <p className="font-bold text-gray-900">{book.pages}</p>
                    </div>
                  )}
                  {!isMovie && book?.publisher && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold mb-1">Издательство</p>
                      <p className="font-bold text-gray-900">{book.publisher}</p>
                    </div>
                  )}
                  {content.releaseYear && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold mb-1">{isMovie ? 'Год выпуска' : 'Год издания'}</p>
                      <p className="font-bold text-gray-900">{content.releaseYear}</p>
                    </div>
                  )}
                  {content.genre && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold mb-1">Жанр</p>
                      <p className="font-bold text-gray-900">{content.genre}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={cn("p-6 rounded-3xl text-white shadow-xl shadow-indigo-100", isMovie ? "bg-indigo-600" : "bg-emerald-600")}>
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                    <span className="font-black text-2xl">{content.battleWins}</span>
                  </div>
                  <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Победы</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <Swords className="w-6 h-6 text-gray-400" />
                    <span className="font-black text-2xl text-gray-900">{content.battleLosses}</span>
                  </div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Поражения</p>
                </div>
              </div>
            </div>
          </div>

          {similarItems.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-black uppercase tracking-tighter">Похожие {isMovie ? 'фильмы' : 'книги'}</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {similarItems.map(sm => (
                  <button 
                    key={sm.id}
                    onClick={() => onSelect(sm)}
                    className="flex-shrink-0 w-32 group text-left"
                  >
                    <div className="aspect-[2/3] rounded-2xl overflow-hidden mb-2 shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-1">
                      <img src={sm.posterUrl} alt={sm.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = isMovie ? 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500' : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=500'; }} />
                    </div>
                    <p className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{sm.title}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{sm.genre}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-4">Оставить отзыв</h3>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button 
                  key={n} 
                  onClick={() => setRating(n)}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all",
                    rating >= n ? "bg-yellow-400 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <textarea 
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={isMovie ? "Что вы думаете об этом фильме?" : "Что вы думаете об этой книге?"}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-24 resize-none mb-4"
            />
            <button 
              onClick={handleSubmit}
              disabled={submitting || rating === 0 || !comment.trim()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Опубликовать отзыв"}
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold">Отзывы пользователей</h3>
            {reviews.length === 0 ? (
              <p className="text-gray-400 text-center py-8 italic">Отзывов пока нет. Будьте первым!</p>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => onUserClick(review.userId)}
                      >
                        {review.userName.charAt(0)}
                      </div>
                      <span 
                        className="font-bold text-sm cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => onUserClick(review.userId)}
                      >
                        {review.userName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => MovieService.likeReview(review.id, review.userId)}
                        className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-pink-500 transition-colors"
                      >
                        <Heart className="w-3 h-3" />
                        <span>{(review as any).likes || 0}</span>
                      </button>
                      <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-bold text-yellow-700">{review.rating}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-3">{review.comment}</p>
                  
                  <div className="border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-4 mb-3">
                      <button 
                        onClick={() => {
                          const text = prompt('Ваш комментарий к отзыву:');
                          if (text) MovieService.addComment(content.id, content.type, text, review.id, review.userId);
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{(review as any).commentCount || 0} комментов</span>
                      </button>
                    </div>
                    
                    {/* Only show top 2 comments for each review to keep it clean */}
                    <div className="space-y-2">
                      {comments.filter(c => c.reviewId === review.id).slice(0, 2).map(c => (
                        <div key={c.id} className="bg-gray-50 p-2 rounded-xl text-[10px]">
                          <span className="font-bold text-indigo-600 mr-1">{c.userName}:</span>
                          <span className="text-gray-600">{c.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-8 border-t border-gray-100">
            <h3 className="text-2xl font-black mb-6">Комментарии</h3>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
              <textarea 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Добавить комментарий..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-24 resize-none mb-4"
              />
              <button 
                onClick={handleCommentSubmit}
                disabled={submittingComment || !newComment.trim()}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submittingComment ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Опубликовать комментарий"}
              </button>
            </div>

            <div className="space-y-6">
              {comments.length === 0 ? (
                <p className="text-gray-400 text-center py-8 italic">Комментариев пока нет. Начните обсуждение!</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-4">
                    <div 
                      className="w-10 h-10 bg-gray-100 rounded-2xl flex-shrink-0 flex items-center justify-center text-gray-500 font-bold cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onUserClick(c.userId)}
                    >
                      {c.userName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="font-bold text-sm cursor-pointer hover:text-indigo-600 transition-colors"
                          onClick={() => onUserClick(c.userId)}
                        >
                          {c.userName}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                          {c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleDateString() : 'Только что'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{c.text}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <button 
                          onClick={() => MovieService.likeComment(c.id, c.userId)}
                          className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-pink-500 transition-colors"
                        >
                          <Heart className="w-3 h-3" />
                          {c.likes || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Profile View ---

const ProfileView = ({ 
  userId, 
  isCurrentUser, 
  allMovies, 
  allBooks, 
  onSelectItem,
  onBack
}: { 
  userId: string, 
  isCurrentUser: boolean, 
  allMovies: Movie[], 
  allBooks: Book[], 
  onSelectItem: (item: Content) => void,
  onBack?: () => void
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'liked' | 'battles' | 'reviews' | 'comments' | 'collections' | 'favorites' | 'chat'>('overview');
  const [contentType, setContentType] = useState<'movie' | 'book'>('movie');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [battles, setBattles] = useState<any[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [favoriteCollections, setFavoriteCollections] = useState<Collection[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat' && !isCurrentUser && auth.currentUser) {
      const unsub = MovieService.getMessages(auth.currentUser.uid, userId, setMessages);
      return () => unsub();
    }
  }, [activeTab, isCurrentUser, userId]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(10);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          MovieService.getUserProfile(userId),
          MovieService.getUserData(userId),
          MovieService.getUserReviews(userId),
          MovieService.getUserComments(userId),
          MovieService.getUserBattles(userId),
          MovieService.getUserCollections(userId)
        ]);

        const p = results[0].status === 'fulfilled' ? results[0].value : null;
        const u = results[1].status === 'fulfilled' ? results[1].value : null;
        const r = results[2].status === 'fulfilled' ? results[2].value : [];
        const c = results[3].status === 'fulfilled' ? results[3].value : [];
        const b = results[4].status === 'fulfilled' ? results[4].value : [];
        const cols = results[5].status === 'fulfilled' ? results[5].value : [];

        setProfile(p);
        setUserData(u);
        setReviews(r);
        setComments(c);
        setBattles(b);
        setCollections(cols);
        
        if (p?.favoriteCollections?.length) {
          // Fetch favorite collections
          const favCols = await Promise.allSettled(p.favoriteCollections.map(async (id) => {
            const snap = await getDoc(doc(db, 'collections', id));
            return snap.exists() ? { id: snap.id, ...snap.data() } as Collection : null;
          }));
          setFavoriteCollections(favCols.map(res => res.status === 'fulfilled' ? res.value : null).filter(Boolean) as Collection[]);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleChangeAvatar = async () => {
    if (!isCurrentUser) return;
    const url = prompt('Введите URL нового фото профиля:');
    if (url && auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { photoURL: url });
        await MovieService.saveUserProfile(auth.currentUser);
        setUserData({ ...userData, photoURL: url });
      } catch (error) {
        console.error('Failed to update avatar', error);
      }
    }
  };

  const handleToggleFavoriteCollection = async (collectionId: string) => {
    if (!auth.currentUser) return;
    const isFav = profile?.favoriteCollections?.includes(collectionId);
    try {
      await MovieService.toggleFavoriteCollection(collectionId, auth.currentUser.uid, !isFav);
      // Refresh profile
      const p = await MovieService.getUserProfile(userId);
      setProfile(p);
      
      // Refresh favorite collections list if needed
      if (p?.favoriteCollections?.length) {
        const favCols = await Promise.all(p.favoriteCollections.map(async (id) => {
          const snap = await getDoc(doc(db, 'collections', id));
          return snap.exists() ? { id: snap.id, ...snap.data() } as Collection : null;
        }));
        setFavoriteCollections(favCols.filter(Boolean) as Collection[]);
      } else {
        setFavoriteCollections([]);
      }
      
      // If we are viewing our own collections, we might want to refresh the counts
      if (userId === auth.currentUser.uid) {
        const cols = await MovieService.getUserCollections(userId);
        setCollections(cols);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setDisplayLimit(10);
  }, [activeTab, contentType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const likedMovieIds = Array.from(new Set([...(profile?.likedMovies || []), ...(profile?.battleWonMovies || [])]));
  const likedBookIds = Array.from(new Set([...(profile?.likedBooks || []), ...(profile?.battleWonBooks || [])]));
  
  const likedMovies = allMovies.filter(m => likedMovieIds.includes(m.id));
  likedMovies.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const likedBooks = allBooks.filter(b => likedBookIds.includes(b.id));
  likedBooks.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const favoriteMovies = allMovies.filter(m => profile?.favoriteMovies?.includes(m.id));
  const favoriteBooks = allBooks.filter(b => profile?.favoriteBooks?.includes(b.id));

  const displayItems = contentType === 'movie' ? likedMovies : likedBooks;
  const favoriteItems = contentType === 'movie' ? favoriteMovies : favoriteBooks;

  const displayUser = userData || (isCurrentUser ? auth.currentUser : null);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 pb-24 h-full overflow-y-auto">
      <div className="flex items-center gap-6 mb-8">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <div 
          className={cn(
            "relative w-24 h-24 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-md border-4 border-white shrink-0",
            isCurrentUser && "cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all group"
          )}
          onClick={handleChangeAvatar}
        >
          {displayUser?.photoURL ? (
            <>
              <img src={displayUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              {isCurrentUser && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImageIcon className="w-6 h-6 text-white" />
                </div>
              )}
            </>
          ) : (
            <>
              <User className="w-10 h-10" />
              {isCurrentUser && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImageIcon className="w-6 h-6 text-white" />
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-3xl font-black tracking-tight">{displayUser?.displayName || 'Пользователь'}</h2>
          <p className="text-gray-500 font-medium">{displayUser?.email}</p>
          {isCurrentUser && <p className="text-xs text-indigo-600 mt-1 font-bold">Это ваш профиль</p>}
          
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-sm font-bold">
              <Star className="w-4 h-4" />
              {((userData?.totalLikesReceived || 0) + (userData?.totalCommentLikesReceived || 0))} Рейтинг
            </div>
            <div className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-sm font-bold">
              <MessageSquare className="w-4 h-4" />
              {reviews.length} Отзывов
            </div>
          </div>

          <div className="mt-4">
            {isCurrentUser ? (
              <div className="group relative">
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 min-h-[3rem] cursor-pointer hover:bg-gray-100 transition-colors"
                   onClick={() => {
                     const newBio = prompt('Введите информацию о себе:', userData?.bio || '');
                     if (newBio !== null) {
                       MovieService.updateUserBio(userId, newBio);
                       setUserData({ ...userData, bio: newBio });
                     }
                   }}
                >
                  {userData?.bio || 'Расскажите немного о себе... (нажмите, чтобы изменить)'}
                </p>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ) : (
              userData?.bio && (
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {userData.bio}
                </p>
              )
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {!isCurrentUser && (
              <button 
                onClick={() => setActiveTab('chat')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                Написать сообщение
              </button>
            )}
            {isCurrentUser && (
              <button 
                onClick={async (e) => {
                  const btn = e.currentTarget;
                  const originalText = btn.innerHTML;
                  btn.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Генерация...';
                  btn.disabled = true;
                  try {
                    await MovieService.seedAllData();
                    btn.innerHTML = 'Данные сгенерированы! Обновите страницу.';
                    setTimeout(() => {
                      btn.innerHTML = originalText;
                      btn.disabled = false;
                    }, 3000);
                  } catch (err) {
                    btn.innerHTML = 'Ошибка генерации';
                    setTimeout(() => {
                      btn.innerHTML = originalText;
                      btn.disabled = false;
                    }, 3000);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                Сгенерировать тестовые данные
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 mb-6 no-scrollbar">
        {[
          { id: 'overview', label: 'Обзор', icon: User },
          { id: 'liked', label: 'Понравилось', icon: Heart },
          { id: 'favorites', label: 'Избранное', icon: Bookmark },
          { id: 'collections', label: 'Коллекции', icon: BookOpen },
          { id: 'battles', label: 'Битвы', icon: Swords },
          { id: 'reviews', label: 'Отзывы', icon: Star },
          { id: 'comments', label: 'Комменты', icon: MessageSquare },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all",
              activeTab === tab.id 
                ? "bg-indigo-600 text-white shadow-md" 
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Recent Reviews */}
          {reviews.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Последние отзывы</h3>
                <button 
                  onClick={() => setActiveTab('reviews')}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Все отзывы
                </button>
              </div>
              <div className="grid gap-4">
                {reviews.slice(0, 3).map(r => {
                  const item = r.contentType === 'movie' ? allMovies.find(m => m.id === r.contentId) : allBooks.find(b => b.id === r.contentId);
                  if (!item) return null;
                  return (
                    <div key={r.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4 cursor-pointer hover:shadow-md transition-all" onClick={() => onSelectItem(item)}>
                      <img src={item.posterUrl} alt={item.title} className="w-16 h-24 object-cover rounded-lg shadow-sm" />
                      <div className="flex-1">
                        <h4 className="font-bold text-lg leading-tight mb-1">{item.title}</h4>
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={cn("w-3 h-3", star <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-300")} />
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{r.comment}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Collections */}
          {collections.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Коллекции</h3>
                <button 
                  onClick={() => setActiveTab('collections')}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Все коллекции
                </button>
              </div>
              <div className="grid gap-4">
                {collections.slice(0, 2).map(c => (
                  <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setActiveTab('collections')}>
                    <h4 className="font-bold text-lg mb-1">{c.name}</h4>
                    <p className="text-sm text-gray-500 mb-3">{c.description}</p>
                    <div className="flex gap-2">
                      {c.items.slice(0, 4).map((item, idx) => {
                        const contentItem = item.type === 'movie' ? allMovies.find(m => m.id === item.id) : allBooks.find(b => b.id === item.id);
                        if (!contentItem) return null;
                        return (
                          <img key={idx} src={contentItem.posterUrl} alt={contentItem.title} className="w-10 h-14 object-cover rounded-md shadow-sm" />
                        );
                      })}
                      {c.items.length > 4 && (
                        <div className="w-10 h-14 bg-gray-100 rounded-md flex items-center justify-center text-xs font-bold text-gray-500">
                          +{c.items.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Favorites */}
          {(favoriteMovies.length > 0 || favoriteBooks.length > 0) && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Избранное</h3>
                <button 
                  onClick={() => setActiveTab('favorites')}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Все избранное
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                {[...favoriteMovies, ...favoriteBooks].slice(0, 5).map(item => (
                  <div key={item.id} className="w-24 shrink-0 cursor-pointer group" onClick={() => onSelectItem(item)}>
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-sm mb-2 group-hover:shadow-md transition-all">
                      <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <h4 className="text-xs font-bold line-clamp-2 leading-tight">{item.title}</h4>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'liked' && (
        <>
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl w-fit">
            <button 
              onClick={() => setContentType('movie')} 
              className={cn("px-6 py-2 rounded-xl font-bold text-xs transition-all", contentType === 'movie' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500")}
            >
              Фильмы
            </button>
            <button 
              onClick={() => setContentType('book')} 
              className={cn("px-6 py-2 rounded-xl font-bold text-xs transition-all", contentType === 'book' ? "bg-white shadow-sm text-emerald-600" : "text-gray-500")}
            >
              Книги
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {displayItems.slice(0, displayLimit).map(item => (
              <div key={item.id} onClick={() => onSelectItem(item)} className="cursor-pointer group">
                <div className="aspect-[2/3] rounded-2xl overflow-hidden mb-2 relative shadow-sm group-hover:shadow-md transition-all">
                  <img src={item.posterUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.currentTarget.src = item.type === 'movie' ? 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500' : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=500'; }} />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>
                <h3 className="font-bold text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.genre}</p>
              </div>
            ))}
            {displayItems.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <Heart className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p>Здесь пока пусто</p>
              </div>
            )}
          </div>
          {displayItems.length > displayLimit && (
            <button 
              onClick={() => setDisplayLimit(prev => prev + 10)}
              className="w-full mt-8 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Смотреть больше
            </button>
          )}
        </>
      )}

      {activeTab === 'chat' && (
        <div className="flex flex-col h-[500px] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-indigo-600 p-4 text-white flex items-center gap-3">
            <button onClick={() => setActiveTab('overview')} className="p-1 hover:bg-indigo-500 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {displayUser?.photoURL ? (
                <img src={displayUser.photoURL} className="w-8 h-8 rounded-full object-cover border border-indigo-400" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
              )}
              <span className="font-bold">{displayUser?.displayName || 'Пользователь'}</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => {
              const isMine = msg.senderId === auth.currentUser?.uid;
              return (
                <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] px-4 py-2 rounded-2xl text-sm",
                    isMine ? "bg-indigo-600 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                  )}>
                    <p>{msg.text}</p>
                    <span className={cn("text-[10px] block mt-1", isMine ? "text-indigo-200" : "text-gray-400")}>
                      {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-3 bg-white border-t border-gray-100">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (newMessage.trim()) {
                  MovieService.sendMessage(userId, newMessage.trim());
                  setNewMessage('');
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Написать сообщение..."
                className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'favorites' && (
        <>
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl w-fit">
            <button 
              onClick={() => setContentType('movie')} 
              className={cn("px-6 py-2 rounded-xl font-bold text-xs transition-all", contentType === 'movie' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500")}
            >
              Фильмы
            </button>
            <button 
              onClick={() => setContentType('book')} 
              className={cn("px-6 py-2 rounded-xl font-bold text-xs transition-all", contentType === 'book' ? "bg-white shadow-sm text-emerald-600" : "text-gray-500")}
            >
              Книги
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {favoriteItems.slice(0, displayLimit).map(item => (
              <div key={item.id} onClick={() => onSelectItem(item)} className="cursor-pointer group">
                <div className="aspect-[2/3] rounded-2xl overflow-hidden mb-2 relative shadow-sm group-hover:shadow-md transition-all">
                  <img src={item.posterUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.currentTarget.src = item.type === 'movie' ? 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500' : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=500'; }} />
                  <div className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  </div>
                </div>
                <h3 className="font-bold text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">{item.title}</h3>
              </div>
            ))}
          </div>
          {favoriteItems.length > displayLimit && (
            <button 
              onClick={() => setDisplayLimit(prev => prev + 10)}
              className="w-full mt-8 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Смотреть больше
            </button>
          )}
          {favoriteCollections.length > 0 && (
            <div className="col-span-full mt-8">
              <h3 className="text-lg font-bold mb-4">Избранные коллекции</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favoriteCollections.map(col => (
                  <div key={col.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleToggleFavoriteCollection(col.id); }}
                      className="absolute top-4 right-4 p-2 bg-pink-50 text-pink-500 rounded-full hover:bg-pink-100 transition-colors z-10"
                    >
                      <Heart className="w-4 h-4 fill-pink-500" />
                    </button>
                    <h4 className="font-black text-lg group-hover:text-indigo-600 transition-colors mb-1 pr-10">{col.name}</h4>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">{col.description}</p>
                    <div className="flex -space-x-3 mb-4">
                      {col.items.slice(0, 4).map((item, i) => {
                        const content = [...allMovies, ...allBooks].find(c => c.id === item.id);
                        return content ? (
                          <img key={i} src={content.posterUrl} className="w-10 h-14 object-cover rounded-lg border-2 border-white shadow-sm" />
                        ) : null;
                      })}
                      {col.items.length > 4 && (
                        <div className="w-10 h-14 bg-gray-100 rounded-lg border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-gray-400">
                          +{col.items.length - 4}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <span>{col.items.length} предметов</span>
                      <span>от {col.userName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(favoriteItems.length === 0 && favoriteCollections.length === 0) && (
            <div className="col-span-full text-center text-gray-500 py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <Bookmark className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p>В избранном пока ничего нет</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'collections' && (
        <div className="space-y-6">
          {isCurrentUser && (
            <button 
              onClick={async () => {
                const name = prompt('Название коллекции:');
                const desc = prompt('Описание:');
                if (name) {
                  await MovieService.createCollection(name, desc || '');
                  const cols = await MovieService.getUserCollections(userId);
                  setCollections(cols);
                }
              }}
              className="w-full py-4 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-3xl text-indigo-600 font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all"
            >
              <Plus className="w-5 h-5" />
              Создать новую коллекцию
            </button>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {collections.map(col => {
              const isFav = profile?.favoriteCollections?.includes(col.id);
              return (
                <div key={col.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleToggleFavoriteCollection(col.id); }}
                    className={cn(
                      "absolute top-4 right-4 p-2 rounded-full transition-colors z-10",
                      isFav ? "bg-pink-50 text-pink-500 hover:bg-pink-100" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                    )}
                  >
                    <Heart className={cn("w-4 h-4", isFav ? "fill-pink-500" : "")} />
                  </button>
                  <h4 className="font-black text-lg group-hover:text-indigo-600 transition-colors mb-1 pr-10">{col.name}</h4>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{col.description}</p>
                  <div className="flex -space-x-3 mb-4">
                    {col.items.slice(0, 4).map((item, i) => {
                      const content = [...allMovies, ...allBooks].find(c => c.id === item.id);
                      return content ? (
                        <img key={i} src={content.posterUrl} className="w-10 h-14 object-cover rounded-lg border-2 border-white shadow-sm" />
                      ) : null;
                    })}
                    {col.items.length > 4 && (
                      <div className="w-10 h-14 bg-gray-100 rounded-lg border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-gray-400">
                        +{col.items.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-pink-500" />
                      <span>{col.favoritesCount}</span>
                    </div>
                    <span>{col.items.length} предметов</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {collections.length === 0 && (
            <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p>Коллекций пока нет</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'battles' && (
        <div className="space-y-4">
          {battles.map((battle, i) => {
            const itemA = [...allMovies, ...allBooks].find(item => item.id === battle.itemAId);
            const itemB = [...allMovies, ...allBooks].find(item => item.id === battle.itemBId);
            const winner = battle.winnerId === battle.itemAId ? itemA : itemB;
            
            if (!itemA || !itemB) return null;

            return (
              <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="flex -space-x-4">
                  <img src={itemA.posterUrl} className="w-12 h-16 object-cover rounded-lg border-2 border-white shadow-sm" />
                  <img src={itemB.posterUrl} className="w-12 h-16 object-cover rounded-lg border-2 border-white shadow-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {battle.contentType === 'movie' ? 'Фильмы' : 'Книги'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {battle.timestamp?.toDate ? battle.timestamp.toDate().toLocaleDateString() : 'Недавно'}
                    </span>
                  </div>
                  <p className="text-sm font-bold truncate">
                    {itemA.title} <span className="text-gray-400 font-normal mx-1">vs</span> {itemB.title}
                  </p>
                  <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Победитель: {winner?.title}
                  </p>
                </div>
              </div>
            );
          })}
          {battles.length === 0 && (
            <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <Swords className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p>Битв пока не было</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.map((review) => {
            const item = [...allMovies, ...allBooks].find(i => i.id === review.contentId);
            return (
              <div key={review.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <img src={item?.posterUrl} className="w-10 h-14 object-cover rounded-lg shadow-sm" />
                  <div>
                    <h4 className="font-bold text-sm">{item?.title}</h4>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold">{review.rating}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-700 italic">"{review.comment}"</p>
              </div>
            );
          })}
          {reviews.length === 0 && (
            <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <Star className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p>Отзывов пока нет</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-4">
          {comments.map((comment) => {
            const item = [...allMovies, ...allBooks].find(i => i.id === comment.contentId);
            return (
              <div key={comment.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-3 h-3 text-indigo-600" />
                  <span className="text-xs font-bold text-gray-400">{item?.title}</span>
                </div>
                <p className="text-sm text-gray-700">{comment.text}</p>
                <p className="text-[10px] text-gray-400 mt-2">
                  {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleString() : 'Недавно'}
                </p>
              </div>
            );
          })}
          {comments.length === 0 && (
            <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p>Комментариев пока нет</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// --- Error Boundary ---

class ErrorBoundary extends (Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Что-то пошло не так.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Ошибка приложения</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              Перезагрузить приложение
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Main App ---

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('swipe');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const isAdmin = user?.email === "geriveranet@gmail.com";

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await Promise.all([
        MovieService.seedMovies(),
        MovieService.seedBooks()
      ]);
      alert('Синхронизация успешно завершена!');
    } catch (error: any) {
      console.error('Sync failed:', error);
      alert(error.message || 'Произошла ошибка при синхронизации');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    console.log("Current user state in AppContent:", user ? `User: ${user.email}` : 'No user');
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log('Auth state changed:', u ? `User: ${u.email}` : 'No user');
      setUser(u);
      setLoading(false);
      if (u) {
        MovieService.saveUserProfile(u);
        console.log('User signed in, triggering seedMovies...');
        if (u.email === "geriveranet@gmail.com") {
          MovieService.seedMovies();
          MovieService.seedBooks();
          MovieService.cleanupDuplicates();
        }
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      const unsub = MovieService.subscribeToUserProfile(user.uid, setUserProfile);
      return () => unsub();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  useEffect(() => {
    console.log('Attaching movies listener...');
    const unsubMovies = MovieService.getMovies((m) => {
      console.log(`Movies updated: ${m.length} films found`);
      setMovies(m);
    });

    console.log('Attaching books listener...');
    const unsubBooks = MovieService.getBooks((b) => {
      console.log(`Books updated: ${b.length} books found`);
      setBooks(b);
    });

    return () => {
      unsubMovies();
      unsubBooks();
    };
  }, []);

  const handleSwipe = async (contentId: string, type: 'like' | 'dislike' | 'not_watched', contentType: 'movie' | 'book') => {
    if (!user) {
      console.log("Swipe attempted, but no user. Calling signIn...");
      signIn().catch(err => console.error("Swipe sign in error:", err));
      return;
    }
    await MovieService.swipeContent(contentId, contentType, type);
  };

  const handleBattle = async (winnerId: string, loserId: string, contentType: 'movie' | 'book') => {
    if (!user) {
      signIn();
      return;
    }
    await MovieService.battleContent(winnerId, loserId, winnerId, contentType);
  };

  const handleUserClick = (userId: string) => {
    setViewingUserId(userId);
    setActiveTab('profile');
    setSelectedContent(null);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 pb-24 md:pt-20 overflow-hidden flex flex-col">
      <Navbar 
        activeTab={activeTab} 
        onTabChange={(tab: string) => {
          setActiveTab(tab);
          if (tab === 'profile') setViewingUserId(null);
        }} 
        user={user} 
        isSyncing={isSyncing}
        onSync={handleSync}
      />
      
      <main className="max-w-7xl mx-auto h-full w-full flex-1 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'swipe' && (
              <SwipeView movies={movies} books={books} onSwipe={handleSwipe} />
            )}
            {activeTab === 'battle' && (
              <BattleMainView movies={movies} books={books} onBattle={handleBattle} />
            )}
            {activeTab === 'ranking' && (
              <RankingView 
                movies={movies} 
                books={books}
                onSelect={(item: any) => {
                  if (item.type === 'user') {
                    handleUserClick(item.id || item.uid);
                  } else {
                    setSelectedContent(item);
                  }
                }} 
                isAdmin={isAdmin}
                onSync={handleSync}
                isSyncing={isSyncing}
                defaultContentType="movie"
              />
            )}
            {activeTab === 'user-ranking' && (
              <RankingView 
                movies={movies} 
                books={books}
                onSelect={(item: any) => {
                  if (item.type === 'user') {
                    handleUserClick(item.id || item.uid);
                  } else {
                    setSelectedContent(item);
                  }
                }} 
                isAdmin={isAdmin}
                onSync={handleSync}
                isSyncing={isSyncing}
                defaultContentType="user"
              />
            )}
            {activeTab === 'suggestions' && (
              <SuggestionsView 
                userProfile={userProfile} 
                movies={movies} 
                books={books} 
                onSelect={setSelectedContent} 
              />
            )}
            {activeTab === 'profile' && (
              <ProfileView 
                userId={viewingUserId || user?.uid || ''} 
                isCurrentUser={!viewingUserId || viewingUserId === user?.uid}
                allMovies={movies} 
                allBooks={books}
                onSelectItem={setSelectedContent} 
                onBack={viewingUserId ? () => {
                  setViewingUserId(null);
                  setActiveTab('user-ranking');
                } : undefined}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {selectedContent && (
          <ContentDetails 
            content={selectedContent} 
            onClose={() => setSelectedContent(null)} 
            onSelect={setSelectedContent}
            isFavorite={
              selectedContent.type === 'movie' 
                ? userProfile?.favoriteMovies?.includes(selectedContent.id) || false
                : userProfile?.favoriteBooks?.includes(selectedContent.id) || false
            }
            onToggleFavorite={(isFav) => {
              if (!user) {
                console.log("Toggle favorite attempted, but no user. Calling signIn...");
                signIn().catch(err => console.error("Toggle favorite sign in error:", err));
                return;
              }
              MovieService.toggleFavorite(selectedContent.id, selectedContent.type, user.uid, isFav);
            }}
            onUserClick={handleUserClick}
          />
        )}
      </AnimatePresence>

      {!user && activeTab !== 'ranking' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-black mb-2">Присоединяйтесь!</h2>
            <p className="text-gray-500 mb-8">Войдите, чтобы оценивать фильмы, участвовать в битвах и оставлять отзывы!</p>
            <button 
              onClick={async () => {
                try {
                  console.log("Sign in button in overlay clicked");
                  await signIn();
                  console.log("Sign in call in overlay finished");
                } catch (err) {
                  console.error("Sign in error in overlay:", err);
                }
              }}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              Войти через Google
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
