import {getFirestore, collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, onSnapshot} from '@react-native-firebase/firestore';
import {getAuth} from '@react-native-firebase/auth';
import InstalledAppsModule from '../native/InstalledAppsModule';

function randomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export interface UserDoc {
  displayName: string;
  email: string;
  inviteCode: string;
  partnerId: string | null;
  isLocking: boolean;
  partnerBlockedPackages: string[]; // packages your partner chose to block on YOUR device
  installedApps?: {id: string; packageName: string; appName: string}[]; // Apps installed on this device
}

function snapExists(snap: any): boolean {
  return typeof snap.exists === 'function' ? snap.exists() : !!snap.exists;
}

export async function getOrCreateUserDoc(): Promise<UserDoc> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not logged in');
  const db = getFirestore();
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snapExists(snap) || !snap.data()) {
    const installed = await InstalledAppsModule.getInstalledApps().catch(() => []);
    const data: UserDoc = {
      displayName: getAuth().currentUser?.displayName ?? '',
      email: getAuth().currentUser?.email ?? '',
      inviteCode: randomCode(),
      partnerId: null,
      isLocking: false,
      partnerBlockedPackages: [],
      installedApps: installed,
    };
    await setDoc(ref, data);
    return data;
  }
  // Ensure partnerBlockedPackages exists for older docs
  const data = snap.data() as any;
  let needsUpdate = false;
  if (!data.partnerBlockedPackages) {
    data.partnerBlockedPackages = [];
    needsUpdate = true;
  }
  if (!data.installedApps || data.installedApps.length === 0) {
    data.installedApps = await InstalledAppsModule.getInstalledApps().catch(() => []);
    needsUpdate = true;
  }
  if (needsUpdate) {
    await updateDoc(ref, {
      partnerBlockedPackages: data.partnerBlockedPackages,
      installedApps: data.installedApps,
    });
  }
  return data as UserDoc;
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
  await updateDoc(doc(db, 'users', uid), {partnerId: null, isLocking: false, partnerBlockedPackages: []});
  if (partnerId) {
    await updateDoc(doc(db, 'users', partnerId), {partnerId: null, isLocking: false, partnerBlockedPackages: []});
  }
}

/** Set which apps to block on your PARTNER's device */
export async function setPartnerBlockedApps(partnerUid: string, packages: string[]): Promise<void> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return;
  const db = getFirestore();
  // Write to YOUR OWN doc — you are the locker, partner subscribes to your doc to get these
  await updateDoc(doc(db, 'users', uid), {
    partnerBlockedPackages: packages,
    isLocking: packages.length > 0,
  });
  // Clear stale isLocking from partner's doc (previous code incorrectly wrote it there)
  await updateDoc(doc(db, 'users', partnerUid), {isLocking: false});
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
    if (snapExists(snap) && snap.data()) {
      const data = snap.data() as any;
      if (!data.partnerBlockedPackages) {
        data.partnerBlockedPackages = [];
      }
      onData(data as UserDoc);
    }
  });
}
