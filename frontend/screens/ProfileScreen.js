import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

export default function ProfileScreen({ route }) {
  const navigation = useNavigation();
  const { userId, email, password } = route.params; // get data from route params
  const [showPassword, setShowPassword] = useState(false);

  const BASE_URL = "http://192.168.0.103:5000"; // replace with your Flask server IP

  // Logout handler
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => {
            // Go back to login screen
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          },
        },
      ]
    );
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${BASE_URL}/delete_user/${userId}`);
              Alert.alert("Account deleted");

              // Navigate back to login after deletion
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            } catch (error) {
              console.log(error);
              Alert.alert("Failed to delete account");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.infoBox}>
        <Text style={styles.label}>User ID:</Text>
        <Text style={styles.value}>{userId}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{email}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Password:</Text>
        <Text style={styles.value}>
          {showPassword ? (password || 'N/A') : '••••••••'}
        </Text>
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Text style={styles.togglePassword}>{showPassword ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.buttonText}>Delete Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f2f2f2', 
    padding: 20 
  },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, color: '#333' },
  infoBox: { 
    width: '100%', 
    padding: 15, 
    backgroundColor: '#fff', 
    borderRadius: 10, 
    marginBottom: 15, 
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  label: { fontSize: 16, color: '#666', marginBottom: 5 },
  value: { fontSize: 18, fontWeight: '500', color: '#000' },
  togglePassword: { color: '#007bff', marginTop: 5, fontWeight: '500' },
  logoutButton: { 
    backgroundColor: '#007bff', 
    paddingVertical: 15, 
    paddingHorizontal: 60, 
    borderRadius: 10, 
    marginTop: 20 
  },
  deleteButton: { 
    backgroundColor: '#ff4d4d', 
    paddingVertical: 15, 
    paddingHorizontal: 50, 
    borderRadius: 10, 
    marginTop: 15 
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});