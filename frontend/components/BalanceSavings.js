import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert, 
  StyleSheet 
} from "react-native";
import axios from "axios";

export default function BalanceSavings({ userId, onUpdate }) {
  const [balance, setBalance] = useState(0);
  const [goal, setGoal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentField, setCurrentField] = useState("");
  const [inputValue, setInputValue] = useState("");

  const BASE_URL = "http://192.168.0.103:5000";

  // Fetch initial balance and goal
  useEffect(() => {
    if (!userId) return;
    axios.get(`${BASE_URL}/get_balance_goal/${userId}`)
      .then(res => {
        const { balance: b = 0, savings_goal: g = 0 } = res.data;
        setBalance(b);
        setGoal(g);
        if (onUpdate) onUpdate(b, g);
      })
      .catch(err => console.log(err));
  }, [userId]);

  const openModal = (field) => {
    setCurrentField(field);
    setInputValue(field === "balance" ? balance.toString() : goal.toString());
    setModalVisible(true);
  };

  const saveValue = () => {
    const value = parseFloat(inputValue);
    if (isNaN(value)) {
      return Alert.alert("Invalid input", "Please enter a numeric value");
    }

    const endpoint = currentField === "balance" ? "/set_balance" : "/set_savings_goal";
    const payload = currentField === "balance"
      ? { user_id: userId, balance: value }
      : { user_id: userId, savings_goal: value };

    axios.post(`${BASE_URL}${endpoint}`, payload)
      .then(res => {
        if (currentField === "balance") setBalance(value);
        else setGoal(value);

        setModalVisible(false);
        Alert.alert("Saved", res.data.message);

        if (onUpdate) onUpdate(
          currentField === "balance" ? value : balance,
          currentField === "goal" ? value : goal
        );
      })
      .catch(err => {
        console.log(err.response?.data || err.message);
        Alert.alert("Error", "Failed to save");
      });
  };

  return (
    <View style={styles.container}>
      {/* Side by side cards */}
      <View style={styles.row}>
        {/* Total Balance */}
        <TouchableOpacity style={styles.card} onPress={() => openModal("balance")}>
          <Text style={styles.cardLabel}>Total Balance</Text>
          <Text style={styles.cardValue}>₱ {balance.toFixed(2)}</Text>
        </TouchableOpacity>

        {/* Savings Goal */}
        <TouchableOpacity style={styles.card} onPress={() => openModal("goal")}>
          <Text style={styles.cardLabel}>Savings Goal</Text>
          <Text style={styles.cardValue}>₱ {goal.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for input */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {currentField === "balance" ? "Set Total Balance" : "Set Savings Goal"}
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={inputValue}
              onChangeText={setInputValue}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={saveValue}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  card: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 4,
  },
  cardLabel: { fontSize: 16, color: "#555" },
  cardValue: { fontSize: 22, fontWeight: "bold", marginTop: 5, color: "#007bff" },

  modalBackground: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: "80%", backgroundColor: "#fff", borderRadius: 12, padding: 20, alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  input: { width: "100%", borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 10, fontSize: 16, marginBottom: 20 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  saveButton: { backgroundColor: "#007bff", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  cancelButton: { backgroundColor: "#ccc", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16, textAlign: "center" },
});
