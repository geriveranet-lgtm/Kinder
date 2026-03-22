import React, { useState } from 'react';
import { Database, Loader2 } from 'lucide-react';
import { collection, getDocs, updateDoc, doc, db } from '../firebase';
import { getPlaceholderUrl, validateImageUrl } from '../utils/imageUtils';

export const ImageValidator = () => {
  const [loading, setLoading] = useState(false);

  const validateAndFix = async (collectionName: string) => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, collectionName));
      for (const itemDoc of snap.docs) {
        const item = itemDoc.data();
        if (item.posterUrl) {
          const isValid = await validateImageUrl(item.posterUrl);
          if (!isValid) {
            await updateDoc(doc(db, collectionName, itemDoc.id), {
              posterUrl: getPlaceholderUrl(item.title)
            });
          }
        }
      }
      alert(`Проверка ${collectionName} завершена!`);
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка при проверке');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button onClick={() => validateAndFix('movies')} disabled={loading} className="flex items-center gap-2 bg-indigo-600 text-white p-3 rounded-2xl font-bold">
        {loading ? <Loader2 className="animate-spin" /> : <Database />}
        Проверить фильмы
      </button>
      <button onClick={() => validateAndFix('books')} disabled={loading} className="flex items-center gap-2 bg-indigo-600 text-white p-3 rounded-2xl font-bold">
        {loading ? <Loader2 className="animate-spin" /> : <Database />}
        Проверить книги
      </button>
    </div>
  );
};
