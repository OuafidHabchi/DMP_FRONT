import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    RefreshControl,
    FlatList
} from "react-native";
import axios from "axios";
import { MaterialIcons } from "@expo/vector-icons";
import AppURL from "@/components/src/URL";
import { Image, Modal } from "react-native";
import { useUser } from "@/context/UserContext";


type TimeCard = {
    _id: string;
    employeeId: string;
    day: string;
    CortexDuree?: string;
    CortexEndTime?: string;
    image?: String;
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
    const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
    const [date, setDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState<boolean>(true);
    const [timeCards, setTimeCards] = useState<TimeCard[]>([]);
    const [employees, setEmployees] = useState<Record<string, Employee>>({});
    const [cortexInputs, setCortexInputs] = useState<CortexInputs>({});
    const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
    const [savingEmployee, setSavingEmployee] = useState<Record<string, boolean>>({}); // Add this state
    const [refreshing, setRefreshing] = useState<boolean>(false); // State for mobile pull-to-refresh
    const [isPhotoModalVisible, setPhotoModalVisible] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isSavingPhoto, setIsSavingPhoto] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTimeCards = timeCards.filter((timeCard) => {
        const employee = employees[timeCard.employeeId];
        if (!employee) return false;

        return (
            employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.familyName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });



    const handleSelectEmployee = async (employeeId: string) => {
        setSelectedEmployeeId(employeeId);
        setPhotoModalVisible(true);
        const timeCard = timeCards.find((tc) => tc.employeeId === employeeId);

        // Vérifie si le timeCard contient une image
        if (timeCard?.image) {
            try {
                const imageURL = `${AppURL}/uploads-timecard${timeCard.image}`;
                // Optionnel : Vous pouvez effectuer une requête pour vérifier si l'image existe
                const response = await fetch(imageURL);
                if (response.ok) {
                    setSelectedImage(imageURL);
                } else {
                    setSelectedImage(null);
                    Alert.alert(
                        user?.language === "English" ? "Image not found" : "Image introuvable"
                    );
                    window.alert(
                        user?.language === "English" ? "Image not found" : "Image introuvable"
                    );

                }
            } catch (error) {
                Alert.alert(
                    user?.language === "English" ? "Failed to load image" : "Échec du chargement de l'image"
                );
                window.alert(
                    user?.language === "English" ? "Failed to load image" : "Échec du chargement de l'image"
                );
            }
        } else {
            // Si aucune image n'est associée
            setSelectedImage(null);
        }
    };





    const handlePaste = (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return;

        const items = clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) {
                    const imageUrl = URL.createObjectURL(file);
                    setSelectedImage(imageUrl);
                    break;
                }
            }
        }
    };



    const savePhoto = async () => {
        if (!selectedEmployeeId || !selectedImage) {
            Alert.alert(
                user?.language === "English" ? "No employee or image selected" : "Aucun employé ou image sélectionné"
            );
            window.alert(
                user?.language === "English" ? "No employee or image selected" : "Aucun employé ou image sélectionné"
            );
            return;
        }

        const timeCard = timeCards.find((tc) => tc.employeeId === selectedEmployeeId);
        if (!timeCard) {
            Alert.alert(
                user?.language === "English" ? "No time card found for this employee." : "Aucune fiche de temps trouvée pour cet employé."
            );

            window.alert(
                user?.language === "English" ? "No time card found for this employee." : "Aucune fiche de temps trouvée pour cet employé."
            );
            return;
        }

        const formData = new FormData();
        try {
            const response = await fetch(selectedImage);
            const fileBlob = await response.blob();

            // Extract the file extension from the MIME type
            const mimeType = fileBlob.type; // e.g., "image/jpeg"
            const extension = mimeType.split("/")[1]; // e.g., "jpeg"

            const fileName = `file-${Date.now()}.${extension}`;

            formData.append("photo", new File([fileBlob], fileName, { type: mimeType }));
        } catch (error) {
            Alert.alert("Error", "Failed to process the image.");
            window.alert("Failed to process the image.");
            return;
        }

        try {
            const response = await axios.post(
                `${AppURL}/api/timecards/timecards/${timeCard._id}/upload-image?dsp_code=${user?.dsp_code}`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (response.status === 200) {
                Alert.alert(
                    user?.language === 'English' ? 'Success' : 'Succès',
                    user?.language === 'English' ? 'Photo saved successfully!' : 'Photo enregistrée avec succès!'
                );

                window.alert(
                    user?.language === 'English' ? 'Photo saved successfully!' : 'Photo enregistrée avec succès!'
                );

                setPhotoModalVisible(false);
                setSelectedImage(null);
            } else {
                Alert.alert(
                    user?.language === 'English' ? 'Error' : 'Erreur',
                    user?.language === 'English' ? 'Failed to save the photo.' : 'Échec de l’enregistrement de la photo.'
                );

                window.alert(
                    user?.language === 'English' ? 'Failed to save the photo.' : 'Échec de l’enregistrement de la photo.'
                );

            }
        } catch (error) {

            Alert.alert(
                user?.language === 'English' ? 'Error' : 'Erreur',
                user?.language === 'English' ? 'An unexpected error occurred.' : 'Une erreur inattendue est survenue.'
            );

            window.alert(
                user?.language === 'English' ? 'An unexpected error occurred.' : 'Une erreur inattendue est survenue.'
            );

        }
    };







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
                `${AppURL}/api/timecards/timecardsss/dday/${formattedDate}?dsp_code=${user?.dsp_code}`
            );
            const timeCards = timeCardsRes.data;

            if (timeCards.length === 0) {
                Alert.alert(
                    user?.language === 'English' ? 'No data' : 'Aucune donnée',
                    user?.language === 'English'
                        ? 'No time cards found for the selected day.'
                        : 'Aucune carte de pointage trouvée pour le jour sélectionné.'
                );

                window.alert(
                    user?.language === 'English'
                        ? 'No time cards found for the selected day.'
                        : 'Aucune carte de pointage trouvée pour le jour sélectionné.'
                );

                return;
            }

            const employeeIds = [...new Set(timeCards.map((tc) => tc.employeeId))];

            const employeeRes = await axios.post<Employee[]>(
                `${AppURL}/api/employee/by-ids?dsp_code=${user?.dsp_code}`,
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
                user?.language === 'English' ? "Error" : "Erreur",
                user?.language === 'English'
                    ? "No time card found for this employee."
                    : "Aucune fiche de temps trouvée pour cet employé."
            );
            window.alert(
                user?.language === 'English'
                    ? "No time card found for this employee."
                    : "Aucune fiche de temps trouvée pour cet employé."
            );
            return;
        }

        // Set loading state for this employee
        setSavingEmployee((prev) => ({ ...prev, [employeeId]: true }));

        try {
            await axios.post(
                `${AppURL}/api/timecards/timecards/bulk-update-cortex?dsp_code=${user?.dsp_code}`,
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

            Alert.alert(
                user?.language === 'English' ? 'Success' : 'Succès',
                user?.language === 'English' ? 'Saved successfully!' : 'Enregistré avec succès!'
            );

            window.alert(
                user?.language === 'English' ? 'Saved successfully!' : 'Enregistré avec succès!'
            );


        } catch (error) {
            Alert.alert(
                user?.language === 'English' ? 'Error' : 'Erreur',
                user?.language === 'English' ? 'Failed to save data.' : 'Échec de l’enregistrement des données.'
            );

            window.alert(
                user?.language === 'English' ? 'Failed to save data.' : 'Échec de l’enregistrement des données.'
            );

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
                Alert.alert(
                    user?.language === 'English' ? 'No changes' : 'Aucune modification',
                    user?.language === 'English' ? 'No valid updates to save.' : 'Aucune mise à jour valide à enregistrer.'
                );

                window.alert(
                    user?.language === 'English' ? 'No valid updates to save.' : 'Aucune mise à jour valide à enregistrer.'
                );

                setIsSavingAll(false);
                return;
            }

            // Send bulk update request
            await axios.post(
                `${AppURL}/api/timecards/timecards/bulk-update-cortex?dsp_code=${user?.dsp_code}`,
                { updates }
            );
            Alert.alert(
                user?.language === 'English' ? 'Success' : 'Succès',
                user?.language === 'English' ? 'All data saved successfully!' : 'Toutes les données ont été enregistrées avec succès!'
            );

            window.alert(
                user?.language === 'English' ? 'All data saved successfully!' : 'Toutes les données ont été enregistrées avec succès!'
            );

        } catch (error) {

            Alert.alert(
                user?.language === 'English' ? 'Error' : 'Erreur',
                user?.language === 'English' ? 'Failed to save all data.' : 'Échec de l’enregistrement de toutes les données.'
            );

            window.alert(
                user?.language === 'English' ? 'Failed to save all data.' : 'Échec de l’enregistrement de toutes les données.'
            );

        } finally {
            setIsSavingAll(false);
        }
    };


    const renderEmployee = ({ item }: { item: TimeCard }): JSX.Element => {
        const employee = employees[item.employeeId];
        return (
            <View style={styles.row}>

                {Platform.OS === 'web' && (
                    <TouchableOpacity
                        onPress={() => handleSelectEmployee(item.employeeId)}
                    >
                        <View style={styles.row}>
                            <Text style={styles.cell}>{employee ? `${employee.name} ${employee.familyName}` : "Unknown"}</Text>
                        </View>
                    </TouchableOpacity>
                )}
                {Platform.OS !== 'web' && (
                    <Text style={styles.cell}>{employee ? `${employee.familyName}` : "Unknown"}</Text>
                )}

                <TextInput
                    style={styles.input}
                    placeholder={
                        Platform.OS === 'web'
                            ? (user?.language === 'English'
                                ? "HH:MM format (e.g., 7h 16m should be written as 07:16)"
                                : "format HH:MM (ex : 7h 16m doit être écrit 07:16)")
                            : "00:00"
                    }
                    value={cortexInputs[item.employeeId]?.CortexDuree || ""}
                    onChangeText={(value) => handleInputChange(item.employeeId, "CortexDuree", value)}
                />
                <TextInput
                    style={styles.input}
                    placeholder={
                        Platform.OS === 'web'
                            ? (user?.language === 'English'
                                ? "HH:MM format (e.g., 7:16 PM should be written as 19:16)"
                                : "format HH:MM (ex : 7:16 PM doit être écrit 19:16)")
                            : "00:00"
                    }
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
                            {user?.language === 'English' ? "Save" : "Enregistrer"}
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
                    {user?.language === 'English' ? "Loading..." : "Chargement..."}
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

            <View style={styles.searchBarContainer}>
                <TextInput
                    style={styles.searchBar}
                    placeholder={user?.language === "English" ? "  🔍 Search employees..." : " 🔍 Rechercher un employé..."}
                    placeholderTextColor="#aaa"
                    value={searchQuery}
                    onChangeText={(text) => setSearchQuery(text)}
                />
            </View>


            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.saveAllButton} onPress={saveAll} disabled={isSavingAll}>
                    {isSavingAll ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveAllButtonText}>
                            {user?.language === 'English' ? "Save All" : "Tout Enregistrer"}
                        </Text>
                    )}
                </TouchableOpacity>

            </View>
            <View style={styles.inputTitleContainer}>
                <Text style={styles.inputTitle}>
                    {user?.language === 'English' ? "Cortex Duration" : "Durée du Cortex"}
                </Text>
                <Text style={styles.inputTitle}>
                    {user?.language === 'English' ? "Cortex End Time" : "Heure de fin Cortex"}
                </Text>
            </View>


            {/* Employee List */}
            <FlatList
                data={filteredTimeCards}
                keyExtractor={(item) => item._id}
                renderItem={renderEmployee}
                refreshControl={
                    Platform.OS !== 'web' ? (
                        <RefreshControl refreshing={refreshing} onRefresh={fetchTimeCardsAndEmployees} />
                    ) : undefined
                }
            />

            <Modal visible={isPhotoModalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>
                            {user?.language === "English" ? "Upload Photo" : "Télécharger une photo"}
                        </Text>

                        {/* Vérifier et afficher soit l'image associée, soit celle sélectionnée */}
                        {selectedImage ? (
                            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                        ) : selectedEmployeeId &&
                            timeCards.find((tc) => tc.employeeId === selectedEmployeeId)?.image ? (
                            <Image
                                source={{
                                    uri: `${AppURL}/uploads-timecard${timeCards.find((tc) => tc.employeeId === selectedEmployeeId)?.image}`,
                                }}
                                style={styles.imagePreview}
                            />

                        ) : (
                            <Text style={styles.modalText}>
                                {user?.language === "English" ? "No image available" : "Aucune image disponible"}
                            </Text>
                        )}

                        {/* Paste Zone for Web */}
                        {Platform.OS === "web" && (
                            <div
                                style={{
                                    width: "50%",
                                    height: 100,
                                    borderWidth: 1,
                                    borderColor: "#ccc",
                                    borderRadius: 8,
                                    backgroundColor: "#f0f0f0",
                                    padding: 8,
                                    marginBottom: 16,
                                }}
                                onPaste={(e) => handlePaste(e.nativeEvent as ClipboardEvent)}
                            >
                                <Text style={{ color: "#333" }}>
                                    {user?.language === "English"
                                        ? "Paste your image here (Ctrl+V)"
                                        : "Collez votre image ici (Ctrl+V)"}
                                </Text>
                            </div>
                        )}

                        <TouchableOpacity
                            style={[styles.saveButton, isSavingPhoto && styles.buttonDisabled]}
                            onPress={savePhoto}
                            disabled={isSavingPhoto}
                        >
                            {isSavingPhoto ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveButtonText}>
                                    {user?.language === "English" ? "Save Photo" : "Enregistrer la photo"}
                                </Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setPhotoModalVisible(false)}>
                            <Text style={styles.cancelButtonText}>
                                {user?.language === "English" ? "Cancel" : "Annuler"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>



        </View>
    );
};

export default CortexPrediction;

const styles = StyleSheet.create({
    inputTitleContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 8,
        paddingHorizontal: 12,
    },
    inputTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: "bold",
        color: "#001933", // Bleu foncé
        textAlign: "center",
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
    pasteZone: {
        width: "100%",
        height: 100,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        backgroundColor: "#f0f0f0",
        padding: 8,
        marginBottom: 16,
        textAlignVertical: "top",
        color: "#333",
    },
    modalText: {
        fontSize: 16,
        color: "#7f8c8d",
        marginBottom: 16,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "80%", // Réduit la largeur
        padding: 16,
        backgroundColor: "#ffffff",
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 10,
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 16,
    },
    imagePreview: {
        width: 200,
        height: 200,
        borderRadius: 8,
        marginBottom: 16,
    },
    cancelButton: {
        marginTop: 8,
        padding: 12,
        borderRadius: 8,
        backgroundColor: "#7f8c8d",
    },
    cancelButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    photoButton: {
        marginTop: 8,
        backgroundColor: "#001933",
        padding: 8,
        borderRadius: 8,
    },
    photoButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },

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
