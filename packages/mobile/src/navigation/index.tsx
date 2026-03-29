import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../stores/auth';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Trip screens
import TripsListScreen from '../screens/trips/TripsListScreen';
import CreateTripScreen from '../screens/trips/CreateTripScreen';
import TripDashboardScreen from '../screens/trips/TripDashboardScreen';
import ItineraryScreen from '../screens/trips/ItineraryScreen';
import AddItineraryItemScreen from '../screens/trips/AddItineraryItemScreen';

// Voting screens
import PollsScreen from '../screens/voting/PollsScreen';
import CreatePollScreen from '../screens/voting/CreatePollScreen';
import PollDetailScreen from '../screens/voting/PollDetailScreen';

// Expense screens
import ExpensesScreen from '../screens/expenses/ExpensesScreen';
import AddExpenseScreen from '../screens/expenses/AddExpenseScreen';
import SettlementsScreen from '../screens/expenses/SettlementsScreen';

// Vault screens
import VaultScreen from '../screens/vault/VaultScreen';
import UploadDocScreen from '../screens/vault/UploadDocScreen';

import type {
  AuthStackParamList,
  MainTabParamList,
  TripStackParamList,
} from './types';

// ---------------------------------------------------------------------------
// Placeholder screens
// ---------------------------------------------------------------------------

function ActivityScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Activity Feed</Text>
      <Text style={styles.subText}>Cross-trip activity coming soon</Text>
    </View>
  );
}

function ProfileScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Profile</Text>
      <Text style={styles.link} onPress={signOut}>
        Sign Out
      </Text>
    </View>
  );
}

function MembersScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Members</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Auth Stack
// ---------------------------------------------------------------------------

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Trip Stack (nested in Trips tab)
// ---------------------------------------------------------------------------

const TripStack = createNativeStackNavigator<TripStackParamList>();

function TripStackNavigator() {
  return (
    <TripStack.Navigator>
      <TripStack.Screen
        name="TripsList"
        component={TripsListScreen}
        options={{ title: 'My Trips' }}
      />
      <TripStack.Screen
        name="CreateTrip"
        component={CreateTripScreen}
        options={{ title: 'New Trip' }}
      />
      <TripStack.Screen
        name="TripDashboard"
        component={TripDashboardScreen}
        options={{ title: 'Trip' }}
      />
      <TripStack.Screen
        name="Itinerary"
        component={ItineraryScreen}
        options={{ title: 'Itinerary' }}
      />
      <TripStack.Screen
        name="AddItineraryItem"
        component={AddItineraryItemScreen}
        options={{ title: 'Add Activity' }}
      />
      <TripStack.Screen
        name="Polls"
        component={PollsScreen}
        options={{ title: 'Polls' }}
      />
      <TripStack.Screen
        name="CreatePoll"
        component={CreatePollScreen}
        options={{ title: 'New Poll' }}
      />
      <TripStack.Screen
        name="PollDetail"
        component={PollDetailScreen}
        options={{ title: 'Poll' }}
      />
      <TripStack.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{ title: 'Expenses' }}
      />
      <TripStack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ title: 'Add Expense' }}
      />
      <TripStack.Screen
        name="Settlements"
        component={SettlementsScreen}
        options={{ title: 'Settlements' }}
      />
      <TripStack.Screen
        name="Vault"
        component={VaultScreen}
        options={{ title: 'The Vault' }}
      />
      <TripStack.Screen
        name="UploadDoc"
        component={UploadDocScreen}
        options={{ title: 'Upload Document' }}
      />
      <TripStack.Screen
        name="Members"
        component={MembersScreen}
        options={{ title: 'Members' }}
      />
    </TripStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Main Tabs
// ---------------------------------------------------------------------------

const MainTab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
      }}
    >
      <MainTab.Screen
        name="TripsTab"
        component={TripStackNavigator}
        options={{ title: 'Trips' }}
      />
      <MainTab.Screen name="Activity" component={ActivityScreen} />
      <MainTab.Screen name="Profile" component={ProfileScreen} />
    </MainTab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function RootNavigation() {
  const { session, loading } = useAuthStore();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  placeholderText: {
    fontSize: 18,
    color: '#999',
  },
  subText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  link: {
    fontSize: 16,
    color: '#4F46E5',
    marginTop: 16,
  },
});
