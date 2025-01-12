import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import axios from 'axios';
import { ResponsivePie } from '@nivo/pie';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';

// Types
type Employee = {
  totalViolations: number;
  _id: string;
  name: string;
  familyName: string;
};

type WeeklyViolation = {
  date: string;
  type: string;
  employeeId: string;
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
const WeeklyStatistics = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };
  const [weeklyStats, setWeeklyStats] = useState<Record<string, WeeklyViolation[]>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [currentWeekDates, setCurrentWeekDates] = useState<Date[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);


  const URL_violation = 'https://coral-app-wqv9l.ondigitalocean.app/api/dailyViolations';
  const URL_employee = 'https://coral-app-wqv9l.ondigitalocean.app/api/employee';

  const isValidDate = (date: any) => {
    return !isNaN(new Date(date).getTime());
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




  // Fetch employees
  const fetchEmployees = async (): Promise<Employee[]> => {
    try {
      const response = await axios.get<Employee[]>(`${URL_employee}?dsp_code=${user.dsp_code}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  };

  const fetchWeeklyViolations = async (startDate: string): Promise<Record<string, Record<string, number>>> => {
    try {
      const response = await axios.get<Record<string, Record<string, number>>>(`${URL_violation}/violations/weekly?dsp_code=${user.dsp_code}`, {
        params: { startDate },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching weekly violations:', error);
      return {};
    }
  };

  const fetchEmployeeWeeklyViolations = async (startDate: string, employeeId: string): Promise<Record<string, Record<string, number>>> => {
    try {
      const response = await axios.get<Record<string, Record<string, number>>>(`${URL_violation}/violations/employee-weekly?dsp_code=${user.dsp_code}`, {
        params: { startDay: startDate, idEmployee: employeeId },
      });
      if (!response.data) {
        throw new Error('No data returned for employee weekly violations.');
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching weekly violations for employee:', error);
      return {};
    }
  };

  // Calculate total violations for each employee
  useEffect(() => {
    const loadWeeklyData = async () => {
      setIsLoading(true);

      const weekDates = getWeekDates(weekOffset);
      setCurrentWeekDates(weekDates);

      const startDate = weekDates[0]?.toISOString().split("T")[0];
      // console.log("Calculated Week Dates:", weekDates);

      if (!isValidDate(startDate)) {
        console.error("Invalid start date for the week:", startDate);
        setIsLoading(false);
        return;
      }

      try {
        // Fetch employees first
        const employeeData = await fetchEmployees();
        setEmployees(employeeData); // Set employees state

        // Fetch violations for each employee in parallel
        const violationsPromises = employeeData.map(async (employee) => {
          const violationsData = await fetchEmployeeWeeklyViolations(startDate, employee._id);
          return { employeeId: employee._id, violations: violationsData };
        });

        const violationsResults = await Promise.all(violationsPromises);

        // console.log("Fetched Violations Data:", violationsResults);

        // Calculate total violations for each employee
        const employeeViolationCounts = employeeData.map((employee) => {
          const employeeViolations = violationsResults.find(
            (result) => result.employeeId === employee._id
          )?.violations;

          // Calculate total violations
          const totalViolations = employeeViolations
            ? Object.values(employeeViolations).reduce((sum, dayViolations) =>
              sum + Object.values(dayViolations).reduce((daySum, count) => daySum + count, 0), 0)
            : 0;

          return { ...employee, totalViolations }; // Add totalViolations to each employee
        });

        setFilteredEmployees(employeeViolationCounts); // Update the list of employees with violations
      } catch (error) {
        console.error("Error loading weekly data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWeeklyData();
  }, [weekOffset]);



  // Load weekly data
  useEffect(() => {
    const loadWeeklyData = async () => {
      setIsLoading(true);
      const weekDates = getWeekDates(weekOffset);
      setCurrentWeekDates(weekDates);

      const startDate = weekDates[0]?.toISOString().split("T")[0];
      // console.log("Calculated Week Dates:", weekDates);

      if (!isValidDate(startDate)) {
        console.error("Invalid start date for the week:", startDate);
        setIsLoading(false);
        return;
      }

      try {
        const [employeeData, weeklyData] = await Promise.all([
          fetchEmployees(),
          fetchWeeklyViolations(startDate),
        ]);

        // console.log("Fetched Weekly Data:", weeklyData);

        setEmployees(employeeData);
        setFilteredEmployees(employeeData);

        const transformedData: Record<string, WeeklyViolation[]> = Object.entries(weeklyData).reduce(
          (acc, [date, violationsByType]) => {
            acc[date] = Object.entries(violationsByType).flatMap(([type, count]) =>
              Array(count).fill({ type, date, employeeId: "" })
            );
            return acc;
          },
          {} as Record<string, WeeklyViolation[]> // Explicitly cast the type here
        );

        setWeeklyStats(transformedData);

      } catch (error) {
        console.error("Error loading weekly data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWeeklyData();
  }, [weekOffset]);

  const normalizeDate = (date: Date): string => {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      .toISOString()
      .split("T")[0];
  };



  const handleWeekChange = (direction: 'prev' | 'next') => {
    setWeekOffset((prev) => (direction === 'next' ? prev + 1 : prev - 1));
  };

  // Inside the `handleSearch` function, after filtering the employees:
  const handleSearch = (text: string) => {
    setSearchTerm(text);
    const filtered = employees
      .filter((employee) =>
        `${employee.name} ${employee.familyName}`
          .toLowerCase()
          .includes(text.toLowerCase())
      )
      .map((employee) => ({
        ...employee,
        totalViolations: filteredEmployees.find(
          (e) => e._id === employee._id
        )?.totalViolations || 0, // Preserve totalViolations
      }))
      .sort((a, b) => b.totalViolations - a.totalViolations); // Sort by violations, descending

    setFilteredEmployees(filtered);
  };



  // Handle employee selection and fetch their weekly data
  const handleEmployeeSelect = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsModalVisible(true);

    if (employee) {
      const weekDates = getWeekDates(weekOffset);
      const startDate = weekDates[0].toLocaleDateString("en-CA"); // Format: YYYY-MM-DD

      setIsLoading(true);

      try {
        // Fetch weekly violations for the employee
        const employeeWeeklyData = await fetchEmployeeWeeklyViolations(
          startDate,
          employee._id
        );
        // Transform the data for charts
        const transformedData: Record<string, WeeklyViolation[]> =
          Object.entries(employeeWeeklyData).reduce(
            (acc: Record<string, WeeklyViolation[]>, [date, violationsByType]) => {
              acc[date] = Object.entries(violationsByType).flatMap(([type, count]) =>
                Array(count).fill({ type, date, employeeId: employee._id })
              );
              return acc;
            },
            {}
          );

        // console.log("Transformed employee weekly data:", transformedData);

        setWeeklyStats(transformedData);
      } catch (error) {
        console.error(
          "Error while fetching or transforming employee weekly data:",
          error
        );
      } finally {
        setIsLoading(false);
      }
    }
  };





  const handleCloseModal = () => {
    setSelectedEmployee(null);
    setIsModalVisible(false);
  };

  // Préparer les données pour le LineChart
  const lineChartData = {
    labels: currentWeekDates.map((date) =>
      new Date(date).toLocaleDateString("en-US", { weekday: "short" })
    ),
    datasets: [
      {
        data: currentWeekDates.map((date) => {
          const normalizedDate = normalizeDate(date);
          const dailyStats = weeklyStats[normalizedDate];
          return dailyStats ? dailyStats.length : 0;
        }),
      },
    ],
  };

  // Data for the employee-specific line chart
  const employeeLineChartData = selectedEmployee
    ? {
      labels: currentWeekDates.map((date) =>
        date.toLocaleDateString("en-US", { weekday: "short" })
      ),
      datasets: [
        {
          data: currentWeekDates.map((date) => {
            // Normalize the date to ensure consistency
            const utcDateString = new Date(
              Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
            )
              .toISOString()
              .split("T")[0]; // Format: YYYY-MM-DD

            // Match normalized date with backend data
            const dailyStats = weeklyStats[utcDateString];
            return dailyStats
              ? dailyStats.filter(
                (violation) => violation.employeeId === selectedEmployee._id
              ).length
              : 0; // Total violations for the selected employee on this date
          }),
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`, // Line color
          strokeWidth: 2, // Line thickness
        },
      ],
    }
    : {
      labels: [],
      datasets: [],
    };

  const employeeBarChartData = selectedEmployee
    ? {
      labels: Object.entries(
        Object.values(weeklyStats || {})
          .flat()
          .reduce<Record<string, number>>((acc, violation) => {
            if (violation.employeeId === selectedEmployee._id) {
              acc[violation.type] = (acc[violation.type] || 0) + 1;
            }
            return acc;
          }, {})
      ).map(([type]) => type), // Extract violation types as labels
      datasets: [
        {
          data: Object.entries(
            Object.values(weeklyStats || {})
              .flat()
              .reduce<Record<string, number>>((acc, violation) => {
                if (violation.employeeId === selectedEmployee._id) {
                  acc[violation.type] = (acc[violation.type] || 0) + 1;
                }
                return acc;
              }, {})
          ).map(([_, count]) => count), // Extract counts for each violation type
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`, // Line color
          strokeWidth: 2, // Line thickness
        },
      ],
    }
    : { labels: [], datasets: [] };




  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {user.language === 'English' ? 'Weekly Violation Statistics' : 'Statistiques des Violations Hebdomadaires'}
      </Text>

      <View style={styles.weekNavigation}>
        <TouchableOpacity onPress={() => handleWeekChange('prev')} style={styles.navButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {user.language === 'English' ? `Starting from: ${currentWeekDates[0]?.toDateString()}` : `Commence le: ${currentWeekDates[0]?.toDateString()}`}
        </Text>

        <TouchableOpacity onPress={() => handleWeekChange('next')} style={styles.navButton}>
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>


      {isLoading ? (
        <ActivityIndicator size="large" color="#001933" />
      ) : (
        <>
          <View style={styles.chartContainer}>
            <LineChart
              data={lineChartData}
              width={Dimensions.get('window').width - 32}
              height={170}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: "#003366",
                backgroundGradientFrom: "#004080",
                backgroundGradientTo: "#ffa726",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              }}
              bezier
              style={{
                borderRadius: 16,
                marginVertical: 8,
                alignSelf: 'center',
              }}
            />
          </View>


          <TextInput
            style={styles.searchBar}
            placeholder={user.language === 'English' ? 'Search employees...' : 'Rechercher des employés...'}
            placeholderTextColor="#aaa"
            value={searchTerm}
            onChangeText={handleSearch}
          />

          <FlatList
            data={[...filteredEmployees].sort((a, b) => b.totalViolations - a.totalViolations)} // Sort here
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.flatListContainer}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleEmployeeSelect(item)} // Handle employee selection
                style={styles.card}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>
                    {`${item.name} ${item.familyName}`}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {`Violations: `}
                    <Text
                      style={{
                        color: item.totalViolations > 3 ? "red" : "#333",
                        fontWeight: "bold",
                      }}
                    >
                      {item.totalViolations}
                    </Text>
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
          <Modal
            visible={isModalVisible}
            transparent
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {selectedEmployee
                      ? `${selectedEmployee.name} ${selectedEmployee.familyName}`
                      : "Employee Statistics"}
                  </Text>
                  <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                    <MaterialIcons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Body Content */}
                <ScrollView contentContainerStyle={styles.modalBody}>
                  <ScrollView horizontal>
                    {/* Line Chart */}
                    {selectedEmployee && employeeLineChartData.labels.length > 0 ? (
                      <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>
                          {user.language === 'English' ? 'Weekly Trend' : 'Tendance Hebdomadaire'}
                        </Text>
                        <LineChart
                          data={employeeLineChartData}
                          width={Dimensions.get("window").width - 40}
                          height={220}
                          chartConfig={{
                            backgroundColor: "#003366",
                            backgroundGradientFrom: "#004080",
                            backgroundGradientTo: "#ffa726",
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                            style: {
                              borderRadius: 16,
                            },
                          }}
                          bezier
                          style={styles.chartStyle}
                        />
                      </View>
                    ) : (
                      <Text style={styles.noDataText}>
                        {user.language === 'English' ? 'No weekly data available.' : 'Aucune donnée hebdomadaire disponible.'}
                      </Text>
                    )}
                  </ScrollView>


                  {/* Bar Chart */}
                  {selectedEmployee && employeeBarChartData.labels.length > 0 ? (

                    <View style={styles.chartContainer}>
                      <Text style={styles.chartTitle}>
                        {user.language === 'English' ? 'Violation Distribution' : 'Répartition des Violations'}
                      </Text>
                      <ScrollView
                        horizontal
                        contentContainerStyle={{ flexGrow: 1 }}
                        scrollEnabled={true}
                      >
                        <ScrollView
                          contentContainerStyle={{
                            flexGrow: 1,
                            height: 220, // Set height explicitly to allow vertical scrolling
                          }}
                          nestedScrollEnabled={true} // Important for allowing nested scrolling
                        >
                          <BarChart
                            data={employeeBarChartData}
                            width={Dimensions.get("window").width + 200} // Adjust for horizontal scrolling
                            height={220} // Increase height for vertical scrolling
                            fromZero
                            yAxisLabel=""
                            yAxisSuffix=""
                            chartConfig={{
                              backgroundColor: "#003366",
                              backgroundGradientFrom: "#004080",
                              backgroundGradientTo: "#ffa726",
                              decimalPlaces: 0,
                              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                              style: {
                                borderRadius: 16,
                              },
                            }}
                            verticalLabelRotation={5}
                            style={{
                              marginVertical: 8,
                              borderRadius: 16,

                            }}
                          />
                        </ScrollView>
                      </ScrollView>


                    </View>
                  ) : (
                    <Text style={styles.noDataText}>
                      {user.language === 'English' ? 'No violation distribution data.' : 'Aucune donnée de répartition des violations.'}
                    </Text>
                  )}

                </ScrollView>
              </View>
            </View>
          </Modal>




        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  navigation: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  navButton: { backgroundColor: '#001933', borderRadius: 20, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, },
  navButtonText: { color: 'white', fontWeight: 'bold' },
  weekLabel: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  listItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  closeModalButton: { padding: 10, backgroundColor: '#ff0000', marginTop: 16, alignSelf: 'center' },
  closeModalText: { color: 'white', fontWeight: 'bold' },
  weekNavigation: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },

  modalContainer: {
    backgroundColor: "#ffffff", // Fond blanc moderne
    borderRadius: 16,
    width: "90%",
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10, // Ombre pour Android
  },
  modalHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },

  closeIcon: {
    position: "absolute",
    right: 0,
    backgroundColor: "#ff4d4d",
    padding: 5,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Transparent dark overlay
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#001933",
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 5,
    borderRadius: 16,
  },
  modalBody: {
    padding: 16,
  },
  chartContainer: {
    marginVertical: 5,
    paddingHorizontal: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  chartStyle: {
    borderRadius: 16,
  },
  noDataText: {
    textAlign: "center",
    marginVertical: 20,
    fontSize: 14,
    color: "#001933",
  },

  // Search Bar
  searchBar: {
    padding: 9,
    marginVertical: 7,
    marginHorizontal: 16,
    borderRadius: 25,
    backgroundColor: "#f2f2f2",
    borderColor: "#001933",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    color: "#333",
    fontSize: 16,
    paddingLeft: 40, // Padding for the search icon
  },

  // FlatList Container
  flatListContainer: {
    paddingHorizontal: 16,
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },

  // Card Content
  cardContent: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#001933",
  },

  cardSubtitle: {
    fontSize: 14,
    color: "#001933",
    marginTop: 4,
  },

  // Icon
  searchIcon: {
    position: "absolute",
    left: 25,
    top: 20,
    zIndex: 1,
    fontSize: 20,
    color: "#aaa",
  },
});

export default WeeklyStatistics;
