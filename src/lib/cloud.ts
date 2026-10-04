import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { createClient } from '@supabase/supabase-js';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(
  firebaseConfig.projectId &&
  firebaseConfig.apiKey &&
  firebaseConfig.storageBucket
);

export const supabaseEnabled = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

let firebaseApp: ReturnType<typeof initializeApp> | null = null;
let firebaseStorage: ReturnType<typeof getStorage> | null = null;
let supabaseClient: ReturnType<typeof createClient> | null = null;

function initFirebase() {
  if (!firebaseEnabled) return null;
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
    firebaseStorage = getStorage(firebaseApp);
  }
  return firebaseStorage;
}

function initSupabase() {
  if (!supabaseEnabled) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(
      String(import.meta.env.VITE_SUPABASE_URL),
      String(import.meta.env.VITE_SUPABASE_ANON_KEY)
    );
  }
  return supabaseClient;
}

export type CloudProvider = 'firebase' | 'supabase';

export type CloudBackupItem = {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  size?: number;
  provider: CloudProvider;
};

export async function uploadBackupToFirebase(fileName: string, payload: string, userId = 'default') {
  const storage = initFirebase();
  if (!storage) throw new Error('Firebase no está configurado. Completa las variables de entorno.');

  const safeFileName = fileName.replace(/\s+/g, '_');
  const path = `${userId}/backups/${safeFileName}`;
  const fileRef = ref(storage, path);
  const blob = new Blob([payload], { type: 'application/json' });
  await uploadBytes(fileRef, blob);

  return {
    id: path,
    name: safeFileName,
    path,
    createdAt: new Date().toISOString(),
    provider: 'firebase' as const,
  };
}

export async function listBackupsFromFirebase(userId = 'default'): Promise<CloudBackupItem[]> {
  const storage = initFirebase();
  if (!storage) return [];

  const folderRef = ref(storage, `${userId}/backups`);
  const list = await listAll(folderRef);

  return Promise.all(
    list.items.map(async (item) => {
      const metadata = await item.getMetadata();
      return {
        id: item.fullPath,
        name: item.name,
        path: item.fullPath,
        createdAt: metadata.timeCreated ?? new Date().toISOString(),
        size: metadata.size,
        provider: 'firebase' as const,
      };
    })
  );
}

export async function downloadBackupFromFirebase(path: string) {
  const storage = initFirebase();
  if (!storage) throw new Error('Firebase no está configurado.');
  const fileRef = ref(storage, path);
  const url = await getDownloadURL(fileRef);
  const response = await fetch(url);
  return response.text();
}

export async function deleteBackupFromFirebase(path: string) {
  const storage = initFirebase();
  if (!storage) throw new Error('Firebase no está configurado.');
  await deleteObject(ref(storage, path));
}

export async function uploadBackupToSupabase(fileName: string, payload: string, userId = 'default') {
  const supabase = initSupabase();
  if (!supabase) throw new Error('Supabase no está configurado. Completa las variables de entorno.');

  const bucket = String(import.meta.env.VITE_SUPABASE_BUCKET ?? 'teacher-records');
  const safeFileName = fileName.replace(/\s+/g, '_');
  const path = `${userId}/backups/${safeFileName}`;
  const file = new File([payload], safeFileName, { type: 'application/json' });

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
  });

  if (error) throw new Error(error.message);

  return {
    id: path,
    name: safeFileName,
    path,
    createdAt: new Date().toISOString(),
    provider: 'supabase' as const,
  };
}

export async function listBackupsFromSupabase(userId = 'default'): Promise<CloudBackupItem[]> {
  const supabase = initSupabase();
  if (!supabase) return [];

  const bucket = String(import.meta.env.VITE_SUPABASE_BUCKET ?? 'teacher-records');
  const { data, error } = await supabase.storage.from(bucket).list(`${userId}/backups`);
  if (error) throw new Error(error.message);

  return (data ?? []).map((item) => ({
    id: `${userId}/backups/${item.name}`,
    name: item.name,
    path: `${userId}/backups/${item.name}`,
    createdAt: item.created_at ?? new Date().toISOString(),
    size: item.metadata?.size,
    provider: 'supabase' as const,
  }));
}

export async function downloadBackupFromSupabase(path: string) {
  const supabase = initSupabase();
  if (!supabase) throw new Error('Supabase no está configurado.');

  const bucket = String(import.meta.env.VITE_SUPABASE_BUCKET ?? 'teacher-records');
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw new Error(error.message);
  return data.text();
}

export async function deleteBackupFromSupabase(path: string) {
  const supabase = initSupabase();
  if (!supabase) throw new Error('Supabase no está configurado.');

  const bucket = String(import.meta.env.VITE_SUPABASE_BUCKET ?? 'teacher-records');
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(error.message);
}

export function getCloudStatus() {
  return {
    firebaseEnabled,
    supabaseEnabled,
    provider: firebaseEnabled ? 'firebase' : supabaseEnabled ? 'supabase' : null,
  };
}
