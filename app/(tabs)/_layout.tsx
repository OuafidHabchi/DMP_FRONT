import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Sign_In from './Sign_In';
import Sign_Up from './Sign_Up';
import _layoutHome from './HomePage/_layoutHome';
import Chat from './HomePage/Chat';
import NotFound from '../NotFound';



export type User = {
  _id: string;
  name: string;
  familyName: string;
  tel: string;
  email: string;
  password: string;
  role: string;
  language: string,
  dsp_code: string,
  conversation: string;
  expoPushToken?: string;
};


export type RootStackParamList = {
  _layoutHome: { user: any };
  Sign_In: undefined;
  Sign_Up: undefined;
  NotFound: undefined;
  Chat: { conversationId: string; user: User; participantIds: string[] }; // Add Chat route

};

const Stack = createStackNavigator<RootStackParamList>();

const _layout: React.FC = ({ }) => {
  return (
    <Stack.Navigator initialRouteName="Sign_In">
      <Stack.Screen name="_layoutHome" component={_layoutHome} options={{ headerShown: false }} />
      <Stack.Screen name="Sign_In" component={Sign_In} options={{ headerShown: false }} />
      <Stack.Screen name="Sign_Up" component={Sign_Up} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={Chat} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

export default _layout;
