import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where, 
  onSnapshot, 
  serverTimestamp,
  increment,
  getDoc,
  setDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { initialMovies } from '../data/movies';

export interface Collection {
  id: string;
  userId: string;
  userName: string;
  name: string;
  description: string;
  items: { id: string; type: 'movie' | 'book' }[];
  isPublic: boolean;
  favoritesCount: number;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  likedMovies?: string[];
  likedBooks?: string[];
  battleWonMovies?: string[];
  battleWonBooks?: string[];
  favoriteMovies?: string[];
  favoriteBooks?: string[];
  favoriteCollections?: string[];
  totalLikesReceived?: number;
  totalCommentsReceived?: number;
  totalCommentLikesReceived?: number;
  totalReviews?: number;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  rating: number;
  totalVotes: number;
  battleWins: number;
  battleLosses: number;
  swipeLikes: number;
  swipeDislikes: number;
  swipeNotWatched: number;
  actors?: string[];
  budget?: string;
  director?: string;
  releaseYear?: number;
  genre?: string;
  backdropUrl?: string;
  type: 'movie';
}

export interface Book {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  rating: number;
  totalVotes: number;
  battleWins: number;
  battleLosses: number;
  swipeLikes: number;
  swipeDislikes: number;
  swipeNotWatched: number;
  author: string;
  authorDescription?: string;
  pages?: number;
  publisher?: string;
  releaseYear?: number;
  genre?: string;
  type: 'book';
}

export type Content = Movie | Book;

export interface Review {
  id: string;
  userId: string;
  userName: string;
  contentId: string;
  contentType: 'movie' | 'book';
  rating: number;
  comment: string;
  likes?: number;
  commentCount?: number;
  createdAt: any;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  contentId: string;
  contentType: 'movie' | 'book';
  reviewId?: string;
  text: string;
  likes?: number;
  createdAt: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let isSeeding = false;

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: any;
}

export const MovieService = {
  isSeeding: () => isSeeding,

  getMovies: (callback: (movies: Movie[]) => void) => {
    const path = 'movies';
    const q = query(collection(db, path), orderBy('rating', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const movies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'movie' } as Movie));
      callback(movies);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  getBooks: (callback: (books: Book[]) => void) => {
    const path = 'books';
    const q = query(collection(db, path), orderBy('rating', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'book' } as Book));
      callback(books);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  getAllReviews: (callback: (reviews: any[]) => void) => {
    const path = 'reviews';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(reviews);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  getTopMovies: (callback: (movies: Movie[]) => void) => {
    const path = 'movies';
    const q = query(collection(db, path), orderBy('rating', 'desc'), limit(10));
    return onSnapshot(q, (snapshot) => {
      const movies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'movie' } as Movie));
      callback(movies);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  getTopBooks: (callback: (books: Book[]) => void) => {
    const path = 'books';
    const q = query(collection(db, path), orderBy('rating', 'desc'), limit(10));
    return onSnapshot(q, (snapshot) => {
      const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'book' } as Book));
      callback(books);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  getSimilarMovies: async (movie: Movie, limitCount: number = 5): Promise<Movie[]> => {
    const path = 'movies';
    try {
      // Get movies with same genre
      let similar: Movie[] = [];
      
      if (movie.genre) {
        const genreQ = query(
          collection(db, path), 
          where('genre', '==', movie.genre),
          limit(limitCount + 1)
        );
        const snapshot = await getDocs(genreQ);
        similar = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Movie))
          .filter(m => m.id !== movie.id);
      }

      // If we don't have enough, try same director
      if (similar.length < limitCount && movie.director) {
        const directorQ = query(
          collection(db, path),
          where('director', '==', movie.director),
          limit(limitCount + 1)
        );
        const directorSnap = await getDocs(directorQ);
        const directorSimilar = directorSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Movie))
          .filter(m => m.id !== movie.id && !similar.some(sm => sm.id === m.id));
        
        similar = [...similar, ...directorSimilar];
      }

      return similar.slice(0, limitCount);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  addMovie: async (movie: Omit<Movie, 'id'>) => {
    const path = 'movies';
    try {
      return await addDoc(collection(db, path), movie);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  swipeContent: async (contentId: string, contentType: 'movie' | 'book', type: 'like' | 'dislike' | 'not_watched') => {
    if (!auth.currentUser) return;
    const swipePath = 'swipes';
    const collectionName = contentType === 'movie' ? 'movies' : 'books';
    try {
      const swipeData = {
        userId: auth.currentUser.uid,
        contentId,
        contentType,
        type,
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, swipePath), swipeData);
      const contentRef = doc(db, collectionName, contentId);
      const fieldMap = {
        like: 'swipeLikes',
        dislike: 'swipeDislikes',
        not_watched: 'swipeNotWatched'
      };
      await updateDoc(contentRef, { [fieldMap[type]]: increment(1) });
      if (type === 'like') {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userField = contentType === 'movie' ? 'likedMovies' : 'likedBooks';
        await setDoc(userRef, { [userField]: arrayUnion(contentId) }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, swipePath);
    }
  },

  battleContent: async (itemAId: string, itemBId: string, winnerId: string, contentType: 'movie' | 'book') => {
    if (!auth.currentUser) return;
    const battlePath = 'battles';
    const collectionName = contentType === 'movie' ? 'movies' : 'books';
    try {
      const battleData = {
        userId: auth.currentUser.uid,
        itemAId,
        itemBId,
        winnerId,
        contentType,
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, battlePath), battleData);
      const winnerRef = doc(db, collectionName, winnerId);
      const loserId = winnerId === itemAId ? itemBId : itemAId;
      const loserRef = doc(db, collectionName, loserId);
      await updateDoc(winnerRef, { battleWins: increment(1) });
      await updateDoc(loserRef, { battleLosses: increment(1) });
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userField = contentType === 'movie' ? 'battleWonMovies' : 'battleWonBooks';
      await setDoc(userRef, { [userField]: arrayUnion(winnerId) }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, battlePath);
    }
  },

  toggleLike: async (contentId: string, contentType: 'movie' | 'book', userId: string, isLiked: boolean) => {
    const userField = contentType === 'movie' ? 'likedMovies' : 'likedBooks';
    const collectionName = contentType === 'movie' ? 'movies' : 'books';
    try {
      await setDoc(doc(db, 'users', userId), {
        [userField]: isLiked ? arrayUnion(contentId) : arrayRemove(contentId)
      }, { merge: true });
      
      const contentRef = doc(db, collectionName, contentId);
      await updateDoc(contentRef, {
        swipeLikes: increment(isLiked ? 1 : -1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users/content');
    }
  },

  toggleFavorite: async (contentId: string, contentType: 'movie' | 'book', userId: string, isFavorite: boolean) => {
    const userField = contentType === 'movie' ? 'favoriteMovies' : 'favoriteBooks';
    try {
      await setDoc(doc(db, 'users', userId), {
        [userField]: isFavorite ? arrayUnion(contentId) : arrayRemove(contentId)
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  },

  toggleFavoriteCollection: async (collectionId: string, userId: string, isFavorite: boolean) => {
    const userRef = doc(db, 'users', userId);
    const collectionRef = doc(db, 'collections', collectionId);
    try {
      await setDoc(userRef, {
        favoriteCollections: isFavorite ? arrayUnion(collectionId) : arrayRemove(collectionId)
      }, { merge: true });
      await updateDoc(collectionRef, {
        favoritesCount: increment(isFavorite ? 1 : -1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'collections');
    }
  },

  createClub: async (name: string, description: string, type: 'book' | 'film') => {
    if (!auth.currentUser) return;
    const path = 'clubs';
    try {
      return await addDoc(collection(db, path), {
        name,
        description,
        type,
        creatorId: auth.currentUser.uid,
        members: [{ userId: auth.currentUser.uid, role: 'admin' }],
        rules: '',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  seedClubs: async () => {
    const path = 'clubs';
    try {
      const snap = await getDocs(collection(db, path));
      if (snap.empty) {
        const testClubs = [
          {
            name: 'Клуб любителей фантастики',
            description: 'Обсуждаем лучшие научно-фантастические фильмы и книги. Присоединяйтесь!',
            type: 'film',
            creatorId: 'test-admin-1',
            members: [
              { userId: 'test-admin-1', role: 'admin' },
              { userId: 'user-2', role: 'member' },
              { userId: 'user-3', role: 'member' },
              { userId: 'user-4', role: 'member' },
              { userId: 'user-5', role: 'member' }
            ],
            rules: 'Без спойлеров!',
            createdAt: serverTimestamp()
          },
          {
            name: 'Классическая литература',
            description: 'Читаем и обсуждаем классику мировой литературы.',
            type: 'book',
            creatorId: 'test-admin-2',
            members: [
              { userId: 'test-admin-2', role: 'admin' },
              { userId: 'user-6', role: 'member' },
              { userId: 'user-7', role: 'member' }
            ],
            rules: 'Уважительное общение.',
            createdAt: serverTimestamp()
          },
          {
            name: 'Кинокритики',
            description: 'Глубокий анализ современного кинематографа.',
            type: 'film',
            creatorId: 'test-admin-3',
            members: [
              { userId: 'test-admin-3', role: 'admin' },
              { userId: 'user-8', role: 'member' },
              { userId: 'user-9', role: 'member' },
              { userId: 'user-10', role: 'member' }
            ],
            rules: 'Аргументируйте свое мнение.',
            createdAt: serverTimestamp()
          }
        ];
        
        for (const club of testClubs) {
          await addDoc(collection(db, path), club);
        }
      }
    } catch (error) {
      console.error('Error seeding clubs:', error);
    }
  },

  getCurrentUserId: () => {
    return auth.currentUser?.uid;
  },

  updatePresence: async (userId: string, isOnline: boolean) => {
    const userRef = doc(db, 'users', userId);
    try {
      await setDoc(userRef, {
        isOnline,
        lastSeen: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  },

  getUsersPresence: (userIds: string[], callback: (presence: Record<string, any>) => void) => {
    if (userIds.length === 0) return () => {};
    
    // Firestore 'in' query is limited to 10 items, but for now we'll just listen to all users
    // In a real app, we'd chunk this or use a different strategy
    const q = query(collection(db, 'users'), where('__name__', 'in', userIds.slice(0, 10)));
    return onSnapshot(q, (snapshot) => {
      const presence: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        presence[doc.id] = doc.data();
      });
      callback(presence);
    });
  },

  getUserTitle: (reviewCount: number) => {
    if (reviewCount >= 500) return 'Легендарный летописец';
    if (reviewCount >= 250) return 'Платиновый оракул';
    if (reviewCount >= 100) return 'Золотой маэстро';
    if (reviewCount >= 50) return 'Серебряный эксперт';
    if (reviewCount >= 25) return 'Бронзовый критик';
    if (reviewCount >= 10) return 'Бумажный рецензент';
    return 'Новичок';
  },

  getTitleColor: (title: string) => {
    switch (title) {
      case 'Легендарный летописец': return 'text-red-600 bg-red-50';
      case 'Платиновый оракул': return 'text-blue-600 bg-blue-50';
      case 'Золотой маэстро': return 'text-amber-600 bg-amber-50';
      case 'Серебряный эксперт': return 'text-gray-600 bg-gray-50';
      case 'Бронзовый критик': return 'text-orange-600 bg-orange-50';
      case 'Бумажный рецензент': return 'text-stone-600 bg-stone-50';
      default: return 'text-gray-400 bg-gray-50';
    }
  },

  joinClub: async (clubId: string) => {
    if (!auth.currentUser) return;
    const clubRef = doc(db, 'clubs', clubId);
    const clubSnap = await getDoc(clubRef);
    if (!clubSnap.exists()) return;
    
    const clubData = clubSnap.data();
    const isAlreadyMember = clubData.members.some((m: any) => m.userId === auth.currentUser?.uid);
    if (isAlreadyMember) return;
    
    const newMember = {
      userId: auth.currentUser.uid,
      role: 'member',
      joinedAt: new Date().toISOString()
    };
    
    try {
      await updateDoc(clubRef, {
        members: [...clubData.members, newMember]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'clubs');
    }
  },

  getClubMembers: (clubId: string, callback: (members: any[]) => void) => {
    const clubRef = doc(db, 'clubs', clubId);
    return onSnapshot(clubRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const clubData = snapshot.data();
      const memberIds = clubData.members.map((m: any) => m.userId);
      
      // Fetch user details for each member
      const usersSnap = await getDocs(query(collection(db, 'users'), where('__name__', 'in', memberIds.slice(0, 10))));
      const userDetails: Record<string, any> = {};
      usersSnap.docs.forEach(doc => {
        userDetails[doc.id] = doc.data();
      });
      
      const fullMembers = clubData.members.map((m: any) => ({
        ...m,
        ...userDetails[m.userId],
        displayName: userDetails[m.userId]?.displayName || 'Anonymous',
        photoURL: userDetails[m.userId]?.photoURL || null
      }));
      
      callback(fullMembers);
    });
  },

  updateMemberRole: async (clubId: string, userId: string, role: 'admin' | 'editor' | 'member') => {
    const clubRef = doc(db, 'clubs', clubId);
    const clubSnap = await getDoc(clubRef);
    if (!clubSnap.exists()) return;
    
    const clubData = clubSnap.data();
    const members = clubData.members.map((m: any) => 
      m.userId === userId ? { ...m, role } : m
    );
    
    try {
      await updateDoc(clubRef, { members });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'clubs');
    }
  },

  removeMember: async (clubId: string, userId: string) => {
    const clubRef = doc(db, 'clubs', clubId);
    const clubSnap = await getDoc(clubRef);
    if (!clubSnap.exists()) return;
    
    const clubData = clubSnap.data();
    const members = clubData.members.filter((m: any) => m.userId !== userId);
    
    try {
      await updateDoc(clubRef, { members });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'clubs');
    }
  },

  getClubs: (callback: (clubs: any[]) => void) => {
    const path = 'clubs';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const clubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(clubs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  getClubDiscussions: (clubId: string, callback: (discussions: any[]) => void) => {
    const path = `clubs/${clubId}/discussions`;
    const q = query(collection(db, path), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const discussions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(discussions);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  addDiscussion: async (clubId: string, text: string) => {
    if (!auth.currentUser) return;
    const path = `clubs/${clubId}/discussions`;
    try {
      await addDoc(collection(db, path), {
        clubId,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
        text,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  addContentToCollection: async (collectionId: string, contentId: string, contentType: 'movie' | 'book') => {
    const collectionRef = doc(db, 'collections', collectionId);
    try {
      await updateDoc(collectionRef, {
        items: arrayUnion({ id: contentId, type: contentType })
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'collections');
    }
  },

  createCollection: async (userId: string, name: string) => {
    const path = 'collections';
    try {
      return await addDoc(collection(db, path), {
        userId,
        name,
        description: '',
        items: [],
        isPublic: false,
        favoritesCount: 0,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  getUserCollections: async (userId: string): Promise<Collection[]> => {
    const path = 'collections';
    let q;
    if (auth.currentUser?.uid === userId) {
      q = query(collection(db, path), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, path), where('userId', '==', userId), where('isPublic', '==', true), orderBy('createdAt', 'desc'));
    }
    try {
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Collection));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  getPublicCollections: async (): Promise<Collection[]> => {
    const path = 'collections';
    const q = query(collection(db, path), where('isPublic', '==', true), orderBy('favoritesCount', 'desc'), limit(20));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Collection));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  getUsersRanking: async (): Promise<UserProfile[]> => {
    const path = 'users';
    // We'll sort by a combination of likes and comments received.
    // Since Firestore doesn't support complex calculated sorting easily, 
    // we'll fetch top users and sort in memory if needed, or just sort by a 'rankScore' field if we had one.
    // For now, let's just fetch users who have some activity.
    const q = query(collection(db, path), limit(50));
    try {
      const snap = await getDocs(q);
      const users = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      return users.sort((a, b) => {
        const scoreA = (a.totalLikesReceived || 0) + (a.totalCommentLikesReceived || 0);
        const scoreB = (b.totalLikesReceived || 0) + (b.totalCommentLikesReceived || 0);
        return scoreB - scoreA;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    try {
      const docSnap = await getDoc(doc(db, 'users', userId));
      return docSnap.exists() ? docSnap.data() as UserProfile : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
      return null;
    }
  },

  subscribeToUserProfile: (userId: string, callback: (profile: UserProfile | null) => void) => {
    const path = `users/${userId}`;
    return onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as UserProfile);
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  addReview: async (contentId: string, contentType: 'movie' | 'book', rating: number, comment: string) => {
    if (!auth.currentUser) return;
    const reviewPath = 'reviews';
    const collectionName = contentType === 'movie' ? 'movies' : 'books';
    try {
      const reviewData = {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
        contentId,
        contentType,
        rating,
        comment,
        likes: 0,
        commentCount: 0,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, reviewPath), reviewData);
      const contentRef = doc(db, collectionName, contentId);
      const contentSnap = await getDoc(contentRef);
      if (contentSnap.exists()) {
        const data = contentSnap.data() as Content;
        const newTotalVotes = (data.totalVotes || 0) + 1;
        const newRating = ((data.rating || 0) * (data.totalVotes || 0) + rating) / newTotalVotes;
        await updateDoc(contentRef, { rating: newRating, totalVotes: newTotalVotes });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, reviewPath);
    }
  },

  likeReview: async (reviewId: string, reviewAuthorId: string) => {
    if (!auth.currentUser) return;
    const reviewRef = doc(db, 'reviews', reviewId);
    const authorRef = doc(db, 'users', reviewAuthorId);
    try {
      await updateDoc(reviewRef, { likes: increment(1) });
      await updateDoc(authorRef, { totalLikesReceived: increment(1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'reviews');
    }
  },

  likeComment: async (commentId: string, commentAuthorId: string) => {
    if (!auth.currentUser) return;
    const commentRef = doc(db, 'comments', commentId);
    const authorRef = doc(db, 'users', commentAuthorId);
    try {
      await updateDoc(commentRef, { likes: increment(1) });
      await updateDoc(authorRef, { totalCommentLikesReceived: increment(1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'comments');
    }
  },

  getReviews: (contentId: string, callback: (reviews: Review[]) => void) => {
    const path = 'reviews';
    const q = query(collection(db, path), where('contentId', '==', contentId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      callback(reviews);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  addComment: async (contentId: string, contentType: 'movie' | 'book', text: string, reviewId?: string, reviewAuthorId?: string) => {
    const path = 'comments';
    if (!auth.currentUser) throw new Error('Must be logged in to comment');
    try {
      await addDoc(collection(db, path), {
        contentId,
        contentType,
        reviewId: reviewId || null,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
        text,
        createdAt: serverTimestamp()
      });
      
      if (reviewId && reviewAuthorId) {
        const reviewRef = doc(db, 'reviews', reviewId);
        const authorRef = doc(db, 'users', reviewAuthorId);
        await updateDoc(reviewRef, { commentCount: increment(1) });
        await updateDoc(authorRef, { totalCommentsReceived: increment(1) });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  getComments: (contentId: string, callback: (comments: Comment[]) => void) => {
    const path = 'comments';
    const q = query(collection(db, path), where('contentId', '==', contentId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      callback(comments);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  getSimilarBooks: async (book: Book, limitCount: number = 5): Promise<Book[]> => {
    const path = 'books';
    try {
      let similar: Book[] = [];
      if (book.genre) {
        const genreQ = query(collection(db, path), where('genre', '==', book.genre), limit(limitCount + 1));
        const snapshot = await getDocs(genreQ);
        similar = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data(), type: 'book' } as Book))
          .filter(b => b.id !== book.id);
      }
      if (similar.length < limitCount && book.author) {
        const authorQ = query(collection(db, path), where('author', '==', book.author), limit(limitCount + 1));
        const authorSnap = await getDocs(authorQ);
        const authorSimilar = authorSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data(), type: 'book' } as Book))
          .filter(b => b.id !== book.id && !similar.some(sb => sb.id === b.id));
        similar = [...similar, ...authorSimilar];
      }
      return similar.slice(0, limitCount);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  updateUserBio: async (userId: string, bio: string) => {
    const userRef = doc(db, 'users', userId);
    try {
      await setDoc(userRef, { bio }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  },

  getUserData: async (userId: string) => {
    const userRef = doc(db, 'users', userId);
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
      return null;
    }
  },

  getUserBattles: async (userId: string) => {
    const path = 'battles';
    const q = query(collection(db, path), where('userId', '==', userId));
    try {
      const snap = await getDocs(q);
      return snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  getUserSwipes: async (userId: string) => {
    const path = 'swipes';
    const q = query(collection(db, path), where('userId', '==', userId));
    try {
      const snap = await getDocs(q);
      return snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  getUserReviews: async (userId: string) => {
    const path = 'reviews';
    const q = query(collection(db, path), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  getUserComments: async (userId: string) => {
    const path = 'comments';
    const q = query(collection(db, path), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  getMessages: (userId1: string, userId2: string, callback: (messages: Message[]) => void) => {
    const path = 'messages';
    const q1 = query(collection(db, path), where('senderId', '==', userId1), where('receiverId', '==', userId2));
    const q2 = query(collection(db, path), where('senderId', '==', userId2), where('receiverId', '==', userId1));
    
    // Firestore doesn't support OR queries across different fields easily with ordering,
    // so we fetch both and merge them in memory.
    let msgs1: Message[] = [];
    let msgs2: Message[] = [];

    const updateCallback = () => {
      const allMsgs = [...msgs1, ...msgs2].sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeA - timeB;
      });
      callback(allMsgs);
    };

    const unsub1 = onSnapshot(q1, (snap) => {
      msgs1 = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      updateCallback();
    }, (error) => handleFirestoreError(error, OperationType.GET, path));

    const unsub2 = onSnapshot(q2, (snap) => {
      msgs2 = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      updateCallback();
    }, (error) => handleFirestoreError(error, OperationType.GET, path));

    return () => {
      unsub1();
      unsub2();
    };
  },

  sendMessage: async (receiverId: string, text: string) => {
    if (!auth.currentUser) return;
    const path = 'messages';
    try {
      await addDoc(collection(db, path), {
        senderId: auth.currentUser.uid,
        receiverId,
        text,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  saveUserProfile: async (user: any) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, {
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email,
        lastLogin: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  },

  cleanupDuplicates: async () => {
    const path = 'movies';
    try {
      const moviesSnap = await getDocs(collection(db, path));
      const movies = moviesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movie));
      
      const englishTitlesToDelete = [
        "Inception", "The Dark Knight", "Interstellar", "Pulp Fiction", 
        "The Matrix", "The Shawshank Redemption", "The Godfather", 
        "Fight Club", "Forrest Gump", "Gladiator", "The Green Mile", 
        "Saving Private Ryan", "Leon", "Schindler's List", "The Prestige", 
        "The Intouchables"
      ];

      for (const movie of movies) {
        if (englishTitlesToDelete.includes(movie.title)) {
          console.log(`Deleting duplicate English title: ${movie.title}`);
          await deleteDoc(doc(db, path, movie.id));
        }
      }
    } catch (error) {
      console.error("Cleanup failed", error);
    }
  },
  
  seedBooks: async () => {
    const path = 'books';
    if (isSeeding) return;
    isSeeding = true;
    try {
      const existingDocs = (await getDocs(collection(db, path))).docs;
      const initialBooks = [
        {
          title: "1984",
          description: "Культовая антиутопия Джорджа Оруэлла о тоталитарном обществе будущего, где Большой Брат следит за каждым твоим шагом, а мысли контролируются полицией мыслей.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/171746.jpg",
          rating: 9.2,
          totalVotes: 180,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Джордж Оруэлл",
          authorDescription: "Британский писатель и публицист. Наиболее известен как автор антиутопического романа «1984» и повести «Скотный двор».",
          pages: 328,
          publisher: "Secker & Warburg",
          releaseYear: 1949,
          genre: "Антиутопия",
          type: "book"
        },
        {
          title: "Мастер и Маргарита",
          description: "Мистический роман Михаила Булгакова, в котором переплетаются три сюжетные линии: визит Воланда в Москву 1930-х годов, история любви Мастера и Маргариты и авторская интерпретация библейских событий.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/171748.jpg",
          rating: 9.8,
          totalVotes: 250,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Михаил Булгаков",
          authorDescription: "Русский писатель советского периода, драматург, театральный режиссёр и актёр. Один из самых читаемых авторов XX века.",
          pages: 480,
          publisher: "YMCA-Press",
          releaseYear: 1967,
          genre: "Классика",
          type: "book"
        },
        {
          title: "Властелин колец",
          description: "Эпическая сага Дж. Р. Р. Толкина о борьбе добра и зла в Средиземье. История о мужестве, дружбе и о том, как даже самый маленький человек может изменить ход истории.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/171774.jpg",
          rating: 9.4,
          totalVotes: 180,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Дж. Р. Р. Толкин",
          authorDescription: "Английский писатель, лингвист, филолог, наиболее известный как автор классических произведений высокого фэнтези: «Хоббит, или Туда и обратно» и «Властелин колец».",
          pages: 1178,
          publisher: "George Allen & Unwin",
          releaseYear: 1954,
          genre: "Фэнтези",
          type: "book"
        },
        {
          title: "Великий Гэтсби",
          description: "Роман Фрэнсиса Скотта Фицджеральда об «американской мечте», роскошных вечеринках эпохи джаза и трагической любви Джея Гэтсби к Дейзи Бьюкенен.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/171776.jpg",
          rating: 8.8,
          totalVotes: 120,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Ф. Скотт Фицджеральд",
          authorDescription: "Американский писатель, крупнейший представитель так называемого «потерянного поколения» в литературе. Наиболее известен романом «Великий Гэтсби».",
          pages: 180,
          publisher: "Charles Scribner's Sons",
          releaseYear: 1925,
          genre: "Классика",
          type: "book"
        },
        {
          title: "Убить пересмешника",
          description: "История о взрослении, справедливости и борьбе с предрассудками в маленьком городке на юге США, рассказанная от лица девочки по прозвищу Глазастик.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/171772.jpg",
          rating: 9.1,
          totalVotes: 140,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Харпер Ли",
          authorDescription: "Американская писательница, автор романа «Убить пересмешника», удостоенного Пулитцеровской премии. Книга стала классикой современной американской литературы.",
          pages: 281,
          publisher: "J. B. Lippincott & Co.",
          releaseYear: 1960,
          genre: "Классика",
          type: "book"
        },
        {
          title: "Преступление и наказание",
          description: "Психологический шедевр Фёдора Достоевского, исследующий границы морали, теорию «сверхчеловека» и муки совести Родиона Раскольникова после совершенного убийства.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/171754.jpg",
          rating: 9.3,
          totalVotes: 160,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Фёдор Достоевский",
          authorDescription: "Один из самых значительных и известных в мире русских писателей и мыслителей. Классик мировой литературы.",
          pages: 671,
          publisher: "Русский вестник",
          releaseYear: 1866,
          genre: "Классика",
          type: "book"
        },
        {
          title: "Война и мир",
          description: "Грандиозная эпопея Льва Толстого, охватывающая жизнь всех слоев русского общества в период наполеоновских войн. Философские размышления о ходе истории и судьбах людей.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/171752.jpg",
          rating: 9.6,
          totalVotes: 250,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Лев Толстой",
          authorDescription: "Один из наиболее известных русских писателей и мыслителей, один из величайших писателей-романистов мира. Просветитель, публицист, религиозный мыслитель.",
          pages: 1225,
          publisher: "Русский вестник",
          releaseYear: 1869,
          genre: "Классика",
          type: "book"
        },
        {
          title: "Евгений Онегин",
          description: "Роман в стихах Александра Пушкина, «энциклопедия русской жизни», повествующая о судьбе скучающего дворянина и его неразделенной любви к Татьяне Лариной.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/171756.jpg",
          rating: 9.4,
          totalVotes: 190,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Александр Пушкин",
          authorDescription: "Русский поэт, драматург и прозаик, заложивший основы русского реалистического направления, критик и теоретик литературы, историк, публицист.",
          pages: 224,
          publisher: "Типография Департамента народного просвещения",
          releaseYear: 1833,
          genre: "Классика",
          type: "book"
        },
        {
          title: "Мертвые души",
          description: "Сатирическая поэма Николая Гоголя о похождениях авантюриста Чичикова, скупающего списки умерших крестьян для своих махинаций. Галерея ярких человеческих типов.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/171758.jpg",
          rating: 9.0,
          totalVotes: 130,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Николай Гоголь",
          authorDescription: "Русский прозаик, драматург, поэт, критик, публицист, признанный одним из классиков русской литературы.",
          pages: 352,
          publisher: "Университетская типография",
          releaseYear: 1842,
          genre: "Классика",
          type: "book"
        },
        {
          title: "Отцы и дети",
          description: "Роман Ивана Тургенева о вечном конфликте поколений и появлении нового типа человека — нигилиста Базарова, отрицающего старые ценности.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/171760.jpg",
          rating: 8.9,
          totalVotes: 110,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Иван Тургенев",
          authorDescription: "Русский писатель-реалист, поэт, публицист, драматург, переводчик. Один из классиков русской литературы, внесший наиболее значительный вклад в её развитие во второй половине XIX века.",
          pages: 288,
          publisher: "Русский вестник",
          releaseYear: 1862,
          genre: "Классика",
          type: "book"
        },
        {
          title: "Герой нашего времени",
          description: "Первый в русской литературе психологический роман Михаила Лермонтова, раскрывающий сложный характер Печорина — «лишнего человека» своего времени.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/171762.jpg",
          rating: 9.2,
          totalVotes: 145,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Михаил Лермонтов",
          authorDescription: "Русский поэт, прозаик, драматург, художник. Творчество Лермонтова, в котором сочетаются гражданские, философские и личные мотивы, ознаменовало собой новый расцвет русской литературы.",
          pages: 256,
          publisher: "Издательство Ильи Глазунова",
          releaseYear: 1840,
          genre: "Классика",
          type: "book"
        },
        {
          title: "Анна Каренина",
          description: "Трагическая история любви Анны Карениной и Алексея Вронского на фоне блестящей и лицемерной жизни высшего света Петербурга и Москвы.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/171764.jpg",
          rating: 9.5,
          totalVotes: 210,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Лев Толстой",
          authorDescription: "Один из наиболее известных русских писателей и мыслителей, один из величайших писателей-романистов мира. Автор бессмертных произведений «Война и мир» и «Анна Каренина».",
          pages: 864,
          publisher: "Русский вестник",
          releaseYear: 1877,
          genre: "Классика",
          type: "book"
        },
        {
          title: "Дюна",
          description: "Культовый научно-фантастический роман Фрэнка Герберта. Арракис — суровая пустынная планета, единственный во Вселенной источник пряности, самого ценного вещества.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/6355886.jpg",
          rating: 9.2,
          totalVotes: 410,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Фрэнк Герберт",
          authorDescription: "Американский писатель-фантаст, известный прежде всего как создатель цикла «Хроники Дюны», в особенности первого романа из него — «Дюна».",
          pages: 704,
          publisher: "Chilton Books",
          releaseYear: 1965,
          genre: "Научная фантастика",
          type: "book"
        },
        {
          title: "Задача трех тел",
          description: "В годы Культурной революции китайские ученые посылают сигнал в космос. Его принимает цивилизация Трисоляриса, находящаяся на грани гибели, и готовится к вторжению на Землю.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/24455365.jpg",
          rating: 8.7,
          totalVotes: 280,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Лю Цысинь",
          authorDescription: "Китайский писатель-фантаст, считающийся лицом китайской научной фантастики, а также самым плодовитым и популярным фантастом Китая.",
          pages: 464,
          publisher: "Chongqing Press",
          releaseYear: 2006,
          genre: "Научная фантастика",
          type: "book"
        },
        {
          title: "Ведьмак. Последнее желание",
          description: "Первая книга из цикла о ведьмаке Геральте из Ривии. Сборник рассказов, знакомящий читателя с суровым миром, где монстры порой человечнее людей.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/168192.jpg",
          rating: 9.1,
          totalVotes: 550,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Анджей Сапковский",
          authorDescription: "Польский писатель-фантаст и публицист, автор популярной фэнтези-саги «Ведьмак».",
          pages: 320,
          publisher: "SuperNOWA",
          releaseYear: 1993,
          genre: "Фэнтези",
          type: "book"
        },
        {
          title: "Марсианин",
          description: "Астронавт Марк Уотни остается один на Марсе после того, как его команда экстренно эвакуируется, посчитав его погибшим. Теперь ему предстоит выжить, используя все свои знания.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/8530063.jpg",
          rating: 8.8,
          totalVotes: 390,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Энди Вейер",
          authorDescription: "Американский писатель, ставший известным благодаря своему дебютному роману «Марсианин», который был успешно экранизирован.",
          pages: 384,
          publisher: "Crown Publishing",
          releaseYear: 2011,
          genre: "Научная фантастика",
          type: "book"
        },
        {
          title: "Гарри Поттер и философский камень",
          description: "Одиннадцатилетний мальчик-сирота Гарри Поттер узнает, что он волшебник, и отправляется в школу чародейства и волшебства Хогвартс, где его ждут невероятные приключения.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/103282.jpg",
          rating: 9.6,
          totalVotes: 800,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Дж.К. Роулинг",
          authorDescription: "Британская писательница, сценаристка и кинопродюсер, наиболее известная как автор серии романов о Гарри Поттере.",
          pages: 332,
          publisher: "Bloomsbury",
          releaseYear: 1997,
          genre: "Фэнтези",
          type: "book"
        },
        {
          title: "Братья Карамазовы",
          description: "Последний роман Фёдора Достоевского, глубокое философское исследование веры, свободы воли и морали на фоне истории одной семьи.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/171750.jpg",
          rating: 9.5,
          totalVotes: 220,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Фёдор Достоевский",
          authorDescription: "Один из самых значительных и известных в мире русских писателей и мыслителей. Классик мировой литературы.",
          pages: 896,
          publisher: "Русский вестник",
          releaseYear: 1880,
          genre: "Классика",
          type: "book"
        },
        {
          title: "Sapiens: Краткая история человечества",
          description: "Увлекательный рассказ о том, как человек разумный стал доминирующим видом на планете, от появления Homo sapiens до наших дней.",
          posterUrl: "https://cv7.litres.ru/pub/c/cover_415/18446914.jpg",
          rating: 8.9,
          totalVotes: 320,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          swipeNotWatched: 0,
          author: "Юваль Ной Харари",
          authorDescription: "Израильский военный историк-медиевист, профессор исторического факультета Еврейского университета в Иерусалиме, автор международных бестселлеров.",
          pages: 520,
          publisher: "Синдбад",
          releaseYear: 2011,
          genre: "Научно-популярная литература",
          type: "book"
        }
      ];

      const promises = initialBooks.map(async (book) => {
        const existingDoc = existingDocs.find(doc => doc.data().title === book.title);
        if (!existingDoc) {
          console.log(`Seeding missing book: ${book.title}`);
          return addDoc(collection(db, path), book);
        } else {
          const data = existingDoc.data();
          if (data.posterUrl !== book.posterUrl || data.description !== book.description) {
            console.log(`Updating book: ${book.title}`);
            return updateDoc(doc(db, path, existingDoc.id), {
              posterUrl: book.posterUrl,
              description: book.description
            });
          }
        }
      });

      await Promise.all(promises);
      console.log('seedBooks completed successfully.');
    } catch (error) {
      console.error('Error in seedBooks:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      isSeeding = false;
    }
  },

  seedUsers: async () => {
    const path = 'users';
    try {
      const moviesSnap = await getDocs(collection(db, 'movies'));
      const booksSnap = await getDocs(collection(db, 'books'));
      const movies = moviesSnap.docs.map(d => d.id);
      const books = booksSnap.docs.map(d => d.id);
      
      const getRandomItems = (arr: string[], count: number) => {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
      };

      const testUsers = [
        {
          uid: "test_user_1",
          displayName: "Киноман Алексей",
          photoURL: "https://i.pravatar.cc/150?u=alex",
          email: "alex@example.com",
          totalLikesReceived: 45,
          totalCommentLikesReceived: 12,
          totalCommentsReceived: 28,
          likedMovies: getRandomItems(movies, 5),
          likedBooks: getRandomItems(books, 2),
          favoriteMovies: getRandomItems(movies, 4),
          favoriteBooks: getRandomItems(books, 1)
        },
        {
          uid: "test_user_2",
          displayName: "Книжный Червь Мария",
          photoURL: "https://i.pravatar.cc/150?u=maria",
          email: "maria@example.com",
          totalLikesReceived: 62,
          totalCommentLikesReceived: 25,
          totalCommentsReceived: 40,
          likedMovies: getRandomItems(movies, 2),
          likedBooks: getRandomItems(books, 8),
          favoriteMovies: getRandomItems(movies, 1),
          favoriteBooks: getRandomItems(books, 5)
        },
        {
          uid: "test_user_3",
          displayName: "Критик Иван",
          photoURL: "https://i.pravatar.cc/150?u=ivan",
          email: "ivan@example.com",
          totalLikesReceived: 30,
          totalCommentLikesReceived: 8,
          totalCommentsReceived: 15,
          likedMovies: getRandomItems(movies, 3),
          likedBooks: getRandomItems(books, 3),
          favoriteMovies: getRandomItems(movies, 2),
          favoriteBooks: getRandomItems(books, 2)
        },
        {
          uid: "test_user_4",
          displayName: "Елена Прекрасная",
          photoURL: "https://i.pravatar.cc/150?u=elena",
          email: "elena@example.com",
          totalLikesReceived: 88,
          totalCommentLikesReceived: 34,
          totalCommentsReceived: 55,
          likedMovies: getRandomItems(movies, 6),
          likedBooks: getRandomItems(books, 4),
          favoriteMovies: getRandomItems(movies, 3),
          favoriteBooks: getRandomItems(books, 3)
        },
        {
          uid: "test_user_5",
          displayName: "Дмитрий Исследователь",
          photoURL: "https://i.pravatar.cc/150?u=dmitry",
          email: "dmitry@example.com",
          totalLikesReceived: 22,
          totalCommentLikesReceived: 5,
          totalCommentsReceived: 10,
          likedMovies: getRandomItems(movies, 4),
          likedBooks: getRandomItems(books, 5),
          favoriteMovies: getRandomItems(movies, 2),
          favoriteBooks: getRandomItems(books, 2)
        }
      ];

      for (const user of testUsers) {
        await setDoc(doc(db, path, user.uid), user, { merge: true });
        
        // Create a collection for each user
        const collectionItems = [
          ...getRandomItems(movies, 3).map(id => ({ id, type: 'movie' as const })),
          ...getRandomItems(books, 2).map(id => ({ id, type: 'book' as const }))
        ];
        
        await addDoc(collection(db, 'collections'), {
          userId: user.uid,
          userName: user.displayName,
          name: `Подборка от ${user.displayName}`,
          description: "Мои самые любимые произведения, которые я рекомендую всем.",
          items: collectionItems,
          isPublic: true,
          favoritesCount: Math.floor(Math.random() * 15),
          createdAt: serverTimestamp()
        });
      }
      console.log('seedUsers completed successfully');
    } catch (error) {
      console.error('seedUsers failed', error);
    }
  },

  seedReviews: async () => {
    const path = 'reviews';
    try {
      const moviesSnap = await getDocs(collection(db, 'movies'));
      const booksSnap = await getDocs(collection(db, 'books'));
      const movies = moviesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const books = booksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const testUsers = [
        { uid: "test_user_1", displayName: "Киноман Алексей" },
        { uid: "test_user_2", displayName: "Книжный Червь Мария" },
        { uid: "test_user_3", displayName: "Критик Иван" },
        { uid: "test_user_4", displayName: "Елена Прекрасная" },
        { uid: "test_user_5", displayName: "Дмитрий Исследователь" }
      ];

      const reviewComments = [
        "Потрясающее произведение! Обязательно к ознакомлению всем любителям жанра.",
        "Неплохо, но ожидал большего. Сюжет местами провисает, хотя финал сильный.",
        "Шедевр на все времена. Пересматриваю/перечитываю уже в который раз и нахожу новое.",
        "Очень атмосферно и глубоко. Заставляет задуматься о важных жизненных ценностях.",
        "Классика, которая не стареет. Актуально и сегодня, несмотря на время написания.",
        "Великолепная игра актеров/слог автора. Полное погружение в историю.",
        "Слишком затянуто, на мой взгляд. Можно было сократить вдвое без потери смысла.",
        "Визуально безупречно/Язык очень богатый. Настоящее эстетическое удовольствие.",
        "Рекомендую к просмотру/прочтению в тихий вечер. Оставляет приятное послевкусие.",
        "Сильная драма, которая берет за душу. Невозможно остаться равнодушным.",
        "Один из лучших представителей своего жанра. Читается/смотрится на одном дыхании!",
        "Захватывающий сюжет, который не отпускает до самого конца.",
        "Персонажи прописаны невероятно живо, им действительно сопереживаешь.",
        "Книга/фильм заставила меня плакать. Очень эмоциональный опыт.",
        "Отличная работа! Рекомендую всем друзьям."
      ];

      for (const user of testUsers) {
        // Review 3 random movies
        for (let i = 0; i < 3; i++) {
          const movie = movies[Math.floor(Math.random() * movies.length)];
          if (movie) {
            const rating = 3 + Math.floor(Math.random() * 3); // 3-5 stars
            await addDoc(collection(db, path), {
              userId: user.uid,
              userName: user.displayName,
              contentId: movie.id,
              contentType: 'movie',
              rating,
              comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
              likes: Math.floor(Math.random() * 20),
              commentCount: Math.floor(Math.random() * 5),
              createdAt: serverTimestamp()
            });
          }
        }
        // Review 3 random books
        for (let i = 0; i < 3; i++) {
          const book = books[Math.floor(Math.random() * books.length)];
          if (book) {
            const rating = 3 + Math.floor(Math.random() * 3); // 3-5 stars
            await addDoc(collection(db, path), {
              userId: user.uid,
              userName: user.displayName,
              contentId: book.id,
              contentType: 'book',
              rating,
              comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
              likes: Math.floor(Math.random() * 20),
              commentCount: Math.floor(Math.random() * 5),
              createdAt: serverTimestamp()
            });
          }
        }
      }
      console.log('Reviews seeded successfully');
    } catch (error) {
      console.error("Review seeding failed", error);
    }
  },

  seedAllData: async () => {
    try {
      await MovieService.seedMovies();
      await MovieService.seedBooks();
      await MovieService.seedUsers();
      await MovieService.seedReviews();
      console.log('Все тестовые данные успешно сгенерированы!');
    } catch (error) {
      console.error("Seeding failed", error);
    } finally {
      isSeeding = false;
    }
  },

  seedMovies: async () => {
    if (isSeeding) {
      console.log('Seeding already in progress, skipping...');
      return;
    }
    isSeeding = true;
    const path = 'movies';
    console.log('Starting seedMovies...');
    try {
      if (!auth.currentUser) {
        console.log('Cannot seed movies: No user authenticated');
        isSeeding = false;
        return;
      }
      console.log(`User authenticated: ${auth.currentUser.email}, verified: ${auth.currentUser.emailVerified}`);
      
      console.log('Fetching existing movies...');
      const moviesSnap = await getDocs(collection(db, path));
      const existingDocs = moviesSnap.docs;
      console.log(`Found ${existingDocs.length} existing movies.`);
      
      const promises = initialMovies.map(async (movie) => {
        const existingDoc = existingDocs.find(doc => doc.data().title === movie.title);
        if (!existingDoc) {
          console.log(`Seeding missing movie: ${movie.title}`);
          return addDoc(collection(db, path), movie);
        } else {
          const data = existingDoc.data();
          if (data.posterUrl !== movie.posterUrl || data.description !== movie.description) {
            console.log(`Updating movie: ${movie.title}`);
            return updateDoc(doc(db, path, existingDoc.id), {
              posterUrl: movie.posterUrl,
              description: movie.description
            });
          }
        }
      });

      await Promise.all(promises);
      console.log('seedMovies completed successfully.');
    } catch (error) {
      console.error('Error in seedMovies:', error);
      if (error instanceof Error && error.message.includes('insufficient permissions')) {
        throw new Error('У вас нет прав для синхронизации данных. Убедитесь, что ваш email подтвержден.');
      }
      handleFirestoreError(error, OperationType.GET, path);
    } finally {
      isSeeding = false;
    }
  },

  updateClubRules: async (clubId: string, rules: string) => {
    const clubRef = doc(db, 'clubs', clubId);
    await updateDoc(clubRef, { rules });
  }
};
