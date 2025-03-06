import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';


// Types
type Employee = {
  _id: string;
  name: string;
  familyName: string;
};

type Disponibility = {
  employeeId: string;
  shiftId: string;
  selectedDay: string;
  presence: 'confirmed' | 'rejected';
};

type Shift = {
  _id: string;
  name: string;
  color: string;
};

type TimeCard = {
  employeeId: string;
  day: string;
  startTime?: string;
  endTime?: string;
  tel?: string;
  powerbank?: string;
};

type User = {
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

// WeeklyRecap Component
const WeeklyRecap = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [disponibilities, setDisponibilities] = useState<Disponibility[]>([]);
  const [timeCards, setTimeCards] = useState<TimeCard[]>([]);
  const [currentWeekDates, setCurrentWeekDates] = useState<Date[]>([]);
  const [weekOffset, setWeekOffset] = useState(0); // Offset for navigating weeks
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true); // Loading state


  // Calculate the current or next week
  const getWeekDates = (weekOffset = 0) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const sundayOffset = -dayOfWeek; // Offset to the start of the week (Sunday)
    const startOfWeek = new Date(today.setDate(today.getDate() + sundayOffset + weekOffset * 7));
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
    return weekDates;
  };

  // Fetch employees, shifts, disponibilités, and time cards
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Start loading
      try {
        // Lancer toutes les requêtes en parallèle avec Promise.all
        const [employeesResponse, shiftsResponse, dispoResponse, timeCardsResponse] = await Promise.all([
          axios.get(`${AppURL}/api/employee?dsp_code=${user?.dsp_code}`),
          axios.get(`${AppURL}/api/shifts/shifts?dsp_code=${user?.dsp_code}`),
          axios.get(`${AppURL}/api/disponibilites/disponibilites?dsp_code=${user?.dsp_code}`),
          axios.get(`${AppURL}/api/timecards/timecards?dsp_code=${user?.dsp_code}`)
        ]);

        setEmployees(employeesResponse.data);
        setShifts(shiftsResponse.data);

        // Filtrer les disponibilités confirmées
        const confirmedDispos = dispoResponse.data.filter(
          (dispo: Disponibility) => dispo.presence === 'confirmed'
        );
        setDisponibilities(confirmedDispos);

        setTimeCards(timeCardsResponse.data); // Store time cards data
        setFilteredEmployees(employeesResponse.data); // Initialize filtered employees
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false); // End loading
      }
    };


    fetchData();
    setCurrentWeekDates(getWeekDates(weekOffset)); // Initialize with the current week
  }, [weekOffset]);

  // Filter employees based on search query
  useEffect(() => {
    if (searchQuery === '') {
      setFilteredEmployees(employees);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      setFilteredEmployees(
        employees.filter(
          (employee) =>
            employee.name.toLowerCase().includes(lowerCaseQuery) ||
            employee.familyName.toLowerCase().includes(lowerCaseQuery)
        )
      );
    }
  }, [searchQuery, employees]);

  // Get employee's shift for a specific day
  const getEmployeeShiftForDay = (employeeId: string, date: Date) => {
    const dateString = date.toDateString();
    const dispoForDay = disponibilities.find(
      (dispo) => dispo.employeeId === employeeId && dispo.selectedDay === dateString
    );
    return dispoForDay ? shifts.find((shift) => shift._id === dispoForDay.shiftId) : null;
  };

  // Calculate hours worked for each day
  const calculateHoursWorked = (employeeId: string, date: Date): number => {
    const dayString = date.toDateString();
    const timeCard = timeCards.find(
      (card) => card.employeeId === employeeId && card.day === dayString
    );

    if (timeCard && timeCard.startTime && timeCard.endTime) {
      const start = new Date(`1970-01-01T${timeCard.startTime}Z`);
      const end = new Date(`1970-01-01T${timeCard.endTime}Z`);
      let hoursWorked = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert ms to hours

      // Deduct 30 minutes if hoursWorked is more than 5 hours
      if (hoursWorked > 5) {
        hoursWorked -= 0.5; // Subtract 0.5 hours (30 minutes)
      }

      return hoursWorked > 0 ? hoursWorked : 0;
    }

    return 0;
  };

  // Calculate total hours worked for the week
  const calculateTotalWeeklyHours = (employeeId: string): number => {
    return currentWeekDates.reduce((total, date) => {
      return total + calculateHoursWorked(employeeId, date);
    }, 0);
  };

  // Handle week navigation
  const handleWeekChange = (direction: 'prev' | 'next') => {
    setWeekOffset((prevOffset) => (direction === 'next' ? prevOffset + 1 : prevOffset - 1));
  };

  return (
    <View style={styles.container}>
      {/* Navigation buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity onPress={() => handleWeekChange('prev')} style={styles.navButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.currentWeekText}>
          {`${currentWeekDates[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${currentWeekDates[6]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
        </Text>

        <TouchableOpacity onPress={() => handleWeekChange('next')} style={styles.navButton}>
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>


      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder={
            user?.language === 'English' ? ' 🔍 Search employee by name' : ' 🔍 Rechercher un employé par nom'
          }
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text)}
        />
      </View>

      {/* Loading spinner or content */}
      {loading ? (
        <ActivityIndicator size="large" color="#001933" />

      ) : (
        <ScrollView style={styles.table}>
          {/* Weekly view table */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, { flex: 2 }]}>Employee</Text>
            {currentWeekDates.map((date, index) => (
              <Text key={index} style={styles.headerCell}>
                {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
              </Text>
            ))}
          </View>

          {filteredEmployees.map((employee) => {
            const totalWeeklyHours = calculateTotalWeeklyHours(employee._id);
            return (
              <View key={employee._id} style={styles.row}>
                <Text
                  style={[
                    styles.employeeCell,
                    { flex: 2 },
                    {
                      color: totalWeeklyHours > 40 ? 'red' : totalWeeklyHours > 30 ? 'orange' : '#001933',
                    },
                  ]}
                >
                  {`${employee.name} ${employee.familyName} - (${totalWeeklyHours.toFixed(2)} h)`}
                </Text>

                {currentWeekDates.map((date, index) => {
                  const shift = getEmployeeShiftForDay(employee._id, date);
                  const hoursWorked = calculateHoursWorked(employee._id, date);
                  return (
                    <View
                      key={index}
                      style={[styles.cell, { backgroundColor: shift ? shift.color : '#ccc' }]}
                    >
                      {shift ? (
                        <Text style={styles.shiftText}>
                          {Platform.OS === 'web'
                            ? `${shift.name} - ${hoursWorked.toFixed(2)} h`
                            : `${hoursWorked.toFixed(2)} h`}
                        </Text>
                      ) : (
                        <Text style={styles.shiftText}>{`${hoursWorked.toFixed(2)}`}</Text>
                      )}
                    </View>

                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default WeeklyRecap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffff', // Blue background
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 10,
    backgroundColor: '#001933', // Même couleur que le composant ExtraRoadEmployee
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50, // Bouton rond
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // Ajout d'une ombre pour un effet de relief
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  searchBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#f0f0f0', // Gris clair pour contraste léger sur fond blanc
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 10,
    height: 40,
    borderColor: '#001933', // Bordure bleu foncé
    borderWidth: 1,
  },
  table: {
  flex: 1,
  borderWidth: 1,
  borderColor: '#001933',
  borderRadius: 8,
  backgroundColor: '#fff',
},
  headerRow: {
  flexDirection: 'row',
  backgroundColor: '#001933', // Dark blue for the header
  padding: 10,
},
  headerCell: {
  flex: 1,
  fontSize: 16,
  fontWeight: 'bold',
  color: '#fff',
  textAlign: 'center',
},
  row: {
  flexDirection: 'row',
  padding: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#001933',
},
  employeeCell: {
  flex: 2,
  fontWeight: 'bold',
  color: '#001933',
  textAlign: 'left',
},
  cell: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 5,
  borderRadius: 4,
  height: 40,
},
  shiftText: {
  color: '#fff',
  fontWeight: 'bold',
},
  currentWeekText: {
  color: '#001933',
  fontWeight: 'bold',
  fontSize: 16,
  textAlign: 'center',
},
});
