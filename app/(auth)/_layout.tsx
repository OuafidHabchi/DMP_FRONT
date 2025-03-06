import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Sign_In" options={{ title: "Connexion" }} />
      <Stack.Screen name="Sign_Up" options={{ title: "Inscription" }} />
      <Stack.Screen name="AccessDenied" options={{ title: "AccessDenied" }} />
    </Stack>
  );
}
