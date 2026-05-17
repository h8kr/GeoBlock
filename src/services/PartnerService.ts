import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

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
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not logged in');
  const ref = firestore().collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const data: UserDoc = {
      displayName: auth().currentUser?.displayName ?? '',
      email: auth().currentUser?.email ?? '',
      inviteCode: randomCode(),
      partnerId: null,
      isLocking: false,
    };
    await ref.set(data);
    return data;
  }
  return snap.data() as UserDoc;
}

export async function connectPartner(code: string): Promise<UserDoc> {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not logged in');
  const snap = await firestore()
    .collection('users')
    .where('inviteCode', '==', code.toUpperCase().trim())
    .get();
  if (snap.empty) throw new Error('No account found with that code. Double-check it and try again.');
  const partnerDoc = snap.docs[0];
  if (partnerDoc.id === uid) throw new Error("That's your own invite code.");
  if ((partnerDoc.data() as UserDoc).partnerId) throw new Error('That person already has a partner.');
  await firestore().collection('users').doc(uid).update({partnerId: partnerDoc.id});
  await firestore().collection('users').doc(partnerDoc.id).update({partnerId: uid});
  return partnerDoc.data() as UserDoc;
}

export async function disconnectPartner(): Promise<void> {
  const uid = auth().currentUser?.uid;
  if (!uid) return;
  const snap = await firestore().collection('users').doc(uid).get();
  const partnerId = (snap.data() as UserDoc)?.partnerId;
  await firestore().collection('users').doc(uid).update({partnerId: null, isLocking: false});
  if (partnerId) {
    await firestore().collection('users').doc(partnerId).update({partnerId: null, isLocking: false});
  }
}

export async function setLocking(isLocking: boolean): Promise<void> {
  const uid = auth().currentUser?.uid;
  if (!uid) return;
  await firestore().collection('users').doc(uid).update({isLocking});
}

export function subscribeToPartner(
  partnerId: string,
  onData: (doc: UserDoc) => void,
): () => void {
  return firestore()
    .collection('users')
    .doc(partnerId)
    .onSnapshot(snap => {
      if (snap.exists) onData(snap.data() as UserDoc);
    });
}
