import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const register = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    try {
      const res = await axios.post('http://192.168.0.103:5000/register', { email, password });
      Alert.alert("Success", "Registered successfully!");
      // Navigate to login after successful registration
      navigation.replace('Login');
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed";
      Alert.alert("Registration Error", msg);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button title="Register" onPress={register} />

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 20 }}>
        <Text style={{ color: 'blue' }}>Already have an account? Login here</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:20 },
  title: { fontSize:28, fontWeight:'bold', marginBottom:20, textAlign:'center' },
  input: { borderWidth:1, borderColor:'#ccc', padding:10, marginBottom:15, borderRadius:5 },
});
