import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import axios from 'axios';

export default function ActivityScreen({ userId }) {
  const [expenses, setExpenses] = useState([]);
  const [weeklySpent, setWeeklySpent] = useState(0);
  const [weeklySaved, setWeeklySaved] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const API_BASE = 'http://192.168.0.103:5000';

  useEffect(() => {
    fetchWeeklyActivity();
  }, [userId]);

  const fetchWeeklyActivity = async () => {
    try {
      setRefreshing(true);

      const tz = 'Asia/Manila';
      const res = await axios.get(`${API_BASE}/expenses/${userId}`);
      const allExpenses = res.data || [];

      // --- Get Monday of current week ---
      const now = new Date(new Date().toLocaleString('en-PH', { timeZone: tz }));
      const day = now.getDay(); // Sunday = 0
      const diffToMonday = day === 0 ? 6 : day - 1;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      // --- Filter only current week's expenses ---
      const weekExpenses = allExpenses.filter(exp => {
        const expDate = new Date(new Date(exp.date).toLocaleString('en-PH', { timeZone: tz }));
        return expDate >= startOfWeek && expDate <= now;
      });

      const totalSpent = weekExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      setExpenses(weekExpenses);
      setWeeklySpent(totalSpent);

      // --- Fetch savings goal ---
      const resGoal = await axios.get(`${API_BASE}/savings_goal/${userId}`);
      const savingsGoal = resGoal.data?.target || 0;
      const totalBalance = 3000; // static example

      const remainingBudget = totalBalance - savingsGoal - totalSpent;
      setWeeklySaved(Math.max(remainingBudget, 0));

    } catch (err) {
      console.log('Failed to fetch weekly activity:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Activity</Text>
      <Text style={styles.summary}>💸 Total Spent: ₱{weeklySpent.toFixed(2)}</Text>
      <Text style={styles.summary}>💰 Estimated Saved: ₱{weeklySaved.toFixed(2)}</Text>

      <Text style={styles.subtitle}>Expenses this week:</Text>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchWeeklyActivity} />
        }
        renderItem={({ item }) => (
          <View style={styles.expenseCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.amount}>₱{item.amount}</Text>
            </View>
            <Text style={styles.desc}>{item.description || 'No description'}</Text>
            <Text style={styles.date}>
              {new Date(item.date).toLocaleString('en-PH', {
                timeZone: 'Asia/Manila',
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#1e293b' },
  summary: { fontSize: 16, marginBottom: 5, color: '#334155' },
  subtitle: { fontWeight: 'bold', marginTop: 15, marginBottom: 10, fontSize: 16 },
  expenseCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  category: { fontWeight: 'bold', color: '#1e293b' },
  amount: { fontWeight: 'bold', color: '#dc2626' },
  desc: { color: '#475569', fontSize: 14, marginTop: 2 },
  date: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
});
