import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, Platform, Dimensions, ActivityIndicator, Modal } from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons'; // Import icons
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';

// Base URLs
const URL_EMPLOYEES = 'https://coral-app-wqv9l.ondigitalocean.app'; // Employees port
const URL_SHIFTS = 'https://coral-app-wqv9l.ondigitalocean.app'; // Shifts port
const URL_DISPO = 'https://coral-app-wqv9l.ondigitalocean.app'; // Availability port

type ScoreCard = 'Fantastic' | 'Great' | 'Fair' | 'Poor' | 'New DA';

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

// Type for employees
type Employee = {
  suspensions: any;
  _id: string;
  name: string;
  familyName: string;
  scoreCard: ScoreCard; // Typé avec ScoreCard
  expoPushToken: string;
};

// Type for shifts
type Shift = {
  _id: string;
  name: string;
  starttime: string;
  endtime: string;
  color: string; // New property for the shift color
};

// Type for availability
type Disponibility = {
  _id: string; // Added to allow deletion
  expoPushToken: string;
  employeeId: string;
  selectedDay: string;
  shiftId: string;
  status?: 'accepted' | 'rejected'; // Add status for each availability
  counted?: boolean; // To know if this availability has already been counted
  decisions?: 'pending' | 'accepted' | 'rejected'; // Correction: use of "decisions" with an "s"
};
type Warning = {
  _id: string;
  employeID: string;
  type: string;
  raison: string;
  description: string;
  severity: string;
  date: string;
  read: boolean;
  signature?: boolean;
  startDate?: string;
  endDate: string;
};

const EmployeesAvaibilities = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [disponibilities, setDisponibilities] = useState<Disponibility[]>([]);
  const [currentWeekDates, setCurrentWeekDates] = useState<Date[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ employeeId: string, date: Date } | null>(null); // State to manage the selected cell
  const [acceptedCount, setAcceptedCount] = useState(0); // Counter for accepted shifts
  const [rejectedCount, setRejectedCount] = useState(0); // Counter for rejected shifts
  const [showShiftPicker, setShowShiftPicker] = useState<{ employeeId: string, date: Date } | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [isWeekView, setIsWeekView] = useState(true);  // New state to manage week/day view
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // Add state for the search bar
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true); // Add loading state
  const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);

  // Function to prepare the summary data structure for the current week
  const getWeeklyShiftSummary = () => {
    // Create an object to hold shift counts for each type across the days
    const shiftSummary = shifts.map((shift) => {
      const daysSummary = currentWeekDates.map((date) => {
        const dateString = date.toDateString();
        const dayDisponibilities = disponibilities.filter(
          (dispo) => dispo.shiftId === shift._id && new Date(dispo.selectedDay).toDateString() === dateString
        );

        // Count by status
        const pendingCount = dayDisponibilities.filter((dispo) => dispo.decisions === 'pending').length;
        const acceptedCount = dayDisponibilities.filter((dispo) => dispo.decisions === 'accepted').length;
        const rejectedCount = dayDisponibilities.filter((dispo) => dispo.decisions === 'rejected').length;

        return {
          date: dateString,
          pending: pendingCount,
          accepted: acceptedCount,
          rejected: rejectedCount,
        };
      });

      return {
        shiftName: shift.name,
        color: shift.color,
        daysSummary,
      };
    });

    return shiftSummary;
  };



  const toggleSummaryModal = () => {
    setIsSummaryModalVisible(!isSummaryModalVisible);
  };


  // Calculate the current or next week
  const getWeekDates = (weekOffset = 0) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday is 0, Monday is 1, etc.
    const sundayOffset = -dayOfWeek; // Shift to Sunday of the current week
    const startOfWeek = new Date(today.setDate(today.getDate() + sundayOffset + weekOffset * 7)); // Start from Sunday
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
    return weekDates;
  };

  // Fetch employees, shifts, and availabilities
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true); // Start loading before fetching
        const employeesResponse = await axios.get(`${URL_EMPLOYEES}/api/employee`, {
          params: { dsp_code: user.dsp_code },
        });
        const shiftsResponse = await axios.get(`${URL_SHIFTS}/api/shifts/shifts`, {
          params: { dsp_code: user.dsp_code },
        });
        const dispoResponse = await axios.get(`${URL_DISPO}/api/disponibilites/disponibilites`, {
          params: { dsp_code: user.dsp_code },
        });
        setEmployees(employeesResponse.data);
        setShifts(shiftsResponse.data);
        setDisponibilities(dispoResponse.data);
        setFilteredEmployees(employeesResponse.data); // Init filtered employees
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false); // End loading after data is fetched
      }
    };

    fetchData();
    setCurrentWeekDates(getWeekDates(weekOffset)); // Initialize with the current week
  }, [weekOffset]);


  // Function to check if an employee is available for a shift on a given date
  const getEmployeeShiftForDay = (employeeId: string, date: Date) => {
    const dateString = date.toDateString();
    const dispoForDay = disponibilities.find(
      (dispo) => dispo.employeeId === employeeId && dispo.selectedDay === dateString
    );
    return dispoForDay ? shifts.find((shift) => shift._id === dispoForDay.shiftId) : null;
  };

  // Filter employees according to search
  useEffect(() => {
    if (searchQuery === '') {
      const sortedEmployees = [...employees].sort((a, b) => {
        const scorePriority = {
          Fantastic: 1,
          Great: 2,
          Fair: 3,
          Poor: 4,
          'New DA': 5,
        };

        return (
          (scorePriority[a.scoreCard] || 6) - (scorePriority[b.scoreCard] || 6)
        );
      });

      setFilteredEmployees(sortedEmployees);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filteredAndSortedEmployees = [...employees]
        .filter(
          (employee) =>
            employee.name.toLowerCase().includes(lowerCaseQuery) ||
            employee.familyName.toLowerCase().includes(lowerCaseQuery)
        )
        .sort((a, b) => {
          const scorePriority = {
            Fantastic: 1,
            Great: 2,
            Fair: 3,
            Poor: 4,
            'New DA': 5,
          };

          return (
            (scorePriority[a.scoreCard] || 6) - (scorePriority[b.scoreCard] || 6)
          );
        });

      setFilteredEmployees(filteredAndSortedEmployees);
    }
  }, [searchQuery, employees]);


  // Change week or day
  const handleWeekChange = (direction: 'prev' | 'next') => {
    if (isWeekView) {
      setWeekOffset((prevOffset) => (direction === 'next' ? prevOffset + 1 : prevOffset - 1));
      setCurrentWeekDates(getWeekDates(weekOffset));
    } else {
      setSelectedDay((prevDate) => {
        const newDate = new Date(prevDate || new Date());
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        return newDate;
      });
    }
  };

  const handleResetToCurrent = () => {
    setWeekOffset(0);
    setSelectedDay(new Date());
    setCurrentWeekDates(getWeekDates(0)); // Reset to current week
  };

  const handleCellPress = (employeeId: string, date: Date, event: any) => {
    const shift = getEmployeeShiftForDay(employeeId, date);
    if (!shift) {
      setShowShiftPicker({ employeeId, date });
      return;
    }
    setSelectedCell({ employeeId, date });
  };


  const handleShiftSelection = async (shiftId: string) => {
    if (!showShiftPicker) return;

    const { employeeId, date } = showShiftPicker;
    const selectedEmployee = employees.find((employee) => employee._id === employeeId);

    if (!selectedEmployee) {
      Alert.alert('Error', 'Employee not found.');
      return;
    }

    try {
      const response = await axios.post(`${URL_DISPO}/api/disponibilites/disponibilites/create`, {
        employeeId,
        selectedDay: date.toDateString(),
        shiftId,
        decisions: 'pending', // Disponibilité créée avec le statut 'pending'
        expoPushToken: selectedEmployee.expoPushToken, // Ajouter expoPushToken dans la requête
        dsp_code: user.dsp_code, // Ajout de dsp_code
      });

      const newDisponibility = response.data;
      setDisponibilities((prevDisponibilities) => [...prevDisponibilities, newDisponibility]);
      setShowShiftPicker(null);
    } catch (error) {
      console.error('Error creating disponibility:', error);
      Alert.alert('Error', 'An error occurred while creating the disponibility.');
      window.alert('An error occurred while creating the disponibility.');
    }
  };

  const handleAccept = (employeeId: string, date: Date) => {
    setDisponibilities((prev) =>
      prev.map((dispo) => {
        if (dispo.employeeId === employeeId && new Date(dispo.selectedDay).toDateString() === date.toDateString()) {
          if (dispo.status === 'rejected') {
            setRejectedCount((prev) => prev - 1); // Decrement rejected if already rejected
            setAcceptedCount((prev) => prev + 1); // Increment accepted
          } else if (!dispo.status) {
            setAcceptedCount((prev) => prev + 1); // If it's the first decision
          }
          return { ...dispo, status: 'accepted', decisions: 'accepted' };
        }
        return dispo;
      })
    );
    setSelectedCell(null);
  };

  const handleReject = (employeeId: string, date: Date) => {
    setDisponibilities((prev) =>
      prev.map((dispo) => {
        if (dispo.employeeId === employeeId && new Date(dispo.selectedDay).toDateString() === date.toDateString()) {
          if (dispo.status === 'accepted') {
            setAcceptedCount((prev) => prev - 1); // Decrement accepted if already accepted
            setRejectedCount((prev) => prev + 1); // Increment rejected
          } else if (!dispo.status) {
            setRejectedCount((prev) => prev + 1); // If it's the first decision
          }
          return { ...dispo, status: 'rejected', decisions: 'rejected' };
        }
        return dispo;
      })
    );
    setSelectedCell(null);
  };

  const handleDelete = async (disponibilityId: string) => {
    try {
      await axios.delete(`${URL_DISPO}/api/disponibilites/disponibilites/${disponibilityId}`, {
        params: { dsp_code: user.dsp_code }, // Ajout de dsp_code dans la requête
      });

      setDisponibilities((prev) => prev.filter((dispo) => dispo._id !== disponibilityId));
    } catch (error) {
      Alert.alert('Error', 'An error occurred while deleting the shift.');
      window.alert('An error occurred while deleting the shift.');
      console.error('Error deleting shift:', error);
    }
  };


  const handlePublish = async () => {
    try {
      const decisions = disponibilities
        .filter((dispo) => dispo.status === 'accepted' || dispo.status === 'rejected')
        .map((dispo) => ({
          employeeId: dispo.employeeId,
          selectedDay: dispo.selectedDay,
          shiftId: dispo.shiftId,
          status: dispo.status, // Ensure to send accepted or rejected
        }));

      await axios.post(`${URL_DISPO}/api/disponibilites/updateDisponibilites`, { decisions, dsp_code: user.dsp_code });

      Alert.alert('Success', 'The decisions have been successfully published.');
      window.alert('The decisions have been successfully published.');
      setAcceptedCount(0);
      setRejectedCount(0);
    } catch (error) {
      Alert.alert('Error', 'An error occurred while publishing the decisions.');
      window.alert('An error occurred while publishing the decisions.');
      console.error('Error publishing decisions:', error);
    }
  };


  return (
    <View style={styles.container}>
      {loading ? ( // Show loader when loading
        <ActivityIndicator size="large" color="#001933" />
      ) : (
        <>
          <View style={styles.header}>

            <View style={styles.weekControls}>
              {/* Button to change the view */}
              <TouchableOpacity onPress={() => setIsWeekView(!isWeekView)} style={styles.toggleButton}>
                <Text style={styles.toggleButtonText}>
                  {user.language === 'English' ? (isWeekView ? 'See by day' : 'See by week') : (isWeekView ? 'jour' : 'semaine')}
                </Text>
              </TouchableOpacity>

              {/* Button for the summary */}
              <TouchableOpacity onPress={toggleSummaryModal} style={styles.summaryButton}>
                <Text style={styles.summaryButtonText}>
                  {user.language === 'English' ? 'Summary' : 'Résumé'}
                </Text>
              </TouchableOpacity>

              {/* Button to reset to today */}
              <TouchableOpacity onPress={handleResetToCurrent} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>
                  <Text style={styles.resetButtonText}>Today</Text>
                </Text>
              </TouchableOpacity>
            </View>



            <TextInput
              style={styles.searchBar}
              placeholder={user.language === 'English' ? 'Search employee by name' : 'Rechercher un employé par nom'}
              value={searchQuery}
              onChangeText={(text) => setSearchQuery(text)}
            />

            <View style={styles.weekControls}>
              {/* Bouton pour aller à la semaine précédente */}
              <TouchableOpacity onPress={() => handleWeekChange('prev')} style={styles.navButton}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>

              {/* Étiquette de la semaine/jour actuelle */}
              <View style={styles.weekLabelContainer}>
                <Text style={styles.weekLabel}>
                  {isWeekView
                    ? `Week of ${currentWeekDates[0]?.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
                    : `Day of ${selectedDay?.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' })}`}
                </Text>
              </View>

              {/* Bouton pour aller à la semaine suivante */}
              <TouchableOpacity onPress={() => handleWeekChange('next')} style={styles.navButton}>
                <MaterialIcons name="arrow-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>



            <View style={styles.counterContainer}>
              <Text style={styles.counterText}>
                {user.language === 'English' ? `Accepted: ${acceptedCount}` : `Accepté: ${acceptedCount}`}
              </Text>
              <Text style={styles.counterText}>
                {user.language === 'English' ? `Rejected: ${rejectedCount}` : `Rejeté: ${rejectedCount}`}
              </Text>
              <TouchableOpacity onPress={handlePublish} style={styles.publishButton}>
                <Text style={styles.publishButtonText}>
                  {user.language === 'English' ? 'Publish' : 'Publier'}
                </Text>
              </TouchableOpacity>

            </View>
          </View>

          <View style={styles.shiftColorsContainer}>
            <ScrollView horizontal
              showsHorizontalScrollIndicator={false} // Cache le scroll bar horizontal pour garder le design propre
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-around' }} // Centre le contenu si le scroll n'est pas nécessaire
            >
              {shifts.map((shift) => (
                <View key={shift._id} style={styles.shiftCircleContainer}>
                  <View style={[
                    styles.shiftCircle,
                    {
                      backgroundColor: shift.color,
                      width: Platform.OS === 'android' || Platform.OS === 'ios' ? 15 : 20,
                      height: Platform.OS === 'android' || Platform.OS === 'ios' ? 15 : 20
                    }]}
                  />
                  <Text style={[
                    styles.shiftName,
                    { fontSize: Platform.OS === 'android' || Platform.OS === 'ios' ? 10 : 14 }
                  ]}>{shift.name}</Text>
                </View>
              ))}
              <View style={styles.shiftCircleContainer}>
                <View style={[
                  styles.shiftCircle,
                  {
                    backgroundColor: '#ccc',
                    width: Platform.OS === 'android' || Platform.OS === 'ios' ? 15 : 20,
                    height: Platform.OS === 'android' || Platform.OS === 'ios' ? 15 : 20
                  }]}
                />
                <Text style={[
                  styles.shiftName,
                  { fontSize: Platform.OS === 'android' || Platform.OS === 'ios' ? 10 : 14 }
                ]}>No availability</Text>
              </View>
            </ScrollView>
          </View>

          <ScrollView style={styles.table}
          >
            {isWeekView ? (
              <>
                <View style={styles.headerRow}>
                  <Text style={[styles.headerCell, { flex: 2 }]}>Employee</Text>
                  {currentWeekDates.map((date, index) => (
                    <Text key={index} style={styles.headerCell}>
                      {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                    </Text>
                  ))}
                </View>

                {filteredEmployees.map((employee) => {
                  return (
                    <View key={employee._id} style={styles.row}>
                      {/* Affichage du nom de l'employé avec suspension */}
                      <Text style={[styles.employeeCell, { flex: 2 }]}>
                        {employee.name} {employee.familyName} ({employee.scoreCard})
                      </Text>

                      {/* Boucle sur les dates de la semaine */}
                      {currentWeekDates.map((date, index) => {
                        const shift = getEmployeeShiftForDay(employee._id, date);
                        const isSelected =
                          selectedCell?.employeeId === employee._id &&
                          selectedCell?.date.toDateString() === date.toDateString();

                        const dispo = disponibilities.find(
                          (d) =>
                            d.employeeId === employee._id &&
                            new Date(d.selectedDay).toDateString() === date.toDateString()
                        );

                        return (
                          <TouchableOpacity
                            key={`${employee._id}-${index}`} // Clé unique par employé et date
                            style={[styles.cell, { backgroundColor: shift ? shift.color : '#ccc' }]}
                            onPress={(event) => handleCellPress(employee._id, date, event)}
                          >
                            {/* Affichage du statut */}
                            {dispo?.decisions === 'accepted' && (
                              <Icon name="checkmark-circle" size={24} color="green" />
                            )}
                            {dispo?.decisions === 'rejected' && (
                              <Icon name="close-circle" size={24} color="red" />
                            )}
                            {dispo?.decisions === 'pending' && (
                              <Text style={styles.statusPending}>?</Text>
                            )}

                            {/* Icônes d'actions */}
                            {isSelected && (
                              <View style={styles.iconContainerWeek}>
                                <Icon
                                  name="checkmark-circle"
                                  size={24}
                                  color="green"
                                  onPress={() => handleAccept(employee._id, date)}
                                />
                                <Icon
                                  name="close-circle"
                                  size={24}
                                  color="red"
                                  onPress={() => handleReject(employee._id, date)}
                                />
                                <Icon
                                  name="trash"
                                  size={24}
                                  color="gray"
                                  onPress={() => handleDelete(dispo?._id || '')}
                                />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}

              </>
            ) : (
              <>
                <View style={styles.headerRow}>
                  <Text style={[styles.headerCell, { flex: 2 }]}>Employees</Text>
                  <Text style={[styles.headerCell, { flex: 3 }]}>
                    {selectedDay?.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' })}
                  </Text>
                </View>

                <View style={styles.dayView}>
                  {filteredEmployees.map((employee) => {
                    const shift = getEmployeeShiftForDay(employee._id, selectedDay || new Date());
                    const isSelected = selectedCell?.employeeId === employee._id && selectedCell?.date.toDateString() === (selectedDay || new Date()).toDateString();
                    const dispo = disponibilities.find(
                      (d) => d.employeeId === employee._id && new Date(d.selectedDay).toDateString() === (selectedDay || new Date()).toDateString()
                    );

                    return (
                      <View key={employee._id} style={styles.dayRow}>
                        <Text style={[styles.employeeCell, { flex: 2, marginLeft: 10 }]}>{employee.name} {employee.familyName} ({employee.scoreCard})</Text>
                        <TouchableOpacity
                          style={[styles.dayShiftCell, { backgroundColor: shift ? shift.color : '#ccc' }]}
                          onPress={(event) => handleCellPress(employee._id, selectedDay || new Date(), event)}
                        >
                          {dispo && dispo.decisions === 'accepted' && (
                            <Text style={styles.statusAccepted}>
                              {user.language === 'English' ? 'Accepted' : 'Accepté'}
                            </Text>
                          )}
                          {dispo && dispo.decisions === 'rejected' && (
                            <Text style={styles.statusRejected}>
                              {user.language === 'English' ? 'Rejected' : 'Rejeté'}
                            </Text>
                          )}
                          {dispo && dispo.decisions === 'pending' && <Text style={styles.statusPending}>?</Text>}



                          {isSelected && (
                            <View style={styles.iconContainer}>
                              <Icon name="checkmark-circle" size={24} color="green" onPress={() => handleAccept(employee._id, selectedDay || new Date())} />
                              <Icon name="close-circle" size={24} color="red" onPress={() => handleReject(employee._id, selectedDay || new Date())} />
                              <Icon name="trash" size={24} color="gray" onPress={() => handleDelete(dispo?._id || '')} />
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          {showShiftPicker && (
            <Modal
              visible={true}
              animationType="fade"
              transparent={true}
              onRequestClose={() => setShowShiftPicker(null)}
            >
              <View style={styles.modalShiftPickerOverlay}>
                <View style={styles.modalShiftPickerContainer}>
                  <Text style={styles.modalShiftPickerTitle}>
                    {user.language === 'English' ? 'Select a Shift' : 'Sélectionner un Quart'}
                  </Text>
                  <ScrollView
                    style={styles.modalShiftPickerScrollView}
                    contentContainerStyle={styles.modalShiftPickerScrollViewContent}
                  >
                    {shifts.length > 0 ? (
                      shifts.map((shift) => (
                        <TouchableOpacity
                          key={shift._id}
                          style={styles.modalShiftPickerItem}
                          onPress={() => handleShiftSelection(shift._id)}
                        >
                          <View
                            style={[styles.modalShiftPickerCircle, { backgroundColor: shift.color || '#000' }]}
                          />
                          <Text style={styles.modalShiftPickerText}>{shift.name}</Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={styles.modalShiftPickerNoShiftsText}>
                        {user.language === 'English' ? 'No shifts available' : 'Aucun quart disponible'}
                      </Text>
                    )}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.modalShiftPickerCloseButton}
                    onPress={() => setShowShiftPicker(null)}
                  >
                    <Text style={styles.modalShiftPickerCloseButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}



        </>
      )}

      <Modal
        visible={isSummaryModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={toggleSummaryModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {user.language === 'English' ? 'Weekly Dispos Summary' : 'Résumé des Dispos Hebdomadaires'}
            </Text>

            {/* ScrollView Vertical */}
            <ScrollView style={styles.modalVerticalScroll}>
              {/* ScrollView Horizontal */}
              <ScrollView horizontal style={styles.modalHorizontalScroll}>
                <View>
                  {/* Table Header */}
                  <View style={styles.modalTableRow}>
                    <Text style={[styles.modalTableCell, styles.modalHeaderCell]}>Shift Type</Text>
                    {currentWeekDates.map((date, index) => (
                      <Text key={index} style={[styles.modalTableCell, styles.modalHeaderCell]}>
                        {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                      </Text>
                    ))}
                  </View>

                  {/* Table Rows */}
                  {getWeeklyShiftSummary().map((summary, index) => (
                    <View key={index} style={styles.modalTableRow}>
                      <Text style={[styles.modalTableCell, { backgroundColor: summary.color, color: '#fff' }]}>
                        {summary.shiftName}
                      </Text>
                      {summary.daysSummary.map((daySummary, dayIndex) => (
                        <View key={dayIndex} style={styles.modalTableCell}>
                          <Text style={{ fontSize: 12 }}>
                            {user.language === 'English' ? `Pending: ${daySummary.pending}` : `En attente: ${daySummary.pending}`}
                          </Text>
                          <Text style={{ fontSize: 12 }}>
                            {user.language === 'English' ? `Accepted: ${daySummary.accepted}` : `Accepté: ${daySummary.accepted}`}
                          </Text>
                          <Text style={{ fontSize: 12 }}>
                            {user.language === 'English' ? `Rejected: ${daySummary.rejected}` : `Rejeté: ${daySummary.rejected}`}
                          </Text>
                        </View>

                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </ScrollView>

            <TouchableOpacity onPress={toggleSummaryModal} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonText}>
                {user.language === 'English' ? 'Close' : 'Fermer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default EmployeesAvaibilities;

const styles = StyleSheet.create({
  navButton: {
    backgroundColor: '#001933', // Bouton bleu foncé
    borderRadius: 50, // Arrondi complet pour un bouton circulaire
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekLabelContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#001933', // Texte bleu foncé
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalVerticalScroll: {
    maxHeight: '70%', // Limite la hauteur verticale pour permettre le défilement vertical
    marginBottom: 16,
  },
  modalHorizontalScroll: {
    maxWidth: '100%', // Limite la largeur pour éviter le dépassement horizontal
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Overlay sombre
  },
  modalContent: {
    width: '95%',
    maxHeight: '80%', // Hauteur limitée pour le défilement si nécessaire
    backgroundColor: 'white', // Fond blanc
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#001933', // Texte bleu foncé
    textAlign: 'center',
  },
  modalTableContainer: {
    flexDirection: 'column',
    marginBottom: 16,
  },
  modalTableRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 4,
  },
  modalTableCell: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 100,
    textAlign: 'center',
    backgroundColor: '#e6f7ff', // Fond bleu clair
    borderRadius: 6,
    marginHorizontal: 50,
  },
  modalHeaderCell: {
    backgroundColor: '#001933', // Fond bleu foncé
    color: '#fff', // Texte blanc
    fontWeight: 'bold',
    padding: 12,
    borderRadius: 6,
  },

  modalCloseButton: {
    marginTop: 20,
    backgroundColor: '#cccccc', // Fond gris clair
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalCloseButtonText: {
    color: '#000', // Texte noir
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  summaryButton: {
    flex: 1, // Prend une largeur égale aux autres boutons
    backgroundColor: '#ffa500', // Orange pour attirer l'attention
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryButtonText: {
    color: '#fff', // Texte blanc
    textAlign: 'center',
    fontWeight: 'bold',
  },
  shiftPickerContainer: {
    position: 'absolute',
    backgroundColor: 'white', // Fond blanc
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  shiftList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  shiftItem: {
    marginRight: 10,
    marginBottom: 10,
  },
  shiftCircleModel: {
    width: 20,
    height: 20,
    borderRadius: 20,
    backgroundColor: '#003366', // Bleu foncé pour le cercle
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white', // Fond blanc
  },
  header: {
    flexDirection: 'column',
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1, // Prend une largeur égale aux autres boutons
    backgroundColor: '#001933', // Bleu profond
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8, // Arrondi pour un style moderne
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3, // Ombre sur Android
  },
  resetButton: {
    flex: 1, // Prend une largeur égale aux autres boutons
    backgroundColor: '#001933', // Vert pour indiquer une action de réinitialisation
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButtonText: {
    color: '#fff', // Texte blanc
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  toggleButtonText: {
    color: '#fff', // Texte blanc
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchBar: {
    backgroundColor: '#f0f0f0', // Fond gris clair pour le champ de recherche
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    width: '100%',
  },
  weekControls: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Espacement uniforme entre les boutons
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12, // Ajoute de l'espace sur les côtés
    width: '100%', // Assure que la vue prend toute la largeur

  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  counterText: {
    color: '#001933', // Texte bleu foncé
    fontSize: 16,
    fontWeight: 'bold',
  },
  publishButton: {
    backgroundColor: 'red', // Bouton bleu foncé
    padding: 10,
    borderRadius: 8,
  },
  publishButtonText: {
    color: '#fff', // Texte blanc
    fontSize: 16,
    fontWeight: 'bold',
  },
  table: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white', // Fond blanc
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#001933', // Fond bleu foncé
    padding: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerCell: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff', // Texte blanc
    textAlign: 'left',
  },
  row: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  employeeCell: {
    flex: 2,
    fontWeight: 'bold',
    color: '#001933', // Texte bleu foncé
    textAlign: 'left',
    minWidth: 50,
  },
  cell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
    borderRadius: 4,
    height: 40,
  },
  dayView: {
    backgroundColor: 'white', // Fond blanc
    borderRadius: 8,
  },
  dayShiftCell: {
    flex: 3,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    height: 40,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
  },
  iconContainerWeek: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-around',
    width: '100%',
  },
  statusAccepted: {
    color: 'green',
    fontWeight: 'bold',
  },
  statusRejected: {
    color: 'red',
    fontWeight: 'bold',
  },
  statusPending: {
    color: '#ffa500', // Orange pour le statut en attente
    fontWeight: 'bold',
  },
  shiftColorsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginBottom: 16,
  },
  shiftCircleContainer: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  shiftCircle: {
    borderRadius: 10,
    marginBottom: 5,
    backgroundColor: '#001933', // Bleu foncé pour le cercle
  },
  shiftName: {
    color: '#001933', // Texte bleu foncé
  },
  modalShiftPickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Overlay sombre pour le modal
  },
  modalShiftPickerContainer: {
    width: '85%',
    backgroundColor: '#ffffff', // Fond blanc pour le contenu
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10, // Ombre pour les appareils Android
  },
  modalShiftPickerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#001933', // Bleu foncé pour le titre
    marginBottom: 20,
    textAlign: 'center',
  },
  modalShiftPickerScrollView: {
    width: '100%',
    maxHeight: 200, // Limite la hauteur du ScrollView
    marginBottom: 20,
  },
  modalShiftPickerScrollViewContent: {
    paddingHorizontal: 10,
  },
  modalShiftPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9', // Fond gris clair
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2, // Légère ombre
  },
  modalShiftPickerCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  modalShiftPickerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#001933', // Texte bleu foncé
  },
  modalShiftPickerNoShiftsText: {
    fontSize: 16,
    color: 'red', // Texte rouge pour indiquer l'absence de shifts
    textAlign: 'center',
    marginTop: 20,
  },
  modalShiftPickerCloseButton: {
    backgroundColor: '#001933', // Bleu foncé pour le bouton
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  modalShiftPickerCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff', // Texte blanc
    textAlign: 'center',
  },
});

