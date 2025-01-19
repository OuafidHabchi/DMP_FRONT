import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Linking, Platform, Text } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Acceuil from './Acceuil';
import Profile from './Profile';
import Dispatche from './Dispatche';
import Messenger from './Messenger';
import shifts from './RH/shifts';
import Employees_Avaibilities from './RH/Employees Avaibilities';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import Disponibilites from './Employe/Disponibilites';
import AllEmployees from './Dispatcher/All Employees';
import { Ionicons } from '@expo/vector-icons';
import AcceuilEmployee from './Employe/AcceuilEmployee';
import WeeklyScroreCard from './RH/WeeklyScroreCard';
import Confirmation from './Dispatcher/Confirmation';
import WeeklyRecap from './Dispatcher/WeeklyRecap';
import AllVans from './Fleet/AllVans';
import ReportIssues from './Fleet/ReportIssues';
import Status from './Fleet/Status';
import VanAssignment from './Dispatcher/VanAssignment';
import WeeklyRecapFleet from './Fleet/WeeklyRecapFleet';
import AssignedVanScreen from './Employe/AssignedVanScreen';
import TimeCard from './Dispatcher/TimeCard';
import axios from 'axios';
import AgendaComponent from './RH/AgendaComponent'
import DailyReport from './Dispatcher/DailyReport';
import WeeklyStatistics from './RH/WeeklyStatistics';
import Violations from './Employe/Violations';
import Warnings from './RH/Warnings';
import EmployeeWarnings from './Employe/EmployeeWarnings';
import Quiz from './Employe/Quiz';
import QuizManagement from './RH/QuizManagement';
import ExtratRoutes from './Dispatcher/ExtratRoutes';
import ExtraRoadEmployee from './Employe/ExtraRoadEmployee';
import Phones from './Fleet/Phones';
import PowerBanks from './Fleet/PowerBanks';
import ClothesManagment from './Fleet/ClothesManagment';
import Procedure from './RH/Procedure';
import ProcedureEmployee from './Employe/ProcedureEmployee';
import Inventory from './Dispatcher/Inventory';
import CortexPrediction from './Dispatcher/CortexPrediction';
import CortexVsDa from './RH/CortexVsDa';
import AppURL from '@/components/src/URL';
import AsyncStorage from '@react-native-async-storage/async-storage';
// types.ts
export type User = {
  _id: string;
  name: string;
  familyName: string;
  tel: string;
  email: string;
  password: string;
  role: string;
  scoreCard: string;
  Transporter_ID: string;
  conversation: string;
  expoPushToken: string;
  quiz: string;
  language: string,
  dsp_code: string,
};

type RootTabParamList = {
  Profile: { user: User };
  Acceuil: { user: User };
  Schedule: { user: User };
  SignOut: undefined;
  Sign_In: undefined;
  Messenger: { user: User };
  AcceuilEmployee: { user: User };
  Fleet: { user: User };
  HR: { user: User };
  Employee: { user: User };
  Dispatche: { user: User };

};

// Types for Drawer Navigation
type ScheduleDrawerParamList = {
  AllEmployees: { user: User };
  Confirmation: { user: User }
  WeeklyRecap: { user: User }
  VanAssignment: { user: User }
  TimeCard: { user: User };
  DailyReport: { user: User };
  ExtratRoutes: { user: User };
  Inventory: { user: User };
  CortexPrediction: { user: User };
};

type FleetDrawerParamList = {
  AllVans: { user: User };
  ReportIssues: { user: User };
  Status: { user: User };
  WeeklyRecapFleet: { user: User };
  Phones: { user: User };
  PowerBanks: { user: User };
  ClothesManagment: { user: User };


};

type RHDrawerParamList = {
  Learning: { user: User };
  Employees_Avaibilities: { user: User };
  shifts: { user: User };
  AllEmployees: { user: User };
  WeeklyScroreCard: { user: User };
  AgendaComponent: { user: User };
  WeeklyStatistics: { user: User };
  Warnings: { user: User };
  QuizManagement: { user: User };
  Procedure: { user: User };
  CortexVsDa: { user: User };


};

type EmployeeDrawerParamList = {
  AcceuilEmployee: { user: User };
  AssignedVanScreen: { user: User };
  Violations: { user: User };
  EmployeeWarnings: { user: User };
  Quiz: { user: User };
  ExtraRoadEmployee: { user: User };
  ProcedureEmployee: { user: User };
  Disponibilites: { user: User };

};

// Set up Bottom Tab Navigator
const Tab = createBottomTabNavigator<RootTabParamList>();
// Set up Drawer Navigator for Schedule items
const Drawer = createDrawerNavigator<ScheduleDrawerParamList>();
const DrawerFt = createDrawerNavigator<FleetDrawerParamList>();
const DrawerRh = createDrawerNavigator<RHDrawerParamList>();
const DrawerEmployee = createDrawerNavigator<EmployeeDrawerParamList>();

function DrawerEMpl({ route }: { route: RouteProp<RootTabParamList, 'Employee'> }) {
  const { user } = route.params; // Extract user from route params

  return (
    <DrawerEmployee.Navigator
      screenOptions={{
        drawerType: 'slide',
        drawerStyle: {
          backgroundColor: '#001933',
          width: 240,
        },
        drawerActiveTintColor: 'red',
        drawerInactiveTintColor: '#ffffff',
        // Apply header styling for all screens by default
        headerStyle: {
          backgroundColor: '#001933', // Blue background for the header
        },
        headerTintColor: '#fff', // Text color in the header
      }}
    >
      <DrawerEmployee.Screen
        name="AcceuilEmployee"
        component={AcceuilEmployee}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Home' : 'Accueil',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Home' : 'Accueil', // Customize header title if needed
        }}
      />


      <DrawerEmployee.Screen
        name="AssignedVanScreen"
        component={AssignedVanScreen}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Work Day' : 'Jour de Travail',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="timer" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Work Day' : 'Jour de Travail', // Customize header title if needed
        }}
      />

      <DrawerEmployee.Screen
        name="Violations"
        component={Violations}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Violations' : 'Infractions',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="alert-circle-outline" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Violations' : 'Infractions', // Customize header title if needed
        }}
      />


      <DrawerEmployee.Screen
        name="EmployeeWarnings"
        component={EmployeeWarnings}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Warnings' : 'Avertissements',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="warning" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Warnings' : 'Avertissements', // Customize header title if needed
        }}
      />



      <DrawerEmployee.Screen
        name="ProcedureEmployee"
        component={ProcedureEmployee}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Procedures' : 'Procédures',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Procedures' : 'Procédures', // Customize header title
        }}
      />


      <DrawerEmployee.Screen
        name="ExtraRoadEmployee"
        component={ExtraRoadEmployee}
        initialParams={{ user }}
        options={{
          drawerLabel: 'Extra Routes',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
          headerTitle: 'Extra Routes', // Customize header title if needed
        }}
      />

      <DrawerEmployee.Screen
        name="Disponibilites"
        component={Disponibilites}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Availability' : 'Disponibilités',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="calendar-month" color={color} size={size} />
          ),
        }}
      />

      {user.quiz && (
        <DrawerEmployee.Screen
          name="Quiz"
          component={Quiz}
          initialParams={{ user }}
          options={{
            drawerLabel: 'Quiz ',
            drawerIcon: ({ color = "#001933", size }) => (
              <Ionicons name="balloon" size={size} color={color} />
            ),
            headerTitle: 'Quiz ', // Customize header title if needed
          }}
        />


      )}

    </DrawerEmployee.Navigator>
  );
}

function DrawerRH({ route }: { route: RouteProp<RootTabParamList, 'HR'> }) {
  const { user } = route.params; // Extract user from route params

  return (
    <DrawerRh.Navigator
      screenOptions={{
        drawerType: 'slide',
        drawerStyle: {
          backgroundColor: '#001933',
          width: 240,
        },
        drawerActiveTintColor: 'red',
        drawerInactiveTintColor: '#ffffff',
        // Apply header styling for all screens by default
        headerStyle: {
          backgroundColor: '#001933', // Blue background for the header
        },
        headerTintColor: '#fff', // Text color in the header
      }}
    >

      <DrawerRh.Screen
        name="AllEmployees"
        component={AllEmployees}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'All Employees' : 'Tous les Employés',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'All Employees' : 'Tous les Employés', // Customize header title
        }}
      />


      <DrawerRh.Screen
        name="Employees_Avaibilities"
        component={Employees_Avaibilities}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? ' Availability' : 'Disponibilité',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Employees Availability' : 'Disponibilité des Employés', // Customize header title
        }}
      />


      <DrawerRh.Screen
        name="shifts"
        component={shifts}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Shifts' : 'Quarts',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Shifts' : 'Quarts', // Customize header title
        }}
      />


      <DrawerRh.Screen
        name="AgendaComponent"
        component={AgendaComponent}
        initialParams={{ user }}
        options={{
          drawerLabel: 'Agenda',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bookmark" size={size} color={color} />),
          headerTitle: 'Agenda', // Customize header title
        }}
      />

      <DrawerRh.Screen
        name="Warnings"
        component={Warnings}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Warnings' : 'Avertissements',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="alert-circle" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Warnings' : 'Avertissements', // Customize header title
        }}
      />

      <DrawerRh.Screen
        name="Procedure"
        component={Procedure}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Procedures' : 'Procédures',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Procedures' : 'Procédures', // Customize header title
        }}
      />

      <DrawerRh.Screen
        name="CortexVsDa"
        component={CortexVsDa}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Cortex vs DA' : 'Cortex vs DA',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Cortex vs DA' : 'Cortex vs DA', // Customize header title
        }}
      />

      <DrawerRh.Screen
        name="WeeklyStatistics"
        component={WeeklyStatistics}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Weekly Violations' : 'Violations Hebdomadaires',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Weekly Violations' : 'Violations Hebdomadaires', // Customize header title
        }}
      />


      {Platform.OS === "web" && (
        <DrawerRh.Screen
          name="WeeklyScroreCard"
          component={WeeklyScroreCard}
          initialParams={{ user }}
          options={{
            drawerLabel: user.language === 'English' ? 'Score Card' : 'Carte de Score',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="document-attach-sharp" size={size} color={color} />
            ),
            headerTitle: user.language === 'English' ? 'Weekly Score Card' : 'Carte de Score Hebdomadaire', // Customize header title
          }}
        />
      )}


      <DrawerRh.Screen
        name="QuizManagement"
        component={QuizManagement}
        initialParams={{ user }}
        options={{
          drawerLabel: 'Quiz',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="balloon" size={size} color={color} />),
          headerTitle: 'Quiz', // Customize header title
        }}
      />



    </DrawerRh.Navigator>
  );
}


function DrawerFleet({ route }: { route: RouteProp<RootTabParamList, 'Fleet'> }) {
  const { user } = route.params; // Extract user from route params

  return (
    <DrawerFt.Navigator
      screenOptions={{
        drawerType: 'slide',
        drawerStyle: {
          backgroundColor: '#001933',
          width: 240,
        },
        drawerActiveTintColor: 'red',
        drawerInactiveTintColor: '#ffffff',
        // Apply header styling for all screens by default
        headerStyle: {
          backgroundColor: '#001933', // Blue background for the header
        },
        headerTintColor: '#fff', // Text color in the header
      }}
    >
      <DrawerFt.Screen
        name="WeeklyRecapFleet"
        component={WeeklyRecapFleet}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Recap' : 'Récapitulatif',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="bus" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Recap' : 'Récapitulatif', // Customize header title if needed
        }}
      />

      <DrawerFt.Screen
        name="ReportIssues"
        component={ReportIssues}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Report Issues' : 'Rapporter des Problèmes',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="alert-circle-outline" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Report Issues' : 'Rapporter des Problèmes', // Customize header title if needed
        }}
      />


      <DrawerFt.Screen
        name="AllVans"
        component={AllVans}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Vehicles' : 'Véhicules',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="bus" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Vehicles' : 'Véhicules', // Customize header title if needed
        }}
      />


      <DrawerFt.Screen
        name="Phones"
        component={Phones}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Phones' : 'Téléphones',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="call" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Phones' : 'Téléphones',
        }}
      />


      <DrawerFt.Screen
        name="PowerBanks"
        component={PowerBanks}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Power Bank' : 'Batterie Externe',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="battery-full" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'PowerBank' : 'Batterie Externe',
        }}
      />


      <DrawerFt.Screen
        name="ClothesManagment"
        component={ClothesManagment}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Clothes' : 'Vêtements',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="shirt" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Clothes' : 'Vêtements',
        }}
      />


      <DrawerFt.Screen
        name="Status"
        component={Status}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Status' : 'Statut',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="create-outline" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Status' : 'Statut', // Customize header title if needed
        }}
      />

    </DrawerFt.Navigator>
  );
}


function ScheduleDrawer({ route }: { route: RouteProp<RootTabParamList, 'Schedule'> }) {
  const { user } = route.params; // Extract user from route params

  return (
    <Drawer.Navigator
      screenOptions={{
        drawerType: 'slide',
        drawerStyle: {
          backgroundColor: '#001933',
          width: 240,
        },
        drawerActiveTintColor: 'red',
        drawerInactiveTintColor: '#ffffff',
        // Apply header styling for all screens by default
        headerStyle: {
          backgroundColor: '#001933', // Blue background for the header
        },
        headerTintColor: '#fff', // Text color in the header
      }}
    >
      <Drawer.Screen
        name="AllEmployees"
        component={AllEmployees}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'All Employees' : 'Tous les Employés',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'All Employees' : 'Tous les Employés', // Customize header title if needed
        }}
      />


      <Drawer.Screen
        name="WeeklyRecap"
        component={WeeklyRecap}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Weekly Recap' : 'Récapitulatif',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Weekly Recap' : 'Récapitulatif Hebdomadaire', // Customize header title
        }}
      />


      <Drawer.Screen
        name="Confirmation"
        component={Confirmation}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Confirmations' : 'Confirmations',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-circle" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Confirmation Sender' : 'Envoyeur de Confirmation', // Customize header title
        }}
      />


      <Drawer.Screen
        name="VanAssignment"
        component={VanAssignment}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Van Assignment' : 'Attribution de Van',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bus-sharp" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Van Assignment' : 'Attribution de Van', // Customize header title
        }}
      />

      <Drawer.Screen
        name="TimeCard"
        component={TimeCard}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Time Card' : 'Carte de Temps',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="timer-sharp" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Time Card' : 'Carte de Temps', // Customize header title if needed
        }}
      />
      <Drawer.Screen
        name="CortexPrediction"
        component={CortexPrediction}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Cortex Prediction' : 'Prédiction Cortex',
          drawerIcon: ({ color = "#001933", size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Cortex Prediction' : 'Prédiction Cortex', // Titre personnalisé pour l'en-tête
        }}
      />


      <Drawer.Screen
        name="DailyReport"
        component={DailyReport}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Daily Violations' : 'Infractions ',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="alert-circle" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Daily Violations' : 'Infractions Quotidiennes', // Customize header title
        }}
      />


      <Drawer.Screen
        name="ExtratRoutes"
        component={ExtratRoutes}
        initialParams={{ user }}
        options={{
          drawerLabel: 'Extras Routes',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
          headerTitle: 'Extras Routes', // Customize header title
        }}
      />
      <Drawer.Screen
        name="Inventory"
        component={Inventory}
        initialParams={{ user }}
        options={{
          drawerLabel: user.language === 'English' ? 'Inventory' : 'Inventaire',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
          headerTitle: user.language === 'English' ? 'Inventory' : 'Inventaire', // Customize header title
        }}
      />


    </Drawer.Navigator>
  );
}


export default function _layoutHome() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const route = useRoute();
  const { user } = route.params as { user: User };
  // State to track unread messages for the badge
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  // Fonction de vérification des messages non lus

  const checkUnreadMessages = async () => {
    try {
      const response = await axios.get(
        `${AppURL}/api/conversations/conversations/unreadStatus/${user._id}`,
        {
          params: {
            dsp_code: user.dsp_code, // Ajout du dsp_code comme paramètre
          },
        }
      );
      const unreadStatus = response.data;
      // Si une valeur non nulle existe, cela signifie qu'il y a des messages non lus
      const hasUnread = Object.values(unreadStatus).some((status) => status !== null);
      setHasUnreadMessages(hasUnread);
    } catch (error) {
      console.error('Erreur lors de la vérification des messages non lus', error);
    }
  };


  // Vérifier les messages non lus au chargement de _layoutHome
  useEffect(() => {
    checkUnreadMessages();
  }, []);

  // Callback to update unread status
  const handleUnreadStatus = (status: boolean) => {
    setHasUnreadMessages(status);
  };

  const handleSignOut = async () => {
    try {
      // Supprimer les informations de connexion de AsyncStorage
      await AsyncStorage.removeItem('email');
      await AsyncStorage.removeItem('password');
      await AsyncStorage.removeItem('Dsp_Code');
  
      // Navigation vers la page de connexion
      navigation.navigate('Sign_In');
    } catch (error) {
      console.error('Error clearing AsyncStorage during sign out:', error);
    }
  };
  

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName={user.role === "manager" ? "Acceuil" : "Employee"}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: 'red',
          tabBarInactiveTintColor: '#ffff',
          tabBarStyle: { backgroundColor: '#001933' },
        }}
      >
        {user.role === "manager" && (
          <Tab.Screen
            name="Acceuil"
            component={Acceuil}
            initialParams={{ user }}
            options={{
              tabBarLabel: user.language === 'English' ? 'Home' : 'Accueil',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="home" color={color} size={size} />
              ),
            }}
          />
        )}
        {user.role === "driver" && (

          <Tab.Screen
            name="Employee"
            component={DrawerEMpl}
            initialParams={{ user }}
            options={{
              tabBarLabel: user.language === 'English' ? 'Home' : 'Accueil',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="home" color={color} size={size} />
              ),
            }}
          />

        )}

        {user.role === "manager" && (
          <Tab.Screen
            name="HR"
            component={DrawerRH} // Use Drawer for the Schedule tab
            initialParams={{ user }}
            options={{
              tabBarLabel: user.language === 'English' ? 'HR' : 'RH',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="work" color={color} size={size} />
              ),
            }}
          />

        )}

        {user.role === "manager" && (
          <Tab.Screen
            name="Schedule"
            component={ScheduleDrawer} // Use Drawer for the Schedule tab
            initialParams={{ user }}
            options={{
              tabBarLabel: 'Dispatch',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="manage-accounts" color={color} size={size} />
              ),
            }}
          />
        )}


        {user.role === "manager" && (
          <Tab.Screen
            name="Fleet"
            component={DrawerFleet} // Use Drawer for the Schedule tab
            initialParams={{ user }}
            options={{
              tabBarLabel: user.language === 'English' ? 'Fleet' : 'Flotte',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="commute" color={color} size={size} />
              ),
            }}
          />

        )}
        {user.role === "driver" && (
          <Tab.Screen
            name="Dispatche"
            component={Dispatche}
            initialParams={{ user }}
            options={{
              tabBarLabel: 'Dispatch ',
              tabBarIcon: ({ color = "#001933", size }) => (
                <Ionicons name="send" size={size} color={color} />
              ),
              headerTitle: 'Dispatch ', // Customize header title if needed
            }}
          />
        )}

        <Tab.Screen
          name="Messenger"

          children={() => (
            <Messenger user={user} onUnreadStatusChange={handleUnreadStatus} />
          )}
          options={{
            tabBarLabel: 'Messenger',
            tabBarIcon: ({ color, size }) => (
              <View>
                <FontAwesome name="comment" color={color} size={size} />
                {hasUnreadMessages && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>●</Text>
                  </View>
                )}
              </View>
            ),
          }}
        />





        <Tab.Screen
          name="Profile"
          component={Profile}
          initialParams={{ user }}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <FontAwesome name="user" color={color} size={size} />
            ),
          }}
        />

        <Tab.Screen
          name="SignOut"
          component={View}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              handleSignOut();
            },
          }}
          options={{
            tabBarLabel: user.language === 'English' ? 'Sign Out' : 'Déconnecter',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="logout" color={color} size={size} />
            ),
          }}
        />

      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: 'red',
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    marginVertical: 5,
  },
});
