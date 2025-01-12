import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Alert,
    Platform,
    RefreshControl,
} from "react-native";
import axios from "axios";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoute } from '@react-navigation/native';
import AppURL from "@/components/src/URL";

// Define the type User
type User = {
    _id: string; // Ensure this field is always available
    name: string;
    familyName: string;
    tel: string;
    email: string;
    password: string;
    role: string;
    scoreCard: string;
    focusArea: string;
    language: string,
    dsp_code: string,
};

type TimeCard = {
    _id: string;
    employeeId: string;
    day: string;
    CortexDuree?: string;
    CortexEndTime?: string;
};

type Employee = {
    _id: string;
    name: string;
    familyName: string;
    expoPushToken?: string; // Add the Expo Push Token field
};

type CortexInputs = Record<
    string,
    {
        CortexDuree: string;
        CortexEndTime: string;
    }
>;

const CortexPrediction: React.FC = () => {
    const route = useRoute();
    const { user } = route.params as { user: User };
    const [date, setDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState<boolean>(true);
    const [timeCards, setTimeCards] = useState<TimeCard[]>([]);
    const [employees, setEmployees] = useState<Record<string, Employee>>({});
    const [cortexInputs, setCortexInputs] = useState<CortexInputs>({});
    const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
    const [savingEmployee, setSavingEmployee] = useState<Record<string, boolean>>({}); // Add this state
    const [refreshing, setRefreshing] = useState<boolean>(false); // State for mobile pull-to-refresh



    const formatDate = (date: Date): string => {
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const monthsOfYear = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${daysOfWeek[date.getDay()]} ${monthsOfYear[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")} ${date.getFullYear()}`;
    };

    const fetchTimeCardsAndEmployees = async (): Promise<void> => {
        if (Platform.OS !== 'web') setRefreshing(true); // Set refreshing for mobile

        setLoading(true);
        setTimeCards([]); // Clear existing data
        setEmployees({});
        setCortexInputs({});

        const formattedDate = formatDate(date);
        try {
            const timeCardsRes = await axios.get<TimeCard[]>(
                `${AppURL}/api/timecards/timecardsss/dday/${formattedDate}?dsp_code=${user.dsp_code}`
            );
            const timeCards = timeCardsRes.data;

            if (timeCards.length === 0) {
                Alert.alert("No data", "No time cards found for the selected day.");
                return;
            }

            const employeeIds = [...new Set(timeCards.map((tc) => tc.employeeId))];

            const employeeRes = await axios.post<Employee[]>(
                `${AppURL}/api/employee/by-ids?dsp_code=${user.dsp_code}`,
                { ids: employeeIds }
            );

            const employeesMap = employeeRes.data.reduce((acc, employee) => {
                acc[employee._id] = employee;
                return acc;
            }, {} as Record<string, Employee>);

            setTimeCards(timeCards);
            setEmployees(employeesMap);

            const initialCortexInputs: CortexInputs = {};
            timeCards.forEach((tc) => {
                initialCortexInputs[tc.employeeId] = {
                    CortexDuree: tc.CortexDuree || "",
                    CortexEndTime: tc.CortexEndTime || "",
                };
            });
            setCortexInputs(initialCortexInputs);
        } catch (error) {
        } finally {
            setLoading(false);
            setRefreshing(false); // Reset refreshing state for mobile
        }
    };




    useEffect(() => {
        fetchTimeCardsAndEmployees();
    }, [date]);

    const handleDayChange = (direction: number): void => {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + direction);
        setDate(newDate);
    };

    const handleInputChange = (employeeId: string, field: "CortexDuree" | "CortexEndTime", value: string): void => {
        setCortexInputs((prev) => ({
            ...prev,
            [employeeId]: {
                ...prev[employeeId],
                [field]: value,
            },
        }));
    };

    const saveIndividual = async (employeeId: string): Promise<void> => {
        const timeCard = timeCards.find((tc) => tc.employeeId === employeeId);
        if (!timeCard) {
            Alert.alert(
                user.language === 'English' ? "Error" : "Erreur",
                user.language === 'English'
                    ? "No time card found for this employee."
                    : "Aucune fiche de temps trouvée pour cet employé."
            );
            return;
        }

        // Set loading state for this employee
        setSavingEmployee((prev) => ({ ...prev, [employeeId]: true }));

        try {
            await axios.post(
                `${AppURL}/api/timecards/timecards/bulk-update-cortex?dsp_code=${user.dsp_code}`,
                {
                    updates: [
                        {
                            id: timeCard._id, // Time card ID
                            CortexDuree: cortexInputs[employeeId]?.CortexDuree || undefined,
                            CortexEndTime: cortexInputs[employeeId]?.CortexEndTime || undefined,
                            expoPushToken: employees[employeeId]?.expoPushToken || undefined, // Include the push token

                        },
                    ],
                }
            );
            Alert.alert("Success", "Saved successfully!");
        } catch (error) {
            console.error("Error saving data:", error);
            Alert.alert("Error", "Failed to save data.");
        } finally {
            // Reset loading state for this employee
            setSavingEmployee((prev) => ({ ...prev, [employeeId]: false }));
        }
    };



    const saveAll = async (): Promise<void> => {
        setIsSavingAll(true);

        try {
            // Prepare the bulk update payload
            const updates = Object.entries(cortexInputs).map(([employeeId, values]) => {
                const timeCard = timeCards.find((tc) => tc.employeeId === employeeId);
                if (!timeCard) return null; // Skip if no time card is found

                return {
                    id: timeCard._id, // Time card ID
                    CortexDuree: values.CortexDuree || undefined,
                    CortexEndTime: values.CortexEndTime || undefined,
                    expoPushToken: employees[employeeId]?.expoPushToken || undefined, // Include the push token

                };
            }).filter((update) => update !== null); // Remove null values

            if (updates.length === 0) {
                Alert.alert("No changes", "No valid updates to save.");
                setIsSavingAll(false);
                return;
            }

            // Send bulk update request
            await axios.post(
                `${AppURL}/api/timecards/timecards/bulk-update-cortex?dsp_code=${user.dsp_code}`,
                { updates }
            );
            Alert.alert("Success", "All data saved successfully!");
        } catch (error) {
            console.error("Error saving all data:", error);
            Alert.alert("Error", "Failed to save all data.");
        } finally {
            setIsSavingAll(false);
        }
    };


    const renderEmployee = ({ item }: { item: TimeCard }): JSX.Element => {
        const employee = employees[item.employeeId];
        return (
            <View style={styles.row}>
                <Text style={styles.cell}>{employee ? `${employee.name} ${employee.familyName}` : "Unknown"}</Text>
                <TextInput
                    style={styles.input}
                    placeholder={user.language === 'English' ? "The duration of the trip" : "La durée du trajet"}
                    value={cortexInputs[item.employeeId]?.CortexDuree || ""}
                    onChangeText={(value) => handleInputChange(item.employeeId, "CortexDuree", value)}
                />
                <TextInput
                    style={styles.input}
                    placeholder={user.language === 'English' ? "Cortex End Time" : "Heure de fin Cortex"}
                    value={cortexInputs[item.employeeId]?.CortexEndTime || ""}
                    onChangeText={(value) => handleInputChange(item.employeeId, "CortexEndTime", value)}
                />
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => saveIndividual(item.employeeId)}
                    disabled={savingEmployee[item.employeeId] || false} // Disable button if loading
                >
                    {savingEmployee[item.employeeId] ? ( // Show spinner if loading
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>
                            {user.language === 'English' ? "Save" : "Enregistrer"}
                        </Text>

                    )}
                </TouchableOpacity>

            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#001933" />
                <Text>
                    {user.language === 'English' ? "Loading..." : "Chargement..."}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Day Selector */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => handleDayChange(-1)} style={styles.arrowButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#001933" />
                </TouchableOpacity>
                <Text style={styles.headerText}>{formatDate(date)}</Text>
                <TouchableOpacity onPress={() => handleDayChange(1)} style={styles.arrowButton}>
                    <MaterialIcons name="arrow-forward" size={24} color="#001933" />
                </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.saveAllButton} onPress={saveAll} disabled={isSavingAll}>
                    {isSavingAll ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveAllButtonText}>
                            {user.language === 'English' ? "Save All" : "Tout Enregistrer"}
                        </Text>
                    )}
                </TouchableOpacity>
                {Platform.OS === 'web' && (
                    <TouchableOpacity style={styles.refreshButton} onPress={fetchTimeCardsAndEmployees}>
                        <Text style={styles.refreshButtonText}>
                            {user.language === 'English' ? "Refresh" : "Rafraîchir"}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>


            {/* Employee List */}
            <FlatList
                data={timeCards}
                keyExtractor={(item) => item._id}
                renderItem={renderEmployee}
                refreshControl={
                    Platform.OS !== 'web' ? (
                        <RefreshControl refreshing={refreshing} onRefresh={fetchTimeCardsAndEmployees} />
                    ) : undefined
                }
            />



        </View>
    );
};

export default CortexPrediction;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f9f9f9", // Light background for better readability
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingVertical: 12,
        backgroundColor: "#001933", // Dark background for the header
        borderRadius: 8,
    },
    arrowButton: {
        backgroundColor: "#ffff", // Green button for day navigation
        borderRadius: 50,
        padding: 8,
    },
    headerText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff", // White text for contrast
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    saveAllButton: {
        flex: 1,
        marginRight: 8,
        backgroundColor: "#001933", // Consistent dark blue
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    saveAllButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    refreshButton: {
        flex: 1,
        backgroundColor: "#001933", // Green for refresh button
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    refreshButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        backgroundColor: "#fff", // White rows
        padding: 12,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cell: {
        flex: 1,
        fontSize: 16,
        color: "#333", // Darker text for readability
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 8,
        backgroundColor: "#f0f0f0", // Light input background
        marginHorizontal: 8,
    },
    saveButton: {
        backgroundColor: "#001933", // Green save button
        padding: 8,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});
