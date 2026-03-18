import React, { useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Text, Card, Button, FAB, ActivityIndicator, Avatar } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../store/AuthContext'

export default function DashboardScreen() {
  const navigation = useNavigation()
  const [refreshing, setRefreshing] = React.useState(false)

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Get contacts count
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })

      // Get enriched count
      const { count: enrichedCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .not('enriched_at', 'is', null)

      // Get duplicates count
      const { count: duplicatesCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('is_duplicate', true)

      return {
        totalContacts: totalContacts || 0,
        enrichedCount: enrichedCount || 0,
        duplicatesCount: duplicatesCount || 0,
      }
    },
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Dashboard</Text>

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Avatar.Icon size={40} icon="account-group" style={styles.icon} />
              <Text style={styles.statNumber}>{stats?.totalContacts}</Text>
              <Text style={styles.statLabel}>Total Contacts</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <Avatar.Icon size={40} icon="database-check" style={[styles.icon, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statNumber}>{stats?.enrichedCount}</Text>
              <Text style={styles.statLabel}>Enriched</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <Avatar.Icon size={40} icon="alert" style={[styles.icon, { backgroundColor: '#FF5722' }]} />
              <Text style={styles.statNumber}>{stats?.duplicatesCount}</Text>
              <Text style={styles.statLabel}>Duplicates</Text>
            </Card.Content>
          </Card>
        </View>

        <Card style={styles.actionCard}>
          <Card.Title title="Quick Actions" />
          <Card.Content>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Contacts')}
              style={styles.actionButton}
              icon="account-search"
            >
              View Contacts
            </Button>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Enrichment')}
              style={styles.actionButton}
              icon="refresh"
            >
              Run Enrichment
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="cog"
        onPress={() => navigation.navigate('Settings')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    margin: 16,
    color: '#212121',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    margin: 4,
  },
  icon: {
    backgroundColor: '#0066CC',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  actionCard: {
    margin: 16,
  },
  actionButton: {
    marginVertical: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#0066CC',
  },
})