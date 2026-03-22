import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Film, BookOpen } from 'lucide-react';
import { MovieService } from '../services/movieService';
import { GeminiService } from '../services/geminiService';
import { auth } from '../firebase';

export const SuggestionsView = ({ movies = [], books = [] }: any) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!auth.currentUser) return;
      
      // Wait for movies/books to load before fetching suggestions
      if (movies.length === 0 && books.length === 0) return;
      
      setLoading(true);
      try {
        const userData = await MovieService.getUserData(auth.currentUser.uid);
        
        // Use battle wins instead of swipe likes
        const wonMovieIds = userData?.battleWonMovies || [];
        const wonBookIds = userData?.battleWonBooks || [];
        
        if (wonMovieIds.length === 0 && wonBookIds.length === 0) {
          setHasData(false);
          setLoading(false);
          return;
        }
        
        setHasData(true);
        
        // Map IDs to titles
        const wonMovieTitles = wonMovieIds
          .map((id: string) => movies.find((m: any) => m.id === id)?.title)
          .filter(Boolean);
          
        const wonBookTitles = wonBookIds
          .map((id: string) => books.find((b: any) => b.id === id)?.title)
          .filter(Boolean);
        
        const recommendations = await GeminiService.getContentSuggestions(wonMovieTitles, wonBookTitles);
        setSuggestions(recommendations);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSuggestions();
  }, [movies, books]);

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Sparkles className="text-indigo-600" />
        Рекомендации для вас
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : !hasData ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">Пока нет рекомендаций</h3>
          <p className="text-gray-500">
            Участвуйте в битвах, чтобы мы могли понять ваши предпочтения и предложить что-то интересное!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((s: any, idx: number) => (
            <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                {s.type === 'movie' ? <Film className="w-5 h-5 text-blue-500" /> : <BookOpen className="w-5 h-5 text-green-500" />}
                <h3 className="font-bold text-lg">{s.title}</h3>
              </div>
              <p className="text-gray-700 mb-2">{s.description}</p>
              <p className="text-sm text-indigo-600 font-medium">{s.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
