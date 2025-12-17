import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalSOSAlerts: number;
  alertsToday: number;
  successRate: number;
  avgResponseTime: number;
}

interface SOSAlert {
  id: string;
  userId: string;
  userName: string;
  timestamp: Date;
  location: { latitude: number; longitude: number };
  status: 'pending' | 'delivered' | 'resolved' | 'failed';
  contactsNotified: number;
  type: 'manual' | 'shake' | 'silent';
}

interface UserActivity {
  id: string;
  userName: string;
  email: string;
  lastActive: Date;
  totalAlerts: number;
  verifiedContacts: number;
  subscriptionType: 'free' | 'premium';
}

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalSOSAlerts: 0,
    alertsToday: 0,
    successRate: 0,
    avgResponseTime: 0,
  });

  const [recentAlerts, setRecentAlerts] = useState<SOSAlert[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'alerts' | 'users'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'delivered' | 'resolved' | 'failed'>('all');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // In production, this would fetch from Firebase
      // For now, loading from AsyncStorage for demo
      
      // Load stats
      const savedStats = await AsyncStorage.getItem('admin_stats');
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      } else {
        // Generate demo data
        setStats({
          totalUsers: 1247,
          activeUsers: 892,
          totalSOSAlerts: 3456,
          alertsToday: 23,
          successRate: 98.5,
          avgResponseTime: 2.3,
        });
      }

      // Load recent alerts
      const savedAlerts = await AsyncStorage.getItem('admin_alerts');
      if (savedAlerts) {
        setRecentAlerts(JSON.parse(savedAlerts));
      } else {
        // Generate demo alerts
        const demoAlerts: SOSAlert[] = [
          {
            id: '1',
            userId: 'user_001',
            userName: 'Sarah Johnson',
            timestamp: new Date(Date.now() - 1000 * 60 * 5),
            location: { latitude: 37.7749, longitude: -122.4194 },
            status: 'delivered',
            contactsNotified: 3,
            type: 'manual',
          },
          {
            id: '2',
            userId: 'user_002',
            userName: 'Mike Chen',
            timestamp: new Date(Date.now() - 1000 * 60 * 15),
            location: { latitude: 40.7128, longitude: -74.0060 },
            status: 'resolved',
            contactsNotified: 5,
            type: 'shake',
          },
          {
            id: '3',
            userId: 'user_003',
            userName: 'Emily Davis',
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
            location: { latitude: 34.0522, longitude: -118.2437 },
            status: 'pending',
            contactsNotified: 2,
            type: 'silent',
          },
        ];
        setRecentAlerts(demoAlerts);
      }

      // Load user activity
      const demoUsers: UserActivity[] = [
        {
          id: 'user_001',
          userName: 'Sarah Johnson',
          email: 'sarah@example.com',
          lastActive: new Date(Date.now() - 1000 * 60 * 5),
          totalAlerts: 12,
          verifiedContacts: 5,
          subscriptionType: 'premium',
        },
        {
          id: 'user_002',
          userName: 'Mike Chen',
          email: 'mike@example.com',
          lastActive: new Date(Date.now() - 1000 * 60 * 30),
          totalAlerts: 8,
          verifiedContacts: 3,
          subscriptionType: 'free',
        },
      ];
      setUserActivity(demoUsers);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleAlertAction = async (alertId: string, action: 'resolve' | 'investigate') => {
    const updatedAlerts = recentAlerts.map(alert =>
      alert.id === alertId
        ? { ...alert, status: action === 'resolve' ? 'resolved' as const : 'pending' as const }
        : alert
    );
    setRecentAlerts(updatedAlerts);
    await AsyncStorage.setItem('admin_alerts', JSON.stringify(updatedAlerts));
  };

  const getStatusColor = (status: SOSAlert['status']) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'delivered': return '#4CAF50';
      case 'resolved': return '#2196F3';
      case 'failed': return '#F44336';
      default: return '#999';
    }
  };

  const getTypeIcon = (type: SOSAlert['type']) => {
    switch (type) {
      case 'manual': return 'hand-left';
      case 'shake': return 'phone-portrait';
      case 'silent': return 'eye-off';
      default: return 'alert-circle';
    }
  };

  const filteredAlerts = recentAlerts.filter(alert => {
    const matchesSearch = alert.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         alert.userId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || alert.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const renderOverview = () => (
    <View style={styles.overviewContainer}>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="people" size={32} color="#1976D2" />
          <Text style={styles.statValue}>{stats.totalUsers.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
          <Text style={[styles.statSubtext, { color: '#4CAF50' }]}>
            {stats.activeUsers} active
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="alert-circle" size={32} color="#F57C00" />
          <Text style={styles.statValue}>{stats.totalSOSAlerts.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Alerts</Text>
          <Text style={[styles.statSubtext, { color: '#FF9800' }]}>
            {stats.alertsToday} today
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="checkmark-circle" size={32} color="#388E3C" />
          <Text style={styles.statValue}>{stats.successRate}%</Text>
          <Text style={styles.statLabel}>Success Rate</Text>
          <Text style={styles.statSubtext}>Delivery success</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
          <Ionicons name="time" size={32} color="#7B1FA2" />
          <Text style={styles.statValue}>{stats.avgResponseTime}s</Text>
          <Text style={styles.statLabel}>Avg Response</Text>
          <Text style={styles.statSubtext}>Time to deliver</Text>
        </View>
      </View>

      <View style={styles.chartPlaceholder}>
        <Text style={styles.chartTitle}>Alert Trends (Last 7 Days)</Text>
        <View style={styles.chartBars}>
          {[45, 62, 38, 71, 55, 48, 23].map((value, index) => (
            <View key={index} style={styles.barContainer}>
              <View style={[styles.bar, { height: `${value}%` }]} />
              <Text style={styles.barLabel}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderAlerts = () => (
    <View style={styles.alertsContainer}>
      <View style={styles.filterBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search alerts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtons}>
          {['all', 'pending', 'delivered', 'resolved', 'failed'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                filterStatus === status && styles.filterButtonActive
              ]}
              onPress={() => setFilterStatus(status as any)}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === status && styles.filterButtonTextActive
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.alertsList}>
        {filteredAlerts.map((alert) => (
          <View key={alert.id} style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={styles.alertUser}>
                <Ionicons name={getTypeIcon(alert.type)} size={24} color="#666" />
                <View style={styles.alertUserInfo}>
                  <Text style={styles.alertUserName}>{alert.userName}</Text>
                  <Text style={styles.alertUserId}>{alert.userId}</Text>
                </View>
              </View>
              <View style={[styles.alertStatus, { backgroundColor: getStatusColor(alert.status) + '20' }]}>
                <Text style={[styles.alertStatusText, { color: getStatusColor(alert.status) }]}>
                  {alert.status}
                </Text>
              </View>
            </View>

            <View style={styles.alertDetails}>
              <View style={styles.alertDetailRow}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.alertDetailText}>
                  {alert.timestamp.toLocaleString()}
                </Text>
              </View>
              <View style={styles.alertDetailRow}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.alertDetailText}>
                  {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                </Text>
              </View>
              <View style={styles.alertDetailRow}>
                <Ionicons name="people-outline" size={16} color="#666" />
                <Text style={styles.alertDetailText}>
                  {alert.contactsNotified} contacts notified
                </Text>
              </View>
            </View>

            <View style={styles.alertActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.resolveButton]}
                onPress={() => handleAlertAction(alert.id, 'resolve')}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Resolve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.investigateButton]}
                onPress={() => handleAlertAction(alert.id, 'investigate')}
              >
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Investigate</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderUsers = () => (
    <View style={styles.usersContainer}>
      <View style={styles.userStats}>
        <View style={styles.userStatItem}>
          <Text style={styles.userStatValue}>{stats.activeUsers}</Text>
          <Text style={styles.userStatLabel}>Active Now</Text>
        </View>
        <View style={styles.userStatItem}>
          <Text style={styles.userStatValue}>{Math.floor(stats.totalUsers * 0.35)}</Text>
          <Text style={styles.userStatLabel}>Premium Users</Text>
        </View>
        <View style={styles.userStatItem}>
          <Text style={styles.userStatValue}>{Math.floor(stats.totalUsers * 0.12)}</Text>
          <Text style={styles.userStatLabel}>New This Week</Text>
        </View>
      </View>

      <ScrollView style={styles.usersList}>
        {userActivity.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {user.userName.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userCardName}>{user.userName}</Text>
                <Text style={styles.userCardEmail}>{user.email}</Text>
              </View>
              <View style={[
                styles.subscriptionBadge,
                { backgroundColor: user.subscriptionType === 'premium' ? '#FFD700' : '#E0E0E0' }
              ]}>
                <Text style={styles.subscriptionText}>
                  {user.subscriptionType === 'premium' ? '⭐ PRO' : 'FREE'}
                </Text>
              </View>
            </View>

            <View style={styles.userMetrics}>
              <View style={styles.userMetric}>
                <Text style={styles.userMetricValue}>{user.totalAlerts}</Text>
                <Text style={styles.userMetricLabel}>Alerts</Text>
              </View>
              <View style={styles.userMetric}>
                <Text style={styles.userMetricValue}>{user.verifiedContacts}</Text>
                <Text style={styles.userMetricLabel}>Contacts</Text>
              </View>
              <View style={styles.userMetric}>
                <Text style={styles.userMetricValue}>
                  {Math.floor((Date.now() - user.lastActive.getTime()) / 60000)}m
                </Text>
                <Text style={styles.userMetricLabel}>Last Active</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.tabActive]}
          onPress={() => setSelectedTab('overview')}
        >
          <Ionicons name="stats-chart" size={20} color={selectedTab === 'overview' ? '#E63946' : '#666'} />
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'alerts' && styles.tabActive]}
          onPress={() => setSelectedTab('alerts')}
        >
          <Ionicons name="alert-circle" size={20} color={selectedTab === 'alerts' ? '#E63946' : '#666'} />
          <Text style={[styles.tabText, selectedTab === 'alerts' && styles.tabTextActive]}>
            Alerts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'users' && styles.tabActive]}
          onPress={() => setSelectedTab('users')}
        >
          <Ionicons name="people" size={20} color={selectedTab === 'users' ? '#E63946' : '#666'} />
          <Text style={[styles.tabText, selectedTab === 'users' && styles.tabTextActive]}>
            Users
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'alerts' && renderAlerts()}
        {selectedTab === 'users' && renderUsers()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#E63946',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#E63946',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#E63946',
  },
  content: {
    flex: 1,
  },
  overviewContainer: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    flexWrap: isWeb ? 'wrap' : 'nowrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: isWeb ? 1 : 0,
    minWidth: isWeb ? 200 : undefined,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  chartPlaceholder: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '60%',
    backgroundColor: '#E63946',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 8,
  },
  alertsContainer: {
    flex: 1,
  },
  filterBar: {
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  filterButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#E63946',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  alertsList: {
    padding: 16,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertUserInfo: {
    gap: 4,
  },
  alertUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  alertUserId: {
    fontSize: 12,
    color: '#999',
  },
  alertStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  alertStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  alertDetails: {
    gap: 8,
    marginBottom: 12,
  },
  alertDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertDetailText: {
    fontSize: 14,
    color: '#666',
  },
  alertActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resolveButton: {
    backgroundColor: '#4CAF50',
  },
  investigateButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  usersContainer: {
    flex: 1,
  },
  userStats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    gap: 16,
  },
  userStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  userStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E63946',
  },
  userStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  usersList: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userCardEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  subscriptionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  subscriptionText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  userMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  userMetric: {
    alignItems: 'center',
  },
  userMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userMetricLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
});
