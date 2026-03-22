import React, { useState } from 'react';
import { Database, Loader2 } from 'lucide-react';
import { collection, addDoc, db } from '../firebase';
import { initialMovies } from '../data/movies';

export const AdminSeeder = () => {
  const [loading, setLoading] = useState(false);

  const seedDatabase = async () => {
    setLoading(true);
    try {
      for (const movie of initialMovies) {
        await addDoc(collection(db, 'movies'), movie);
      }
      alert('Фильмы успешно загружены!');
    } catch (error) {
      console.error('Ошибка при загрузке фильмов:', error);
      alert('Ошибка при загрузке фильмов');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={seedDatabase} 
      disabled={loading}
      className="flex items-center gap-2 bg-indigo-600 text-white p-3 rounded-2xl font-bold"
    >
      {loading ? <Loader2 className="animate-spin" /> : <Database />}
      Загрузить фильмы в БД
    </button>
  );
};
