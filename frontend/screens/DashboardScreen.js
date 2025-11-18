import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, Portal, Modal, FAB } from 'react-native-paper';
import axios from 'axios';
import { Camera } from 'expo-camera';
import BalanceSavings from "../components/BalanceSavings";

export default function DashboardScreen({ userId, email }) {
  const [expenses, setExpenses] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [remainingBudget, setRemainingBudget] = useState(0);
  const [dailyBudget, setDailyBudget] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraRef, setCameraRef] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);

  const API_BASE = 'http://192.168.0.103:5000';

  // ------------------ Fetch balance & goal ------------------
  const fetchBalanceSaving = async () => {
    try {
      const res = await axios.get(`${API_BASE}/get_balance_goal/${userId}`);
      setTotalBalance(res.data.balance || 0);
      setSavingsGoal(res.data.savings_goal || 0);
    } catch (err) {
      console.log("Failed to fetch balance/goal", err.response?.data || err.message);
    }
  };
 
  // ------------------ Fetch expenses ------------------
  const fetchExpenses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/expenses/${userId}`);
      setExpenses(res.data || []);
    } catch (err) {
      console.log('Failed to fetch expenses', err.response?.data || err.message);
    }
  };

  // Only showing relevant parts for clarity
  useEffect(() => {
    const fetchBalanceSaving = async () => {
      try {
        const res = await axios.get(`${API_BASE}/get_balance_goal/${userId}`);
        setTotalBalance(res.data.balance || 0);
        setSavingsGoal(res.data.savings_goal || 0);
        setLeftover(res.data.leftover || 0); // <-- get leftover
      } catch (err) {
        console.log("Failed to fetch balance/goal", err.response?.data || err.message);
      }
    };

    fetchExpenses();
    fetchBalanceSaving();
  }, []);
  // ------------------ Load initial data ------------------
  useEffect(() => {
    fetchExpenses();
    fetchBalanceSaving();

    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);



  // ------------------ Calculate remaining balance & daily budget ------------------
  useEffect(() => {
    if (!totalBalance) return;

    const tz = 'Asia/Manila';
    const today = new Date(new Date().toLocaleString('en-PH', { timeZone: tz }));
    today.setHours(0, 0, 0, 0);

    const spentToday = expenses
      .filter(e => {
        const expDate = new Date(new Date(e.date).toLocaleString('en-PH', { timeZone: tz }));
        expDate.setHours(0, 0, 0, 0);
        return expDate.getTime() === today.getTime();
      })
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const remaining = totalBalance - savingsGoal - totalSpent;

    const daily = (totalBalance - savingsGoal) / 7 - spentToday;

    setRemainingBudget(remaining >= 0 ? remaining : 0);
    setDailyBudget(daily >= 0 ? daily : 0);

  }, [expenses, totalBalance, savingsGoal]);

  // ------------------ Add expense ------------------

  const addExpense = async () => {
    if (!category || !amount) return Alert.alert('Error', 'Category and amount required');

    try {
      await axios.post(`${API_BASE}/add_expense`, {
        user_id: userId,
        category,
        amount: parseFloat(amount),
        description
      });

      setCategory('');
      setAmount('');
      setDescription('');
      setModalVisible(false);

      fetchExpenses(); // will recalc daily budget
    } catch (err) {
      Alert.alert('Error', 'Failed to add expense');
      console.log(err.response?.data || err.message);
    }
  };

  // ------------------ Delete expense ------------------
  const deleteExpense = async (id) => {
    try {
      await axios.delete(`${API_BASE}/delete_expense/${id}`);
      fetchExpenses();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete expense');
      console.log(err.response?.data || err.message);
    }
  };
// ------------------ Camera capture ------------------
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);
  
  
  const captureExpense = async () => {
    if (cameraRef) {
      await cameraRef.takePictureAsync({ base64: true });
      setCameraVisible(false);
      Alert.alert('Info', 'Receipt scanned (mock)');
      setAmount('');
      setCategory('Receipt');
      setDescription('Auto-filled from receipt');
      setModalVisible(true);
    }
  };

  // ------------------ Render ------------------
  if (cameraVisible && hasPermission) {
  return (
    <View style={{ flex: 1 }}>
      <Camera style={{ flex: 1 }} ref={ref => setCameraRef(ref)}>
        <View style={styles.cameraButtons}>
          <TouchableOpacity
            style={{ backgroundColor: '#007bff', padding: 10, borderRadius: 8 }}
            onPress={captureExpense}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Capture</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: '#ccc', padding: 10, borderRadius: 8, marginTop: 10 }}
            onPress={() => setCameraVisible(false)}
          >
            <Text style={{ color: '#000', fontWeight: 'bold' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
}

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>DASHBOARD</Text>

        {/* Balance & Savings Component */}
        <BalanceSavings 
          userId={userId} 
          onUpdate={(newBalance, newGoal) => {
            setTotalBalance(newBalance);
            setSavingsGoal(newGoal);
          }} 
        />

        {/* Remaining Balance & Daily Budget */}
        <View style={styles.row}>
          <View style={styles.smallCard}>
            <Text style={styles.label}>Remaining Balance</Text>
            <Text style={styles.amount}>₱{remainingBudget.toFixed(2)}</Text>
          </View>
          <View style={styles.smallCard}>
            <Text style={styles.label}>Daily Budget</Text>
            <Text style={styles.amount}>₱{dailyBudget.toFixed(2)}</Text>
          </View>
        </View>

        {/* Visual Graph Placeholder */}
        <View style={styles.graph}>
          <Text style={{ color: '#555' }}>📊 Visual Spending Graph (coming soon)</Text>
        </View>

        {/* Recent Expenses */}
        <Text style={styles.sectionTitle}>Recent Expenses:</Text>
        <FlatList
          data={expenses}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.expenseItem}>
              <Text style={styles.expenseText}>{item.category}: ₱{item.amount}</Text>
              <Text style={styles.expenseSub}>{item.description || 'No description'}</Text>
              <Text style={styles.expenseDate}>
                {new Date(item.date).toLocaleString('en-PH', {
                  timeZone: 'Asia/Manila',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Button mode="outlined" onPress={() => deleteExpense(item.id)} style={{ marginTop: 5 }}>Delete</Button>
            </View>
          )}
        />
      </ScrollView>

      {/* Add Expense FAB */}
      <FAB style={styles.fab} small icon="plus" onPress={() => setModalVisible(true)} />

      {/* Add Expense Modal */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <TextInput label="Category" value={category} onChangeText={setCategory} style={styles.input} />
          <TextInput label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} />
          <TextInput label="Description" value={description} onChangeText={setDescription} style={styles.input} />
          <Button mode="contained" onPress={addExpense} style={{ marginTop: 10 }}>Add Expense</Button>
          <Button mode="outlined" onPress={() => { setCameraVisible(true); setModalVisible(false); }} style={{ marginTop: 10 }}>Scan Receipt</Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 15 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  smallCard: { flex: 1, backgroundColor: '#ddd', padding: 15, borderRadius: 10, marginHorizontal: 5 },
  label: { fontSize: 14, color: '#333', marginBottom: 5 },
  amount: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  graph: { backgroundColor: '#ddd', height: 200, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  expenseItem: { backgroundColor: '#f7f7f7', padding: 10, borderRadius: 8, marginBottom: 10 },
  expenseText: { fontWeight: '600', color: '#333' },
  expenseSub: { fontSize: 12, color: '#666' },
  expenseDate: { fontSize: 11, color: '#888' },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#6200ea' },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 10 },
  input: { marginBottom: 10 },
  cameraButtons: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', marginBottom: 20 },
});