import { getAuth } from 'firebase/auth';
import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, getFirestore, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { LocationData } from './locationService';

export interface FamilyMember {
  uid: string;
  displayName: string;
  photoURL?: string;
  location?: LocationData;
  lastUpdated?: number;
  batteryLevel?: number;
  isSharing?: boolean;
}

export interface FamilyGroup {
  id: string;
  name: string;
  inviteCode: string;
  adminId: string;
  members: string[]; // Array of UIDs
  createdAt: any;
}

class FamilyService {
  private db = getFirestore();
  private auth = getAuth();

  // Create a new family group
  async createFamily(name: string): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const familyId = Date.now().toString();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const familyData: FamilyGroup = {
      id: familyId,
      name,
      inviteCode,
      adminId: user.uid,
      members: [user.uid],
      createdAt: serverTimestamp(),
    };

    // Create family doc
    await setDoc(doc(this.db, 'families', familyId), familyData);

    // Update user profile with familyId
    await updateDoc(doc(this.db, 'users', user.uid), {
      familyId: familyId
    });

    return familyId;
  }

  // Join a family group
  async joinFamily(inviteCode: string): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Find family by invite code
    const q = query(collection(this.db, 'families'), where('inviteCode', '==', inviteCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('Invalid invite code');
    }

    const familyDoc = querySnapshot.docs[0];
    const familyId = familyDoc.id;

    // Add user to family members
    await updateDoc(doc(this.db, 'families', familyId), {
      members: arrayUnion(user.uid)
    });

    // Update user profile
    await updateDoc(doc(this.db, 'users', user.uid), {
      familyId: familyId
    });

    return familyId;
  }

  // Leave family
  async leaveFamily(familyId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    await updateDoc(doc(this.db, 'families', familyId), {
      members: arrayRemove(user.uid)
    });

    await updateDoc(doc(this.db, 'users', user.uid), {
      familyId: null
    });
  }

  // Update my location for family
  async updateLocation(location: LocationData, batteryLevel?: number): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const data: any = {
      location: location,
      lastUpdated: Date.now(),
      locationSharingEnabled: true
    };

    if (batteryLevel !== undefined) {
      data.batteryLevel = batteryLevel;
    }

    // Update in users collection (which family members will listen to)
    // We use setDoc with merge: true to ensure we don't overwrite other fields if doc doesn't exist (though it should)
    await setDoc(doc(this.db, 'users', user.uid), data, { merge: true });
  }

  // Listen to family members
  listenToFamily(familyId: string, onUpdate: (members: FamilyMember[]) => void): () => void {
    // Query users who have this familyId
    const q = query(collection(this.db, 'users'), where('familyId', '==', familyId));
    
    return onSnapshot(q, (snapshot) => {
      const members: FamilyMember[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          uid: doc.id,
          displayName: data.displayName || 'Unknown',
          photoURL: data.photoURL,
          location: data.location,
          lastUpdated: data.lastUpdated,
          batteryLevel: data.batteryLevel,
          isSharing: data.locationSharingEnabled
        });
      });
      onUpdate(members);
    });
  }
  
  // Get user's current family ID
  async getUserFamilyId(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    
    const userDoc = await getDoc(doc(this.db, 'users', user.uid));
    if (userDoc.exists()) {
      return userDoc.data().familyId || null;
    }
    return null;
  }

  // Get Family Details
  async getFamilyDetails(familyId: string): Promise<FamilyGroup | null> {
    const docRef = doc(this.db, 'families', familyId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as FamilyGroup;
    }
    return null;
  }
}

export default new FamilyService();
