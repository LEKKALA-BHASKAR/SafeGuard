import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import FamilyMap from '../../components/FamilyMap';
import familyService, { FamilyGroup, FamilyMember } from '../../services/familyService';
import locationService from '../../services/locationService';
// import * as Clipboard from 'expo-clipboard';
// import * as Battery from 'expo-battery';

const { width, height } = Dimensions.get('window');

export default function FindMyFamilyScreen() {
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [currentUserLocation, setCurrentUserLocation] = useState<any>(null);
  
  // Create/Join State
  const [joinCode, setJoinCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const mapRef = useRef<any>(null);

  useEffect(() => {
    checkFamilyStatus();
    startLocationUpdates();
    
    return () => {
      locationService.stopTracking();
    };
  }, []);

  const checkFamilyStatus = async () => {
    try {
      setLoading(true);
      const id = await familyService.getUserFamilyId();
      if (id) {
        setFamilyId(id);
        const details = await familyService.getFamilyDetails(id);
        setFamilyGroup(details);
        
        // Listen to members
        const unsubscribe = familyService.listenToFamily(id, (updatedMembers) => {
          setMembers(updatedMembers);
        });
        
        return () => unsubscribe();
      }
    } catch (error) {
      console.error('Error checking family status:', error);
    } finally {
      setLoading(false);
    }
  };

  const startLocationUpdates = async () => {
    const location = await locationService.getCurrentLocation();
    let batteryLevel = undefined;
    try {
      // TODO: Install expo-battery to enable battery level sharing
      // const level = await Battery.getBatteryLevelAsync();
      // batteryLevel = Math.round(level * 100);
    } catch (e) {
      // Battery service might not be available
    }

    if (location) {
      setCurrentUserLocation(location);
      await familyService.updateLocation(location, batteryLevel);
    }

    locationService.startForegroundTracking(async (loc) => {
      setCurrentUserLocation(loc);
      let currentBattery = undefined;
      try {
        // TODO: Install expo-battery to enable battery level sharing
        // const level = await Battery.getBatteryLevelAsync();
        // currentBattery = Math.round(level * 100);
      } catch (e) {}
      await familyService.updateLocation(loc, currentBattery);
    });
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Error', 'Please enter a family name');
      return;
    }
    
    try {
      setIsCreating(true);
      const id = await familyService.createFamily(familyName);
      setFamilyId(id);
      const details = await familyService.getFamilyDetails(id);
      setFamilyGroup(details);
      Alert.alert('Success', 'Family group created!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create family group');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    try {
      setIsJoining(true);
      const id = await familyService.joinFamily(joinCode.toUpperCase());
      setFamilyId(id);
      const details = await familyService.getFamilyDetails(id);
      setFamilyGroup(details);
      Alert.alert('Success', 'Joined family group!');
    } catch (error) {
      Alert.alert('Error', 'Invalid invite code or failed to join');
    } finally {
      setIsJoining(false);
    }
  };

  const copyInviteCode = async () => {
    if (familyGroup?.inviteCode) {
      // TODO: Install expo-clipboard to enable this feature
      // await Clipboard.setStringAsync(familyGroup.inviteCode);
      Alert.alert('Info', 'Please use the Share button to share the code.');
    }
  };

  const shareInviteCode = async () => {
    if (familyGroup?.inviteCode) {
      try {
        await Share.share({
          message: `Join my family on SafeGuard! Use code: ${familyGroup.inviteCode}`,
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const focusOnMember = (member: FamilyMember) => {
    if (member.location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: member.location.latitude,
        longitude: member.location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      Alert.alert('Location Unavailable', `${member.displayName} is not sharing location.`);
    }
  };

  const renderMemberItem = ({ item }: { item: FamilyMember }) => (
    <TouchableOpacity style={styles.memberItem} onPress={() => focusOnMember(item)}>
      <View style={styles.avatarContainer}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: '#ccc' }]}>
            <Text style={styles.avatarText}>{item.displayName.charAt(0)}</Text>
          </View>
        )}
        {item.isSharing && <View style={styles.onlineIndicator} />}
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.displayName}</Text>
        <Text style={styles.memberStatus}>
          {item.location ? 'Online' : 'Offline'} • {item.batteryLevel ? `${item.batteryLevel}% Battery` : ''}
        </Text>
        {item.lastUpdated && (
          <Text style={styles.lastSeen}>
            Last seen: {new Date(item.lastUpdated).toLocaleTimeString()}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E63946" />
      </View>
    );
  }

  if (!familyId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Find My Family</Text>
          <Text style={styles.subtitle}>Create or join a family group to share locations.</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create a Family</Text>
            <TextInput
              style={styles.input}
              placeholder="Family Name (e.g. The Smiths)"
              value={familyName}
              onChangeText={setFamilyName}
            />
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleCreateFamily}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Group</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Join a Family</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Invite Code"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={handleJoinFamily}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator color="#E63946" />
              ) : (
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Join Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <FamilyMap
          ref={mapRef}
          members={members}
          currentUserLocation={currentUserLocation}
        />
        
        <View style={styles.familyHeaderOverlay}>
          <View style={styles.familyInfo}>
            <Text style={styles.familyName}>{familyGroup?.name}</Text>
            <TouchableOpacity style={styles.codeContainer} onPress={copyInviteCode}>
              <Text style={styles.inviteCode}>Code: {familyGroup?.inviteCode}</Text>
              <Ionicons name="copy-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={shareInviteCode}>
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.membersListContainer}>
        <Text style={styles.listTitle}>Family Members ({members.length})</Text>
        <FlatList
          data={members}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  formContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#E63946',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E63946',
  },
  secondaryButtonText: {
    color: '#E63946',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  orText: {
    marginHorizontal: 10,
    color: '#999',
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 0.6,
    position: 'relative',
  },
  familyHeaderOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  familyInfo: {
    flex: 1,
  },
  familyName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  inviteCode: {
    color: '#ddd',
    fontSize: 14,
    marginRight: 5,
  },
  shareButton: {
    padding: 5,
  },
  membersListContainer: {
    flex: 0.4,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    padding: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 50,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  memberStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  lastSeen: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});
