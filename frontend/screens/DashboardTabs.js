import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from './DashboardScreen';
import ActivityScreen from './ActivityScreen';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

export default function DashboardTabs({ route, navigation }) {
  const params = route?.params || {};
  const { userId, email, password } = params;

  if (!userId) {
    console.warn("DashboardTabs: userId is missing, redirecting to Login");
    // Redirect to login if no userId
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
    return null;
  }

  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard">
        {props => <DashboardScreen {...props} userId={userId} email={email} />}
      </Tab.Screen>
      <Tab.Screen name="Activity">
        {props => <ActivityScreen {...props} userId={userId} email={email} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {props => (
          <ProfileScreen
            {...props}
            route={{ params: { userId, email, password } }} // ensure route.params exists
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
