import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'familia-pro-app';

export default function App() {
  const [user, setUser] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Error de auth:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const photosRef = collection(db, 'artifacts', appId, 'public', 'data', 'gallery');
    const q = query(photosRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPhotos(sorted);
      setLoading(false);
    }, (error) => {
      console.error("Error en snapshot:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newPhotoUrl || !user) return;
    setUploading(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'gallery'), {
        url: newPhotoUrl,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewPhotoUrl('');
      setShowModal(false);
    } catch (err) {
      console.error("Error al subir:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhotoUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-mono">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-10 border-b-2 border-[#bc13fe] pb-4">
        <h1 className="text-2xl md:text-4xl font-black text-[#bc13fe] drop-shadow-[0_0_10px_rgba(188,19,254,0.6)]">
          GALERÍA_COMPARTIDA
        </h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#bc13fe] text-white px-4 py-2 font-bold rounded hover:scale-105 transition-transform active:scale-95 shadow-[0_0_15px_rgba(188,19,254,0.4)]"
        >
          + SUBIR FOTO
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#bc13fe]"></div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.length === 0 && (
            <p className="col-span-full text-center text-gray-500 italic mt-10">
              No hay fotos aún... El morado espera tus capturas.
            </p>
          )}
          {photos.map((photo) => (
            <div 
              key={photo.id} 
              className="relative group overflow-hidden rounded-lg border border-[#bc13fe]/30 hover:border-[#bc13fe] transition-all bg-[#111]"
            >
              <img 
                src={photo.url} 
                alt="Familia" 
                className="w-full h-64 object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=Error+al+cargar'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#bc13fe]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-[10px] text-white bg-[#bc13fe] px-2 py-1 rounded">UID: {photo.userId.substring(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#111] border-2 border-[#bc13fe] p-6 rounded-xl w-full max-w-md shadow-[0_0_50px_rgba(188,19,254,0.3)]">
            <h2 className="text-[#bc13fe] text-xl font-bold mb-4 uppercase">Nueva Captura</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <input 
                type="text" 
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="Pega link de imagen..."
                className="w-full bg-black border border-[#bc13fe]/50 p-2 text-sm text-white focus:border-[#bc13fe] outline-none"
              />
              <div className="relative py-2"><div className="border-t border-[#bc13fe]/20"></div></div>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#bc13fe] file:text-white cursor-pointer"
              />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-gray-500 font-bold hover:text-white">CANCELAR</button>
                <button type="submit" disabled={uploading || !newPhotoUrl} className="flex-1 py-2 bg-[#bc13fe] text-white font-bold hover:bg-[#a010db] disabled:opacity-50">
                  {uploading ? 'SUBIENDO...' : 'LISTO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="max-w-6xl mx-auto mt-12 flex justify-center">
        <button onClick={() => window.location.href = 'Menu.html'} className="text-[#bc13fe] text-xs hover:underline decoration-wavy">
          &lt; VOLVER AL MENÚ
        </button>
      </footer>
    </div>
  );
}