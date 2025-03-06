import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  FlatList
} from 'react-native';
import axios from 'axios';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { ResponsiveBar } from '@nivo/bar';
import AppURL from '@/components/src/URL';
import PickerModal from '@/components/src/PickerModal';
import { useUser } from '@/context/UserContext';
const URL_employee = `${AppURL}/api/employee`;
const URL_violation = `${AppURL}/api/dailyViolations`;

type Employee = {
  _id: string;
  name: string;
  familyName: string;
  expoPushToken: string;
};

type Violation = {
  violations: number;
  _id: string;
  employeeId: string;
  type: string;
  link: string;
  createdBy: string;
  description?: string;
  seen: string;
};

const violationTypes = [
  'High G',
  'Low Impact',
  'Driver Initiated',
  'Potential Collision',
  'Hard Braking',
  'Hard Turn',
  'Hard Acceleration',
  'Sign Violations',
  'Traffic Light Violations',
  'U Turn',
];

const DailyReport = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [newViolationLink, setNewViolationLink] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false); // Create modal
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null); // Edit/Delete modal
  const [isEditModalVisible, setIsEditModalVisible] = useState(false); // Edit/Delete modal visibility
  const [selectedViolationType, setSelectedViolationType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>(''); // État pour le champ de recherche
  const [isChartVisible, setIsChartVisible] = useState(false);





  const fetchViolations = async () => {
    try {
      // Assurez-vous que selectedDate est une instance de Date
      const localDate = new Date(selectedDate);

      // Convertir la date locale en début de journée UTC (00:00:00 UTC)
      const utcDate = new Date(
        Date.UTC(
          localDate.getFullYear(),
          localDate.getMonth(),
          localDate.getDate()
        )
      );
      const formattedDate = utcDate.toISOString().split('T')[0]; // Format 'YYYY-MM-DD'

      // Appel de l'API avec le paramètre `selectedDate`
      const response = await axios.get(`${URL_violation}/violations/by-day`, {
        params: { selectedDate: formattedDate, dsp_code: user?.dsp_code, },
      });

      // Vérification et mise à jour de l'état avec les données reçues
      const fetchedViolations = response.data.map((violation: any) => ({
        _id: violation._id,
        employeeId: violation.employeeId,
        type: violation.type,
        link: violation.link,
        description: violation.description || 'No description provided',
        createdBy: violation.createdBy,
        date: violation.date,
        seen: violation.seen
      }));

      setViolations(fetchedViolations); // Mise à jour de l'état
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Failed to load violations for the selected day.'
          : 'Échec du chargement des violations pour le jour sélectionné.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Failed to load violations for the selected day.'
          : 'Échec du chargement des violations pour le jour sélectionné.'
      );

    }
  };



  const fetchEmployees = async () => {
    try {
      const response = await axios.get(URL_employee, {
        params: {
          dsp_code: user?.dsp_code, // Ajout du dsp_code
        },
      });
      setEmployees(response.data);
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Failed to load employees.'
          : 'Échec du chargement des employés.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Failed to load employees.'
          : 'Échec du chargement des employés.'
      );

    }
  };


  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchEmployees(), fetchViolations()]);
    };

    fetchData();
  }, [selectedDate]);


  const changeDate = (days: number) => {
    setSelectedDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  };

  const handleAddDailyReport = async () => {
    if (!selectedEmployee || !selectedViolationType || !newViolationLink.trim()) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'All fields are required.'
          : 'Tous les champs sont obligatoires.'
      );

      window.alert(
        user?.language === 'English'
          ? 'All fields are requireddd.'
          : 'Tous les champs sont obligatoires.'
      );

      return;
    }

    // Utilisez `selectedDate` comme la date de la violation
    const localSelectedDate = new Date(selectedDate); // Utiliser la date sélectionnée par l'utilisateur
    const offset = localSelectedDate.getTimezoneOffset(); // Décalage de fuseau horaire
    const adjustedDate = new Date(localSelectedDate.getTime() - offset * 60 * 1000); // Ajuster pour UTC
    const reportDate = adjustedDate.toISOString().split('T')[0]; // Format 'YYYY-MM-DD'

    // Trouvez l'employé sélectionné
    const selectedEmployeeObj = employees.find(emp => emp._id === selectedEmployee);
    if (!selectedEmployeeObj) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Employee not found.'
          : 'Employé non trouvé.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Employee not found.'
          : 'Employé non trouvé.'
      );

      return;
    }

    const newViolation = {
      employeeId: selectedEmployee,
      type: selectedViolationType,
      link: newViolationLink.trim(),
      description: description.trim(),
      createdBy: `${user?.name} ${user?.familyName}`,
      date: reportDate, // Utilisez la date sélectionnée
      expoPushToken: selectedEmployeeObj.expoPushToken, // Ajout du token Expo
      seen: false,
      dsp_code: user?.dsp_code,


    };

    try {
      await axios.post(`${URL_violation}/create`, newViolation);
      Alert.alert(
        user?.language === 'English' ? 'Success' : 'Succès',
        user?.language === 'English'
          ? 'Violation added successfully!'
          : 'Violation ajoutée avec succès !'
      );

      window.alert(
        user?.language === 'English'
          ? 'Violation added successfully!'
          : 'Violation ajoutée avec succès !'
      );

      setIsModalVisible(false);
      resetForm();
      fetchViolations();
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Failed to create violation.'
          : 'Échec de la création de la violation.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Failed to create violation.'
          : 'Échec de la création de la violation.'
      );
    }
  };




  const handleUpdateViolation = async () => {
    if (!selectedViolation) return;

    const updatedViolation = {
      ...selectedViolation,
      type: selectedViolationType,
      link: newViolationLink.trim(),
      description: description.trim(),
      dsp_code: user?.dsp_code,
    };

    try {
      await axios.put(`${URL_violation}/${selectedViolation._id}`, updatedViolation);
      setIsEditModalVisible(false);
      resetForm();
      fetchViolations();
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Failed to update violation.'
          : 'Échec de la mise à jour de la violation.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Failed to update violation.'
          : 'Échec de la mise à jour de la violation.'
      );
    }
  };

  const handleDeleteViolation = async () => {
    if (!selectedViolation) return;

    const confirmationMessage = user?.language === 'English'
      ? 'Are you sure you want to delete this violation?'
      : 'Êtes-vous sûr de vouloir supprimer cette violation ?';

    const successMessage = user?.language === 'English'
      ? 'Violation deleted successfully!'
      : 'Violation supprimée avec succès!';

    const errorMessage = user?.language === 'English'
      ? 'Failed to delete violation.'
      : "Échec de la suppression de la violation.";

    // Confirmation pour mobile (React Native)
    if (Platform.OS !== 'web') {
      return Alert.alert(
        user?.language === 'English' ? 'Confirmation' : 'Confirmation',
        confirmationMessage,
        [
          {
            text: user?.language === 'English' ? 'Cancel' : 'Annuler',
            style: 'cancel',
          },
          {
            text: user?.language === 'English' ? 'Delete' : 'Supprimer',
            onPress: async () => {
              await confirmDeleteViolation(successMessage, errorMessage);
            },
            style: 'destructive',
          },
        ]
      );
    }

    // Confirmation pour le Web
    if (window.confirm(confirmationMessage)) {
      await confirmDeleteViolation(successMessage, errorMessage);
    }
  };

  // Fonction séparée pour exécuter la suppression après confirmation
  const confirmDeleteViolation = async (successMessage: string, errorMessage: string) => {
    try {
      await axios.delete(`${URL_violation}/${selectedViolation?._id}`, {
        params: { dsp_code: user?.dsp_code },
      });

      Alert.alert('Success', successMessage);
      window.alert(successMessage);

      setIsEditModalVisible(false);
      fetchViolations();
    } catch (error) {
      Alert.alert('Error', errorMessage);
      window.alert(errorMessage);
    }
  };


  const resetForm = () => {
    setSelectedEmployee('');
    setSelectedViolation(null);
    setNewViolationLink('');
    setDescription('');
    setSelectedViolationType('');
  };

  const handleViolationPress = (violation: Violation) => {
    setSelectedViolation(violation);
    setSelectedViolationType(violation.type); // Pre-fill the type
    setNewViolationLink(violation.link); // Pre-fill the link
    setDescription(violation.description || ''); // Pre-fill the description
    setIsEditModalVisible(true);
  };

  const getPieChartDataByViolationType = () => {
    const groupedData = violations.reduce<Record<string, number>>((acc, violation) => {
      acc[violation.type] = (acc[violation.type] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(groupedData).map((type) => ({
      name: type,
      population: groupedData[type],
      color: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 1)`,
      legendFontColor: "#7F7F7F",
      legendFontSize: 12,
    }));
  };
  // Calcul dynamique de la liste des employés filtrés
  const filteredEmployees = employees.filter((employee) =>
    `${employee.name} ${employee.familyName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const getBarChartDataByEmployee = () => {
    const groupedData = violations.reduce<Record<string, number>>((acc, violation) => {
      acc[violation.employeeId] = (acc[violation.employeeId] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(groupedData).map((employeeId) => {
      const employee = employees.find((e) => e._id === employeeId);
      return employee ? `${employee.familyName}` : "Unknown";
    });

    const data = Object.values(groupedData);

    return {
      labels,
      datasets: [
        {
          data,
        },
      ],
    };
  };


  const getBarChartDataForWeb = () => {
    const groupedData = violations.reduce<Record<string, number>>((acc, violation) => {
      acc[violation.employeeId] = (acc[violation.employeeId] || 0) + 1;
      return acc;
    }, {});

    // Map employees with violations only
    const chartData = Object.keys(groupedData)
      .map((employeeId) => {
        const employee = employees.find((e) => e._id === employeeId);
        return employee
          ? {
            employee: `${employee.familyName} ${employee.name} (${employeeId.slice(-4)})`, // Unique name to handle duplicates
            violations: groupedData[employeeId],
          }
          : { employee: "Unknown", violations: groupedData[employeeId] };
      })
      .filter((data) => data.violations > 0); // Filter out entries with no violations

    return chartData;
  };










  return (
    <View style={styles.container}>
      {/* Date Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.dateText}>{selectedDate.toDateString()}</Text>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.navButton}>
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={violations}
        keyExtractor={(item) => item._id} // Use the unique _id as the key
        numColumns={3} // Display 3 violations per row
        renderItem={({ item }) => {
          // Find the corresponding employee
          const employee = employees.find((e) => e._id === item.employeeId);

          return (
            <TouchableOpacity onPress={() => handleViolationPress(item)} style={{ flex: 1, margin: 5 }}>
              <View style={styles.violationCard}>
                <Text style={styles.violationTitle}>{item.type}</Text>
                <Text style={styles.violationText}>
                  {user?.language === 'English'
                    ? `Employee: ${employee ? `${employee.name} ${employee.familyName}` : 'Unknown'}`
                    : `Employé : ${employee ? `${employee.name} ${employee.familyName}` : 'Inconnu'}`}
                </Text>

                <FontAwesome
                  name={item.seen ? 'eye' : 'eye-slash'}
                  size={18}
                  color={item.seen ? '#2ecc71' : '#e74c3c'}
                />
              </View>
            </TouchableOpacity>
          );
        }}
      />



      <TouchableOpacity
        style={[styles.addButton, { bottom: 90 }]} // Positionné au-dessus du bouton "+"
        onPress={() => setIsChartVisible(true)}
      >
        <MaterialIcons name="bar-chart" size={24} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>



      {/* Create Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {user?.language === 'English' ? 'Add Violation' : 'Ajouter une violation'}
            </Text>
            {/* Champ de recherche */}
            <TextInput
              style={styles.input}
              placeholder={user?.language === 'English' ? 'Search employee' : 'Rechercher un employé'}
              value={searchTerm}
              onChangeText={(text) => setSearchTerm(text)}
            />

            {/* Liste filtrée des employés */}
            <PickerModal
              title={user?.language === 'English' ? 'Select an employee' : 'Sélectionner un employé'}
              selectedValue={selectedEmployee}
              options={filteredEmployees.map((employee) => ({
                label: `${employee.name} ${employee.familyName}`,
                value: employee._id,
              }))}
              onValueChange={(itemValue) => setSelectedEmployee(itemValue)}
              style={{
                container: {
                  height: 50,
                  borderColor: '#001933',
                  borderRadius: 8,
                  backgroundColor: '#f9f9f9',
                  justifyContent: 'center',
                  marginBottom: 16,
                },
                input: {
                  fontSize: 16,
                  color: '#001933',
                },
                picker: {
                  backgroundColor: '#ffffff',
                },
              }}
            />


            <PickerModal
              title={user?.language === 'English' ? 'Select a violation type' : 'Sélectionner un type de violation'}
              selectedValue={selectedViolationType}
              options={violationTypes.map((type) => ({
                label: type,
                value: type,
              }))}
              onValueChange={(itemValue) => setSelectedViolationType(itemValue)}
              style={{
                container: {
                  height: 50,
                  borderColor: '#001933',
                  borderRadius: 8,
                  backgroundColor: '#f9f9f9',
                  justifyContent: 'center',
                  marginBottom: 16,
                },
                input: {
                  fontSize: 16,
                  color: '#001933',
                },
                picker: {
                  backgroundColor: '#ffffff',
                },
              }}
            />


            <TextInput
              style={styles.input}
              placeholder={user?.language === 'English' ? 'Violation Link' : 'Lien de la violation'}
              value={newViolationLink}
              onChangeText={setNewViolationLink}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={user?.language === 'English' ? 'Description (optional)' : 'Description (facultatif)'}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
              <TouchableOpacity style={styles.submitButton} onPress={handleAddDailyReport}>
                <Text style={styles.submitButtonText}>
                  {user?.language === 'English' ? 'Submit' : 'Soumettre'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cancelButtonText}>
                  {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Edit/Delete Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {user?.language === 'English' ? 'Edit Violation' : 'Modifier une violation'}
            </Text>
            <PickerModal
              title={user?.language === 'English' ? 'Select a violation type' : 'Sélectionner un type de violation'}
              selectedValue={selectedViolationType}
              options={[
                { label: user?.language === 'English' ? 'Select a violation type' : 'Sélectionner un type de violation', value: '' },
                ...violationTypes.map((type) => ({
                  label: type,
                  value: type,
                })),
              ]}
              onValueChange={(itemValue) => setSelectedViolationType(itemValue)}
              style={{
                container: {
                  height: 50,
                  borderColor: '#001933',
                  borderRadius: 8,
                  backgroundColor: '#f9f9f9',
                  justifyContent: 'center',
                  marginBottom: 16,
                },
                input: {
                  fontSize: 16,
                  color: '#001933',
                },
                picker: {
                  backgroundColor: '#ffffff',
                },
              }}
            />
            <TextInput
              style={styles.input}
              placeholder={user?.language === 'English' ? 'Violation Link' : 'Lien de la violation'}
              value={newViolationLink}
              onChangeText={setNewViolationLink}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={user?.language === 'English' ? 'Description (optional)' : 'Description (facultatif)'}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.submitButton} onPress={handleUpdateViolation}>
                <Text style={styles.submitButtonText}>
                  {user?.language === 'English' ? 'Update' : 'Mettre à jour'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteViolation}>
                <Text style={styles.deleteButtonText}>
                  {user?.language === 'English' ? 'Delete' : 'Supprimer'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>
                  {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* // Inside your `Modal` for rendering the chart */}
      <Modal visible={isChartVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {user?.language === 'English' ? 'Violations Overview' : 'Aperçu des violations'}
            </Text>
            {Platform.OS !== "web" && (
              <ScrollView horizontal>
                <BarChart
                  data={getBarChartDataByEmployee()}
                  width={Math.max(400, getBarChartDataByEmployee().labels.length * 100)}
                  height={220}
                  yAxisLabel="" // No prefix
                  yAxisSuffix="" // No suffix, just numbers
                  chartConfig={{
                    backgroundColor: '#001933',
                    backgroundGradientFrom: '#001933',
                    backgroundGradientTo: '#005f73',
                    decimalPlaces: 0, // Integers only
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    style: { borderRadius: 16 },
                    barPercentage: 0.8, // Reduces bar width for better spacing
                  }}
                  style={{ marginVertical: 8, borderRadius: 16 }}
                />
              </ScrollView>
            )}

            {Platform.OS === "web" && (
              <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ paddingBottom: 16 }}>
                <View style={{ height: 500, backgroundColor: "#f8f9fa", borderRadius: 8, padding: 16 }}>
                  <ResponsiveBar
                    data={getBarChartDataForWeb()} // Only employees with violations
                    keys={['violations']}
                    indexBy="employee"
                    margin={{ top: 20, right: 20, bottom: 100, left: 150 }} // Fixed margins
                    padding={0.25} // Compact spacing
                    layout="horizontal" // Horizontal layout for readability
                    colors={() => "#001933"} // Set the bar color to #001933                    borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: 'Violations',
                      legendPosition: 'middle',
                      legendOffset: 50,
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: 'Employee',
                      legendPosition: 'middle',
                      legendOffset: -100,
                    }}
                    labelSkipWidth={16} // Avoid label overlap
                    labelSkipHeight={16}
                    labelTextColor="white"
                    enableGridX
                    enableGridY
                    animate // Smooth animations
                    motionConfig="gentle" // Stable animations
                  />
                </View>
              </ScrollView>
            )}



            <Text style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginVertical: 10 }}>
              {user?.language === 'English' ? 'Violation Types Distribution' : 'Répartition des types de violations'}
            </Text>
            <ScrollView horizontal>
              <PieChart
                data={getPieChartDataByViolationType()}
                width={400}
                height={220}
                chartConfig={{
                  backgroundColor: '#001933',
                  backgroundGradientFrom: '#001933',
                  backgroundGradientTo: '#005f73',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelButtonGraphe}
              onPress={() => setIsChartVisible(false)}
            >
              <Text style={styles.cancelButtonTextGraphe}>
                {user?.language === 'English' ? 'Close' : 'Fermer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  gridItem: {
    flex: 1,
    margin: 5, // Space between items
  },
  row: {
    justifyContent: 'space-between', // Space out the columns in each row
    marginBottom: 10, // Space between rows
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001933',
  },
  navButton: {
    backgroundColor: '#001933',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  violationCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flex: 1, // Ensures all items in a row have the same width
  },
  violationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001933',
    marginBottom: 4,
  },
  violationText: {
    fontSize: 14,
    color: '#001933',
  },
  addButton: {
    backgroundColor: '#001933',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    right: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 32,
    color: '#fff',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#001933',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#001933',
  },
  picker: {
    height: 50,
    borderWidth: 1,
    borderColor: '#001933',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
  },
  input: {
    borderWidth: 1,
    borderColor: '#001933',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  submitButton: {
    backgroundColor: '#001933',
    padding: 10,
    borderRadius: 10,
    flex: 1,
  },
  submitButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 10,
    flex: 1,
  },
  cancelButtonText: {
    color: '#001933',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ff4d4d',
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginLeft: 5,
  },
  deleteButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  cancelButtonGraphe: {
    backgroundColor: '#001933', // Couleur de fond
    padding: 15, // Espacement interne
    borderRadius: 10, // Coins arrondis
    marginBottom: 10, // Espacement en bas
    alignItems: 'center', // Centre horizontalement
    justifyContent: 'center', // Centre verticalement
    minWidth: 100, // Largeur minimale (optionnel)
  },
  cancelButtonTextGraphe: {
    color: '#ffffff', // Couleur du texte
    textAlign: 'center', // Centre horizontalement
    fontWeight: 'bold', // Texte en gras
    fontSize: 16, // Taille de police
  },
});

export default DailyReport;
