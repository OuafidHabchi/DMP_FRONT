import { Stack } from "expo-router";
import Sign_In from "./(tabs)/Sign_In";



export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{headerShown: false}} />
    </Stack>
  );
}
