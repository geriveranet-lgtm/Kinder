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
  Award,
  BookOpen,
  Plus,
  Database,
  Settings,
  Edit2,
  Users
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, signIn, logOut, db, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from './firebase';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { MovieService, Movie, Book, Content, Review, Comment, UserProfile, Collection, Message } from './services/movieService';
import { GeminiService } from './services/geminiService';
import { CommunityView } from './components/CommunityView';
import { ReviewsView } from './components/ReviewsView';
import { ClubDetailView } from './components/ClubDetailView';
import { AdminSeeder } from './components/AdminSeeder';
import { ImageValidator } from './components/ImageValidator';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Navbar = ({ activeTab, onTabChange, user, isSyncing, onSync }: any) => {
  const UserMenu = () => (
    <>
      {user ? (
        <div className="flex items-center gap-3 bg-white/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none px-3 py-2 md:p-0 rounded-full md:rounded-none shadow-sm md:shadow-none border border-slate-200 md:border-none">
          {user.email === "geriveranet@gmail.com" && (
            <button 
              onClick={onSync}
              disabled={isSyncing}
              className={cn(
                "text-[10px] uppercase tracking-widest px-2 py-1 rounded-md font-black transition-colors flex items-center gap-1",
                isSyncing ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-brand/10 text-brand hover:bg-brand/20"
              )}
              title="Sync Movies"
            >
              {isSyncing && <Loader2 className="w-3 h-3 animate-spin" />}
              {isSyncing ? "Syncing..." : "Sync"}
            </button>
          )}
          <button onClick={() => onTabChange('profile')} className="focus:outline-none">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-slate-200 hover:ring-brand transition-all object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand border-2 border-white ring-1 ring-slate-200 hover:ring-brand transition-all">
                <User className="w-4 h-4" />
              </div>
            )}
          </button>
          <button onClick={logOut} className="text-slate-400 hover:text-rose-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <button 
          onClick={async () => {
            try {
              await signIn();
            } catch (err) {
              console.error("Navbar sign in error:", err);
            }
          }} 
          className="bg-brand text-white px-5 py-2 rounded-full font-black text-xs uppercase tracking-widest hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 active:scale-95"
        >
          Войти
        </button>
      )}
    </>
  );

  return (
    <>
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg md:max-w-none md:w-max glass rounded-3xl px-6 py-3 flex justify-between items-center z-50 md:top-6 md:bottom-auto md:px-12">
        <div className="hidden md:flex items-center gap-2 font-display text-2xl text-brand uppercase tracking-tighter mr-8 shrink-0">
          <Trophy className="w-6 h-6" />
          <span>Киндер</span>
        </div>
        <div className="flex justify-around w-full md:w-auto md:gap-8 shrink-0">
          {[
            { id: 'battle', icon: Swords, label: 'Битва' },
            { id: 'reviews', icon: MessageSquare, label: 'Рецензии' },
            { id: 'community', icon: Users, label: 'Клубы' },
            { id: 'users', icon: Trophy, label: 'Топ' },
            { id: 'suggestions', icon: Sparkles, label: 'Советы' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'profile' && !user) {
                  signIn().catch(err => console.error("Profile tab sign in error:", err));
                  return;
                }
                onTabChange(tab.id);
              }}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 transition-all duration-300",
                activeTab === tab.id ? "text-brand scale-110" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon className={cn("w-6 h-6", activeTab === tab.id && "fill-brand/20")} />
              <span className="text-[10px] uppercase font-black tracking-widest hidden md:block">{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-4 z-50 ml-8 shrink-0">
          <UserMenu />
        </div>
      </nav>
      <div className="fixed top-4 right-4 md:hidden flex items-center gap-4 z-50">
        <UserMenu />
      </div>
    </>
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
      <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 bg-slate-900">
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
          className="absolute top-10 left-10 border-4 border-emerald-500 rounded-2xl px-6 py-3 rotate-[-15deg] pointer-events-none z-10 bg-emerald-500/10 backdrop-blur-sm"
        >
          <span className="text-emerald-500 text-5xl font-display uppercase tracking-widest">ЛАЙК</span>
        </motion.div>

        <motion.div 
          style={{ opacity: opacityDislike }}
          className="absolute top-10 right-10 border-4 border-rose-500 rounded-2xl px-6 py-3 rotate-[15deg] pointer-events-none z-10 bg-rose-500/10 backdrop-blur-sm"
        >
          <span className="text-rose-500 text-5xl font-display uppercase tracking-widest">НЕ МОЁ</span>
        </motion.div>

        <motion.div 
          style={{ opacity: opacityNotWatched }}
          className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 border-4 border-brand rounded-2xl px-6 py-3 pointer-events-none z-10 bg-brand/10 backdrop-blur-sm"
        >
          <span className="text-brand text-3xl font-display uppercase tracking-widest text-center block">НЕ СМОТРЕЛ</span>
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-brand px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
              {isMovie ? 'Фильм' : 'Книга'}
            </span>
            {item.genre && (
              <span className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em]">
                {item.genre}
              </span>
            )}
            {(isMovie ? movie?.releaseYear : book?.releaseYear) && (
              <span className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em]">
                {isMovie ? movie?.releaseYear : book?.releaseYear}
              </span>
            )}
          </div>
          <h2 className="text-5xl font-display mb-3 tracking-tighter uppercase leading-[0.9]">{item.title}</h2>
          {(isMovie ? movie?.director : book?.author) && (
            <p className="text-white/50 text-xs mb-4 font-black uppercase tracking-widest">
              {isMovie ? `Режиссер: ${movie?.director}` : `Автор: ${book?.author}`}
            </p>
          )}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-1.5 bg-yellow-400/20 px-3 py-1 rounded-full border border-yellow-400/30">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="font-black text-yellow-400">{(item.rating || 0).toFixed(1)}</span>
            </div>
            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">({item.totalVotes} голосов)</span>
          </div>
          <p className="text-white/70 line-clamp-3 text-sm leading-relaxed font-medium">{item.description}</p>
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
        <div className="w-24 h-24 bg-brand/10 rounded-[2.5rem] flex items-center justify-center mb-8 border-2 border-brand/20">
          <Swords className="w-12 h-12 text-brand animate-pulse" />
        </div>
        <h2 className="text-4xl font-display uppercase tracking-tight mb-3">Загрузка...</h2>
        <p className="text-slate-400 font-medium">
          {items.length < 2 ? `Недостаточно ${contentType === 'movie' ? 'фильмов' : 'книг'} для битвы.` : `Мы подбираем для вас пару ${contentType === 'movie' ? 'фильмов' : 'книг'}.`}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-6 max-w-lg mx-auto w-full h-full min-h-0">
      <div className="flex flex-col gap-6 w-full flex-1 min-h-0 relative">
        {pair.map((item, idx) => {
          const isMovie = item.type === 'movie';
          const movie = isMovie ? item as Movie : null;
          const book = !isMovie ? item as Book : null;
          const posterUrl = isMovie ? movie?.posterUrl : book?.posterUrl;

          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.02, y: idx === 0 ? -4 : 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(item.id)}
              className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl group w-full max-h-[42vh] border-2 border-white/10"
            >
              <img 
                src={posterUrl} 
                alt={item.title} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = isMovie ? 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500' : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=500'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white text-left">
                {item.genre && (
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-2 block">
                    {item.genre}
                  </span>
                )}
                <h3 className="text-3xl font-display uppercase tracking-tighter mb-2 leading-[0.9]">{item.title}</h3>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 bg-yellow-400/20 px-2 py-0.5 rounded-lg border border-yellow-400/30">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">{(item.rating || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-brand/20 px-2 py-0.5 rounded-lg border border-brand/30">
                    <Trophy className="w-3 h-3 text-brand" />
                    <span className="text-[10px] font-black text-brand uppercase tracking-widest">
                      {((item.battleWins || 0) + (item.battleLosses || 0) > 0 
                        ? Math.round(((item.battleWins || 0) / ((item.battleWins || 0) + (item.battleLosses || 0))) * 100) 
                        : 0)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute top-6 right-6 bg-brand text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-xl">
                Выбрать
              </div>
            </motion.button>
          );
        })}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 glass w-16 h-16 md:w-20 md:h-20 rounded-[2rem] shadow-2xl flex items-center justify-center font-display text-2xl md:text-3xl text-brand z-10 border-2 border-white/50">
          VS
        </div>
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
      <div className="h-full min-h-0 overflow-y-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-full gap-8 w-full max-w-3xl mx-auto py-12">
          <div className="text-center space-y-2">
            <h2 className="text-5xl md:text-7xl font-display tracking-tighter uppercase leading-[0.85]">Выберите<br />битву</h2>
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Что вы хотите сравнить сегодня?</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
            <motion.button
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setBattleType('movies')}
            className="group relative h-48 sm:h-80 rounded-[2.5rem] overflow-hidden shadow-2xl bg-brand text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-light to-brand-dark opacity-90" />
            <div className="relative h-full flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform backdrop-blur-md border border-white/20">
                <Swords className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-3xl font-display uppercase tracking-tight">Фильмы</h3>
                <p className="text-white/60 text-[10px] mt-1 font-black uppercase tracking-widest">Лучшие картины</p>
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setBattleType('books')}
            className="group relative h-48 sm:h-80 rounded-[2.5rem] overflow-hidden shadow-2xl bg-emerald-600 text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-800 opacity-90" />
            <div className="relative h-full flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform backdrop-blur-md border border-white/20">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-3xl font-display uppercase tracking-tight">Книги</h3>
                <p className="text-white/60 text-[10px] mt-1 font-black uppercase tracking-widest">Лучшие произведения</p>
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="h-full relative">
      <button 
        onClick={() => setBattleType(null)}
        className="absolute top-4 left-4 z-20 glass p-2 rounded-full shadow-sm hover:bg-white transition-colors border border-white/50 flex items-center gap-2 px-3"
      >
        <X className="w-4 h-4 text-slate-600" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Назад</span>
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

  if (items.length === 0 && contentType !== 'user') {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <div className="w-24 h-24 bg-brand/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border-2 border-brand/20">
          <Trophy className="w-12 h-12 text-brand animate-pulse" />
        </div>
        <h2 className="text-4xl font-display uppercase tracking-tight mb-3">Загрузка...</h2>
        <p className="text-slate-400 font-medium mb-8">Мы готовим для вас список лучших {contentType === 'movie' ? 'фильмов' : 'книг'}.</p>
        {isAdmin && onSync && (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="btn-primary inline-flex items-center gap-3"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Синхронизация...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Синхронизировать
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 h-full overflow-y-auto pb-32">
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-6xl font-display uppercase tracking-tighter leading-none">Рейтинг</h2>
        <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center">
          <Trophy className="w-8 h-8 text-brand" />
        </div>
      </div>

      <div className="flex gap-2 mb-10 glass p-1.5 rounded-3xl">
        {[
          { id: 'movie', label: 'Фильмы' },
          { id: 'book', label: 'Книги' },
          { id: 'user', label: 'Топ' },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setContentType(tab.id as any)} 
            className={cn(
              "flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all", 
              contentType === tab.id ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-slate-400 hover:text-slate-600"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-8 mb-12">
        {contentType !== 'user' && (
          <>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Сортировать по</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'likes', label: 'Лайкам', icon: Heart },
                  { id: 'rating', label: 'Рейтингу', icon: Star },
                  { id: 'wins', label: 'Победам', icon: Swords },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSortBy(opt.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2",
                      sortBy === opt.id ? "bg-brand border-brand text-white shadow-lg shadow-brand/20" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Жанр</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedGenre(null)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2",
                    selectedGenre === null ? "bg-brand border-brand text-white shadow-lg shadow-brand/20" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  Все
                </button>
                {genres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2",
                      selectedGenre === genre ? "bg-brand border-brand text-white shadow-lg shadow-brand/20" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4 mb-12">
        {loadingUsers ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-brand animate-spin" />
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
                  className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 cursor-pointer hover:shadow-xl hover:border-brand/20 transition-all group"
                >
                  <div className="w-14 h-14 bg-brand/5 rounded-2xl flex items-center justify-center text-brand font-display text-2xl shrink-0 overflow-hidden border border-brand/10">
                    {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : user.displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-2xl uppercase tracking-tight group-hover:text-brand transition-colors truncate">{user.displayName || 'Пользователь'}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1.5 bg-yellow-400/10 px-2 py-0.5 rounded-lg border border-yellow-400/20">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">{user.totalLikesReceived || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-rose-400/10 px-2 py-0.5 rounded-lg border border-rose-400/20">
                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{user.totalCommentLikesReceived || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-4xl font-display text-slate-100 group-hover:text-brand/10 text-right transition-colors">
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
                className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-6 cursor-pointer hover:shadow-xl hover:border-brand/20 transition-all group relative overflow-hidden"
              >
                <div className="shrink-0 relative">
                  <img 
                    src={posterUrl} 
                    alt="" 
                    className="w-20 h-28 object-cover rounded-2xl shadow-lg ring-1 ring-black/5"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.src = isMovie ? 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500' : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=500'; }}
                  />
                  <div className="absolute -top-2 -left-2 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-display text-sm shadow-lg border-2 border-white">
                    {idx + 1 + (currentPage - 1) * limit}
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-display text-2xl uppercase tracking-tighter group-hover:text-brand transition-colors mb-2 line-clamp-1 leading-none">{item.title}</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1 bg-yellow-400/10 px-2 py-0.5 rounded-lg border border-yellow-400/20">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">{(item.rating || 0).toFixed(1)}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                      {isMovie ? movie?.releaseYear : book?.releaseYear} • {isMovie ? `Реж. ${movie?.director}` : `Авт. ${book?.author}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      <span className="text-xs font-black text-slate-900">{item.swipeLikes}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Swords className="w-4 h-4 text-brand" />
                      <span className="text-xs font-black text-brand">{item.battleWins}</span>
                      <span className="text-slate-200">/</span>
                      <span className="text-xs font-black text-rose-400">{item.battleLosses}</span>
                    </div>
                  </div>
                </div>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all">
                  <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-20 glass rounded-[2.5rem]">
            <Sparkles className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Ничего не найдено</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-3 rounded-2xl glass text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors border border-white/50"
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
                    "w-12 h-12 rounded-2xl font-black text-xs transition-all",
                    currentPage === pageNum 
                      ? "bg-brand text-white shadow-lg shadow-brand/20" 
                      : "glass text-slate-500 hover:bg-white border border-white/50"
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
            className="p-3 rounded-2xl glass text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors border border-white/50"
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
    <div className="h-full overflow-y-auto pb-32 scrollbar-hide">
      <div className="max-w-2xl mx-auto py-12 px-6 space-y-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-5xl font-display uppercase tracking-tighter leading-none mb-2">Советы</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Персональные рекомендации ИИ</p>
          </div>
          <button 
            onClick={fetchSuggestions}
            disabled={loading}
            className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-brand hover:bg-white transition-all disabled:opacity-50 group"
          >
            <RefreshCw className={cn("w-6 h-6", loading && "animate-spin")} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 glass rounded-[2.5rem] border-2 border-brand/10">
            <div className="w-20 h-20 bg-brand/10 rounded-[2rem] flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-brand animate-spin" />
            </div>
            <p className="text-xl font-display uppercase tracking-tight text-slate-900">Анализируем вкусы...</p>
            <p className="text-sm text-slate-400 font-medium mt-2">Ищем что-то особенное для вас</p>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="grid gap-6">
            {suggestions.map((s, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-brand/20 transition-all group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={cn(
                    "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border",
                    s.type === 'movie' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                  )}>
                    {s.type === 'movie' ? 'Кино' : 'Книга'}
                  </div>
                  <Sparkles className="w-6 h-6 text-brand/20 group-hover:text-brand transition-colors" />
                </div>
                <h3 className="text-3xl font-display uppercase tracking-tighter mb-4 group-hover:text-brand transition-colors leading-none">{s.title}</h3>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">{s.description}</p>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-xs text-slate-400 leading-relaxed italic">
                    <span className="font-black text-slate-900 not-italic uppercase tracking-widest text-[10px] block mb-2">Почему вам понравится:</span>
                    {s.reason}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 glass rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-2xl font-display uppercase tracking-tight text-slate-400 mb-2">Пусто</h3>
            <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">Оцените больше контента, чтобы ИИ смог понять ваши предпочтения</p>
          </div>
        )}
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
      setMessages(prev => [...prev, { role: 'ai', text: response || 'Извините, я не смог обработать ваш запрос.' }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', text: 'Ошибка подключения к ИИ.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-full p-6 pb-40">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20">
          <MessageSquare className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-display uppercase tracking-tighter leading-none mb-1">Кино-Эксперт</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Спросите что угодно о кино и книгах</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-24 glass rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <Sparkles className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium max-w-xs mx-auto">Попробуйте спросить: "Какие фантастические фильмы из 90-х стоит посмотреть?"</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "flex",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "max-w-[85%] p-5 rounded-[1.5rem] text-sm leading-relaxed font-medium shadow-sm",
              msg.role === 'user' 
                ? "bg-brand text-white rounded-tr-none shadow-brand/10" 
                : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
            )}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-5 rounded-[1.5rem] rounded-tl-none border border-slate-100 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-brand/40 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-brand/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-brand/40 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 bg-white p-3 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Напишите сообщение..."
          className="flex-1 bg-transparent px-6 py-3 outline-none font-medium text-slate-900 placeholder:text-slate-300"
        />
        <button 
          onClick={handleSend}
          disabled={loading}
          className="bg-brand text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-brand-dark transition-all disabled:opacity-50 shadow-lg shadow-brand/20"
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
  isLiked,
  onToggleLike,
  onUserClick
}: { 
  content: Content, 
  onClose: () => void, 
  onSelect: (item: Content) => void,
  isFavorite: boolean,
  onToggleFavorite: (isFav: boolean) => void,
  isLiked: boolean,
  onToggleLike: (isLiked: boolean) => void,
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
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[60] flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        onClick={e => e.stopPropagation()}
        className="bg-slate-50 w-full max-w-4xl h-[95vh] md:h-[85vh] rounded-t-[3rem] md:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="relative h-96 shrink-0">
          <img 
            src={backdropUrl || posterUrl} 
            alt="" 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
            onError={(e) => { e.currentTarget.src = isMovie ? 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500' : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=500'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-900/40 to-transparent" />
          
          <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
            <button 
              onClick={onClose}
              className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleLike(!isLiked); }}
                className={cn(
                  "w-12 h-12 glass rounded-2xl flex items-center justify-center transition-all",
                  isLiked ? "bg-rose-500 text-white border-rose-400" : "text-white hover:bg-white/20"
                )}
              >
                <Heart className={cn("w-6 h-6", isLiked ? "fill-white" : "")} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(!isFavorite); }}
                className={cn(
                  "w-12 h-12 glass rounded-2xl flex items-center justify-center transition-all",
                  isFavorite ? "bg-brand text-white border-brand/40" : "text-white hover:bg-white/20"
                )}
              >
                <Bookmark className={cn("w-6 h-6", isFavorite ? "fill-white" : "")} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowCollectionPicker(!showCollectionPicker); }}
                className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-white hover:bg-white/20 transition-all"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="absolute bottom-8 left-8 right-8 flex gap-8 items-end">
            <div className="hidden md:block w-40 h-60 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white shrink-0">
              <img src={posterUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = isMovie ? 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500' : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=500'; }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 glass rounded-lg text-[10px] font-black uppercase tracking-widest text-white border border-white/20">
                  {content.genre}
                </span>
                <span className="px-3 py-1 glass rounded-lg text-[10px] font-black uppercase tracking-widest text-white border border-white/20">
                  {isMovie ? movie?.releaseYear : book?.releaseYear}
                </span>
              </div>
              <h2 className="text-6xl font-display uppercase tracking-tighter text-white leading-none mb-2 drop-shadow-2xl">{content.title}</h2>
              <p className="text-white/80 font-medium text-lg drop-shadow-lg">
                {isMovie ? `Режиссер: ${movie?.director}` : `Автор: ${book?.author}`}
              </p>
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
            onClick={(e) => { e.stopPropagation(); onToggleLike(!isLiked); }}
            className="absolute top-4 right-28 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors"
          >
            <Heart className={cn("w-5 h-5", isLiked ? "fill-red-500 text-red-500" : "")} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowCollectionPicker(!showCollectionPicker); }}
            className="absolute top-4 right-40 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
          {showCollectionPicker && (
            <div className="absolute top-20 right-6 w-72 bg-white rounded-[2rem] shadow-2xl p-6 z-50 border border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-widest mb-4 text-slate-400">Добавить в коллекцию</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                {userCollections.map(col => (
                  <button 
                    key={col.id}
                    onClick={async () => {
                      await MovieService.addContentToCollection(col.id, content.id, content.type);
                      setShowCollectionPicker(false);
                    }}
                    className="w-full text-left p-4 hover:bg-brand/5 rounded-2xl transition-all text-sm font-bold text-slate-600 flex items-center justify-between group"
                  >
                    <span className="truncate group-hover:text-brand">{col.name}</span>
                    <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 text-brand" />
                  </button>
                ))}
                {userCollections.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">У вас пока нет коллекций</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-10">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">О чем это</h3>
                <p className="text-slate-600 leading-relaxed text-lg font-medium">{content.description}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Отзывы</h3>
                  <div className="flex items-center gap-2 bg-yellow-400/10 px-3 py-1 rounded-xl border border-yellow-400/20">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-black text-yellow-700">{(content.rating || 0).toFixed(1)}</span>
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

            <div className="space-y-10">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Похожее</h3>
                <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                  {similarItems.slice(0, 4).map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => onSelect(item)}
                      className="group cursor-pointer flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 hover:shadow-lg hover:border-brand/20 transition-all"
                    >
                      <img 
                        src={item.posterUrl} 
                        alt="" 
                        className="w-16 h-24 object-cover rounded-xl shadow-md group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.currentTarget.src = isMovie ? 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=500' : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=500'; }}
                      />
                      <div className="min-w-0">
                        <h4 className="font-display text-lg uppercase tracking-tighter group-hover:text-brand transition-colors truncate leading-none mb-1">{item.title}</h4>
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-[10px] font-black text-slate-400">{(item.rating || 0).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-brand/5 p-8 rounded-[2.5rem] border border-brand/10">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand mb-6">Статистика</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Лайки</span>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      <span className="font-display text-xl">{content.swipeLikes}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Победы</span>
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4 text-brand" />
                      <span className="font-display text-xl text-brand">{content.battleWins}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Поражения</span>
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-rose-400" />
                      <span className="font-display text-xl text-rose-400">{content.battleLosses}</span>
                    </div>
                  </div>
                </div>
              </div>
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
  const [activeTab, setActiveTab] = useState<'liked' | 'reviews' | 'comments' | 'collections' | 'chat'>('liked');
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
    <div className="max-w-2xl mx-auto py-8 px-4 pb-32 h-full overflow-y-auto">
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
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-3xl font-black tracking-tight">{displayUser?.displayName || 'Пользователь'}</h2>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1",
              MovieService.getTitleColor(MovieService.getUserTitle(reviews.length))
            )}>
              <Award className="w-3 h-3" />
              {MovieService.getUserTitle(reviews.length)}
            </span>
          </div>
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
          { id: 'liked', label: 'Понравившееся', icon: Heart },
          { id: 'collections', label: 'Коллекции', icon: BookOpen },
          { id: 'reviews', label: 'Рецензии', icon: Star },
          { id: 'comments', label: 'Комментарии', icon: MessageSquare },
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

      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.map((review) => {
            const item = [...allMovies, ...allBooks].find(i => i.id === review.contentId);
            return (
              <div key={review.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img src={item?.posterUrl} className="w-10 h-14 object-cover rounded-lg shadow-sm" />
                    <div>
                      <h4 className="font-bold text-sm">{item?.title}</h4>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-bold">{review.rating}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => MovieService.likeReview(review.id, review.userId)}
                    className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-pink-500 transition-colors"
                  >
                    <Heart className="w-3 h-3" />
                    <span>{(review as any).likes || 0}</span>
                  </button>
                </div>
                <p className="text-sm text-gray-700 italic mb-3">"{review.comment}"</p>
                <div className="border-t border-gray-50 pt-3">
                  <button 
                    onClick={() => {
                      const text = prompt('Ваш комментарий к отзыву:');
                      if (text && item) MovieService.addComment(item.id, item.type, text, review.id, review.userId);
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>{(review as any).commentCount || 0} комментов</span>
                  </button>
                </div>
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-indigo-600" />
                    <span className="text-xs font-bold text-gray-400">{item?.title}</span>
                  </div>
                  <button 
                    onClick={() => MovieService.likeComment(comment.id, comment.userId)}
                    className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-pink-500 transition-colors"
                  >
                    <Heart className="w-3 h-3" />
                    {comment.likes || 0}
                  </button>
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
  const [reviews, setReviews] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    
    // Set online status
    MovieService.updatePresence(user.uid, true);
    
    // Update presence every 2 minutes as a heartbeat
    const interval = setInterval(() => {
      MovieService.updatePresence(user.uid, true);
    }, 120000);
    
    // Set offline status on unmount
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        MovieService.updatePresence(user.uid, false);
      } else {
        MovieService.updatePresence(user.uid, true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      MovieService.updatePresence(user.uid, false);
    };
  }, [user?.uid]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [email, setEmail] = useState('');
  const [isEmailLinkSent, setIsEmailLinkSent] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isProcessingEmailLink, setIsProcessingEmailLink] = useState(false);
  const [emailPromptVisible, setEmailPromptVisible] = useState(false);

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

  const isSigningIn = useRef(false);

  const handleEmailPromptSubmit = async (emailForSignIn: string) => {
    const trimmedEmail = emailForSignIn.trim();
    if (!trimmedEmail) return;
    
    setIsProcessingEmailLink(true);
    
    try {
      await signInWithEmailLink(auth, trimmedEmail, window.location.href);
      window.localStorage.removeItem('emailForSignIn');
      console.log("Email link sign in successful");
      window.history.replaceState(null, '', window.location.pathname);
      setEmailPromptVisible(false);
    } catch (err: any) {
      console.error("Email link sign in error:", err);
      if (err.code === 'auth/expired-action-code' || err.code === 'auth/invalid-action-code') {
        try {
          const actionCodeSettings = {
            url: window.location.origin + window.location.pathname,
            handleCodeInApp: true,
          };
          await sendSignInLinkToEmail(auth, trimmedEmail, actionCodeSettings);
          window.localStorage.setItem('emailForSignIn', trimmedEmail);
          alert("Старая ссылка устарела или уже была использована. Мы отправили новую ссылку на ваш email!");
          window.history.replaceState(null, '', window.location.pathname);
          setEmailPromptVisible(false);
          setIsEmailLinkSent(true);
          setEmail(trimmedEmail);
        } catch (sendErr: any) {
          console.error("Error sending new link:", sendErr);
          alert(`Не удалось отправить новую ссылку: ${sendErr.message}`);
          window.history.replaceState(null, '', window.location.pathname);
          setEmailPromptVisible(false);
        }
      } else if (err.code === 'auth/invalid-email') {
        alert("Ошибка: Неверный email адрес. Пожалуйста, убедитесь, что вы ввели тот же email, на который была отправлена ссылка.");
      } else if (err.code === 'auth/quota-exceeded') {
        alert("Ошибка: Превышен дневной лимит на вход по ссылке. Пожалуйста, используйте вход через Google или попробуйте завтра.");
        window.history.replaceState(null, '', window.location.pathname);
        setEmailPromptVisible(false);
      } else {
        alert(`Ошибка при входе по ссылке: ${err.message || err}\n\nКод ошибки: ${err.code || 'unknown'}`);
        window.history.replaceState(null, '', window.location.pathname);
        setEmailPromptVisible(false);
      }
    } finally {
      isSigningIn.current = false;
      setIsProcessingEmailLink(false);
    }
  };

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      if (isSigningIn.current) return;
      isSigningIn.current = true;
      setIsProcessingEmailLink(true);
      
      let emailForSignIn = window.localStorage.getItem('emailForSignIn');
      if (!emailForSignIn) {
        setEmailPromptVisible(true);
        setIsProcessingEmailLink(false);
        // We don't set isSigningIn.current to false here because we are waiting for user input
        // The actual sign in will happen when the user submits the prompt
      } else {
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then((result) => {
            window.localStorage.removeItem('emailForSignIn');
            console.log("Email link sign in successful");
            // Clean up the URL so it doesn't trigger again on refresh
            window.history.replaceState(null, '', window.location.pathname);
          })
          .catch(async (err) => {
            console.error("Email link sign in error:", err);
            if (err.code === 'auth/expired-action-code' || err.code === 'auth/invalid-action-code') {
              try {
                const actionCodeSettings = {
                  url: window.location.origin + window.location.pathname,
                  handleCodeInApp: true,
                };
                await sendSignInLinkToEmail(auth, emailForSignIn!, actionCodeSettings);
                alert("Старая ссылка устарела или уже была использована. Мы отправили новую ссылку на ваш email!");
                window.history.replaceState(null, '', window.location.pathname);
                setIsEmailLinkSent(true);
                setEmail(emailForSignIn!);
              } catch (sendErr: any) {
                console.error("Error sending new link:", sendErr);
                alert(`Не удалось отправить новую ссылку: ${sendErr.message}`);
                window.history.replaceState(null, '', window.location.pathname);
              }
            } else if (err.code === 'auth/invalid-email') {
              alert("Ошибка: Неверный email адрес. Пожалуйста, убедитесь, что вы ввели тот же email, на который была отправлена ссылка.");
              setEmailPromptVisible(true);
            } else if (err.code === 'auth/quota-exceeded') {
              alert("Ошибка: Превышен дневной лимит на вход по ссылке. Пожалуйста, используйте вход через Google или попробуйте завтра.");
              window.history.replaceState(null, '', window.location.pathname);
            } else {
              alert(`Ошибка при входе по ссылке: ${err.message || err}\n\nКод ошибки: ${err.code || 'unknown'}`);
              window.history.replaceState(null, '', window.location.pathname);
            }
          })
          .finally(() => {
            isSigningIn.current = false;
            setIsProcessingEmailLink(false);
          });
      }
    }
  }, []);

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

    console.log('Attaching reviews listener...');
    const unsubReviews = MovieService.getAllReviews((r) => {
      console.log(`Reviews updated: ${r.length} reviews found`);
      setReviews(r);
    });

    return () => {
      unsubMovies();
      unsubBooks();
      unsubReviews();
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
    <div className="h-screen bg-gray-50 pb-32 md:pt-20 overflow-hidden flex flex-col">
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
            {activeTab === 'reviews' && (
              <ReviewsView 
                reviews={reviews} 
                movies={movies} 
                books={books} 
                onAddContent={() => console.log('Add content modal')}
                onContentClick={(content) => setSelectedContent(content)}
              />
            )}
            {activeTab === 'community' && !selectedClub && (
              <CommunityView onSelectClub={setSelectedClub} />
            )}
            {activeTab === 'users' && !selectedClub && (
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
            {selectedClub && (
              <ClubDetailView club={selectedClub} onClose={() => setSelectedClub(null)} />
            )}
            {activeTab === 'battle' && (
              <BattleMainView movies={movies} books={books} onBattle={handleBattle} />
            )}
            {activeTab === 'suggestions' && (
              <SuggestionsView 
                userProfile={userProfile} 
                movies={movies} 
                books={books} 
                onSelect={setSelectedContent} 
              />
            )}
            {activeTab === 'settings' && (
              <div className="p-4 space-y-4">
                <AdminSeeder />
                <ImageValidator />
              </div>
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
            isLiked={
              selectedContent.type === 'movie' 
                ? userProfile?.likedMovies?.includes(selectedContent.id) || false
                : userProfile?.likedBooks?.includes(selectedContent.id) || false
            }
            onToggleLike={(isLiked) => {
              if (!user) {
                console.log("Toggle like attempted, but no user. Calling signIn...");
                signIn().catch(err => console.error("Toggle like sign in error:", err));
                return;
              }
              MovieService.toggleLike(selectedContent.id, selectedContent.type, user.uid, isLiked);
            }}
            onUserClick={handleUserClick}
          />
        )}
      </AnimatePresence>

      {!user && activeTab !== 'ranking' && !isProcessingEmailLink && !emailPromptVisible && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-black mb-2">Присоединяйтесь!</h2>
            <p className="text-gray-500 mb-8">Войдите, чтобы оценивать фильмы, участвовать в битвах и оставлять отзывы!</p>
            
            {!isEmailLinkSent ? (
              <div className="space-y-4">
                <button 
                  onClick={async () => {
                    try {
                      await signIn();
                    } catch (err) {
                      console.error("Sign in error:", err);
                    }
                  }}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Войти через Google
                </button>
                <div className="text-gray-400 text-sm">или</div>
                <input 
                  type="email" 
                  placeholder="Ваш email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-gray-200"
                />
                <button 
                  onClick={async () => {
                    if (!email.trim() || isSendingLink) return;
                    
                    // Basic email validation
                    if (!email.includes('@') || !email.includes('.')) {
                      alert("Пожалуйста, введите корректный адрес электронной почты.");
                      return;
                    }

                    setIsSendingLink(true);
                    try {
                      const actionCodeSettings = {
                        // Use origin + pathname to ensure a clean URL for the redirect
                        url: window.location.origin + window.location.pathname,
                        handleCodeInApp: true,
                      };
                      
                      console.log("Sending sign-in link to:", email.trim());
                      console.log("Redirect URL:", actionCodeSettings.url);
                      
                      await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings);
                      window.localStorage.setItem('emailForSignIn', email.trim());
                      setIsEmailLinkSent(true);
                    } catch (err: any) {
                      console.error("Email link error:", err);
                      if (err.code === 'auth/unauthorized-domain') {
                        alert(`Ошибка: Домен не авторизован.\n\nПожалуйста, добавьте "${window.location.hostname}" в список разрешенных доменов в Firebase Console (Authentication -> Settings -> Authorized domains).`);
                      } else if (err.code === 'auth/operation-not-allowed') {
                        alert("Ошибка: Вход по ссылке (Email Link) не включен в Firebase.\n\nПерейдите в Firebase Console -> Authentication -> Sign-in method -> Email/Password и включите 'Email link (passwordless sign-in)'.");
                      } else if (err.code === 'auth/invalid-email') {
                        alert("Ошибка: Некорректный адрес электронной почты.");
                      } else if (err.code === 'auth/too-many-requests') {
                        alert("Ошибка: Слишком много запросов. Пожалуйста, попробуйте позже.");
                      } else if (err.code === 'auth/quota-exceeded') {
                        alert("Ошибка: Превышен дневной лимит на отправку ссылок для входа. Пожалуйста, используйте вход через Google или попробуйте завтра.");
                      } else {
                        alert(`Ошибка при отправке ссылки: ${err.message || err}\n\nКод ошибки: ${err.code || 'unknown'}`);
                      }
                    } finally {
                      setIsSendingLink(false);
                    }
                  }}
                  disabled={isSendingLink}
                  className="w-full bg-gray-100 text-gray-800 py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSendingLink && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isSendingLink ? "Отправка..." : "Получить ссылку на почту"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-indigo-600 font-bold">Ссылка для входа отправлена на {email}!</p>
                <p className="text-gray-500 text-sm">Проверьте папку "Спам", если письмо не пришло.</p>
                <button 
                  onClick={() => setIsEmailLinkSent(false)}
                  className="text-indigo-600 font-bold text-sm hover:underline"
                >
                  Попробовать другой email или отправить снова
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isProcessingEmailLink && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <h2 className="text-xl font-black mb-2">Выполняется вход...</h2>
            <p className="text-gray-500">Пожалуйста, подождите</p>
          </div>
        </div>
      )}

      {emailPromptVisible && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-2xl font-black mb-2">Подтверждение</h2>
            <p className="text-gray-500 mb-6">Пожалуйста, введите ваш email для завершения входа</p>
            <input 
              type="email" 
              placeholder="Ваш email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-2xl border border-gray-200 mb-4"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setEmailPromptVisible(false);
                  setIsProcessingEmailLink(false);
                  isSigningIn.current = false;
                }}
                className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                Отмена
              </button>
              <button 
                onClick={() => handleEmailPromptSubmit(email)}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all"
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
