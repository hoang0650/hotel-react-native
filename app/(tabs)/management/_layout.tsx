import { Stack } from 'expo-router';
import React from 'react';

export default function ManagementLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="service" />
      <Stack.Screen name="staff" />
      <Stack.Screen name="room" />
      <Stack.Screen name="guest" />
    </Stack>
  );
}

