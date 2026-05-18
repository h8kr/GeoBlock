import {getFirestore, collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, onSnapshot} from '@react-native-firebase/firestore';
import {getAuth} from '@react-native-firebase/auth';

function randomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export interface UserDoc {
  displayName: string;
  email: string;
  inviteCode: string;
  partnerId: string | null;
  isLocking: boolean;
}

export async function getOrCreateUserDoc(): Promise<UserDoc> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not logged in');
  const db = getFirestore();
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists) {
    const data: UserDoc = {
      displayName: getAuth().currentUser?.displayName ?? '',
      email: getAuth().currentUser?.email ?? '',
      inviteCode: randomCode(),
      partnerId: null,
      isLocking: false,
    };
    await setDoc(ref, data);
    return data;
  }
  return snap.data() as UserDoc;
}

export async function connectPartner(code: string): Promise<UserDoc> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not logged in');
  const db = getFirestore();
  const q = query(collection(db, 'users'), where('inviteCode', '==', code.toUpperCase().trim()));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('No account found with that code. Double-check it and try again.');
  const partnerDoc = snap.docs[0];
  if (partnerDoc.id === uid) throw new Error("That's your own invite code.");
  if ((partnerDoc.data() as UserDoc).partnerId) throw new Error('That person already has a partner.');
  await updateDoc(doc(db, 'users', uid), {partnerId: partnerDoc.id});
  await updateDoc(doc(db, 'users', partnerDoc.id), {partnerId: uid});
  return partnerDoc.data() as UserDoc;
}

export async function disconnectPartner(): Promise<void> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return;
  const db = getFirestore();
  const snap = await getDoc(doc(db, 'users', uid));
  const partnerId = (snap.data() as UserDoc)?.partnerId;
  await updateDoc(doc(db, 'users', uid), {partnerId: null, isLocking: false});
  if (partnerId) {
    await updateDoc(doc(db, 'users', partnerId), {partnerId: null, isLocking: false});
  }
}

export async function setLocking(isLocking: boolean): Promise<void> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return;
  await updateDoc(doc(getFirestore(), 'users', uid), {isLocking});
}

export function subscribeToPartner(
  partnerId: string,
  onData: (doc: UserDoc) => void,
): () => void {
  return onSnapshot(doc(getFirestore(), 'users', partnerId), snap => {
    if (snap.exists) onData(snap.data() as UserDoc);
  });
}
