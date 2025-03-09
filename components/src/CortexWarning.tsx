import React, { useState, useEffect } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
    ActivityIndicator,
    Pressable,
    ScrollView,
    Platform,
} from "react-native";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import AppURL from "@/components/src/URL";
import PickerModal from "@/components/src/PickerModal";
import { useUser } from '@/context/UserContext';


// 📌 Interface pour l'employé
interface Employee {
    _id: string;
    name: string;
    familyName: string;
}

// 📌 Interface pour un modèle (Template)
interface Template {
    _id: string;
    raison: string;
    description: string;
    severity: string;
    type: string;
    link: string;
}

// 📌 Interface pour les props du composant
interface CortexWarningProps {
    isVisible: boolean;
    onClose: () => void;
    employee: Employee;
    dsp_code: string;
    employeeImage: string;
}



const CortexWarning: React.FC<CortexWarningProps> = ({ isVisible, onClose, employee, dsp_code, employeeImage }) => {
    const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
    const [reason, setReason] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [severity, setSeverity] = useState<string>("low");
    const [selectedImage, setSelectedImage] = useState<string | null>(employeeImage || null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [disponibilitesOptions, setDisponibilitesOptions] = useState<
        { label: string; value: string; suspension?: boolean }[]
    >([]);
    const [selectedShiftDates, setSelectedShiftDates] = useState<{ id: string; label: string }[]>([]);
    const [type, setType] = useState<string>(""); // Ajout de type
    const [link, setLink] = useState<string>("");





    // 📌 Charger les modèles disponibles
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await axios.get(`${AppURL}/api/warnings/wornings/templates/get?dsp_code=${dsp_code}`);
                setTemplates(response.data);
            } catch (error) {
                if (Platform.OS === 'web') {
                    window.alert(
                        user?.language === 'English'
                            ? 'Unable to load templates.'
                            : "Impossible de charger les modèles."
                    );
                } else {
                    Alert.alert(
                        user?.language === 'English' ? 'Error' : 'Erreur',
                        user?.language === 'English'
                            ? 'Unable to load templates.'
                            : "Impossible de charger les modèles."
                    );
                }

            }
        };




        if (isVisible) {
            fetchTemplates();
        }
    }, [isVisible]);

    const fetchDisponibilites = async (employeeId: string, selectedDate: string) => {
        try {
            const response = await axios.get(
                `${AppURL}/api/disponibilites/disponibilites/employee/${employeeId}/after/${selectedDate}?dsp_code=${dsp_code}`
            );
            const disponibilites = response.data;

            const options = disponibilites.map((dispo: any) => ({
                label: `${dispo.suspension ? "❗ " : ""}${dispo.selectedDay} (${dispo.decisions || 'N/A'})`,
                value: dispo._id,
                suspension: dispo.suspension ?? false, // Ajoute la propriété suspension
            }));

            setDisponibilitesOptions(options);
        } catch (error) {
            console.error('Erreur lors du chargement des disponibilités:', error);
        }
    };



    // 📌 Sélectionner une image
    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            if (Platform.OS === 'web') {
                window.alert(
                    user?.language === 'English'
                        ? 'Please allow access to the gallery.'
                        : "Veuillez autoriser l'accès à la galerie."
                );
            } else {
                Alert.alert(
                    user?.language === 'English' ? 'Permission required' : 'Permission requise',
                    user?.language === 'English'
                        ? 'Please allow access to the gallery.'
                        : "Veuillez autoriser l'accès à la galerie."
                );
            }

            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            try {
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 500 } }],
                    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
                );
                setSelectedImage(manipulatedImage.uri);
            } catch (error) {
                if (Platform.OS === 'web') {
                    window.alert(
                        user?.language === 'English'
                            ? 'Unable to process the image.'
                            : "Impossible de traiter l'image."
                    );
                } else {
                    Alert.alert(
                        user?.language === 'English' ? 'Error' : 'Erreur',
                        user?.language === 'English'
                            ? 'Unable to process the image.'
                            : "Impossible de traiter l'image."
                    );
                }

            }
        }
    };

    // 📌 Appliquer un modèle sélectionné
    const handleTemplateSelect = async (templateId: string) => {
        if (!templateId) {
            setSelectedTemplate(null);
            setReason("");
            setDescription("");
            setSeverity("low");
            setType(""); // Réinitialiser le type si aucun template
            setLink(""); // ✅ Réinitialiser également le lien
            setSelectedShiftDates([]); // Réinitialiser les disponibilités
        } else {
            const selected = templates.find((t) => t._id === templateId);
            if (selected) {
                setSelectedTemplate(selected);
                setReason(selected.raison);
                setDescription(selected.description);
                setSeverity(selected.severity || "low");
                setType(selected.type); // Utiliser le type du template
                setLink(selected.link || ""); // ✅ Ajouter cette ligne
                if (selected.type === "suspension") {
                    const currentDate = new Date().toDateString(); // Ex: "Fri Feb 14 2025"
                    await fetchDisponibilites(employee._id, currentDate);
                }
            }
        }
    };



    // 📌 Soumettre le warning
    const handleSubmit = async () => {
        const today = new Date().toISOString().split("T")[0];

        // Vérifier si tous les champs sont remplis
        if (!reason || !description || !(selectedTemplate ? selectedTemplate.type : type)) {
            window.alert(
                user?.language === 'English'
                    ? "Please fill in all required fields."
                    : "Veuillez remplir tous les champs obligatoires."
            );
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("employeID", employee._id);
        formData.append("type", selectedTemplate ? selectedTemplate.type : type);
        formData.append("raison", reason);
        formData.append("description", description);
        formData.append("link", link || "");
        formData.append("severity", type === "suspension" ? "" : severity);
        formData.append("date", today);
        formData.append("signature", "false"); // Ajout pour signature
        formData.append("susNombre", selectedShiftDates.length.toString());

        // 📌 Ajout de la photo si disponible
        if (selectedImage) {
            try {
                const response = await fetch(selectedImage);
                const fileBlob = await response.blob();
                let fileName = selectedImage.split("/").pop() || `image-${Date.now()}`;

                // Vérifier l'extension du fichier
                if (!fileName.includes(".")) {
                    const fileExtension = fileBlob.type.split("/")[1] || "jpeg";
                    fileName = `${fileName}.${fileExtension}`;
                }

                formData.append("photo", new File([fileBlob], fileName, { type: fileBlob.type }));
            } catch (error) {
                window.alert(
                    user?.language === 'English'
                        ? "Unable to process the image."
                        : "Impossible de traiter l'image."
                );
                setIsSubmitting(false);
                return;
            }
        }

        try {
            // 📌 Envoi des données selon le type d'avertissement
            const disponibiliteIds = selectedShiftDates.map((item) => item.id);

            if (type === "suspension") {
                const disponibiliteUpdateData = {
                    disponibiliteIds,
                    suspension: true,
                };

                // Envoi parallèle des requêtes pour créer l'avertissement et suspendre les disponibilités
                const [createWarningResponse, updateDisponibilitesResponse] = await Promise.all([
                    axios.post(`${AppURL}/api/warnings/wornings?dsp_code=${dsp_code}`, formData),
                    axios.post(
                        `${AppURL}/api/disponibilites/disponibilites/suspension?dsp_code=${dsp_code}`,
                        disponibiliteUpdateData,
                        { headers: { "Content-Type": "application/json" } }
                    ),
                ]);

                if (createWarningResponse.status === 200 && updateDisponibilitesResponse.status === 200) {
                    window.alert(
                        user?.language === 'English'
                            ? "Suspension and updates sent successfully!"
                            : "Suspension et mises à jour envoyées avec succès !"
                    );
                } else {
                    window.alert(
                        user?.language === 'English'
                            ? "Failed to submit the suspension or update."
                            : "Échec de l'envoi de la suspension ou de la mise à jour."
                    );
                }
            } else {
                // Création d'un simple warning
                const createWarningResponse = await axios.post(
                    `${AppURL}/api/warnings/wornings?dsp_code=${dsp_code}`,
                    formData
                );

                if (createWarningResponse.status === 201) {
                    window.alert(
                        user?.language === 'English'
                            ? "Warning sent successfully!"
                            : "Avertissement envoyé avec succès !"
                    );
                } else {
                    window.alert(
                        user?.language === 'English'
                            ? "Failed to submit the warning."
                            : "Échec de l'envoi de l'avertissement."
                    );
                }
            }

            // Réinitialiser le formulaire après l'envoi
            onClose();
        } catch (error) {
            window.alert(
                user?.language === 'English'
                    ? "An unexpected error occurred. Please try again later."
                    : "Une erreur inattendue est survenue. Veuillez réessayer."
            );
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <Modal visible={isVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                        <Text style={styles.title}>
                            {user?.language === 'English' ? 'Create a warning' : 'Créer un avertissement'}
                        </Text>
                        {/* Sélection du modèle */}
                        <PickerModal
                            title={user?.language === 'English' ? 'Select a Template' : 'Sélectionner un Modèle'}
                            options={[
                                {
                                    label: user?.language === 'English' ? "No Template" : "Aucun Modèle",
                                    value: ""
                                },
                                ...templates.map((template) => ({
                                    label: `${template.raison} (${template.type})`,
                                    value: template._id,
                                })),
                            ]}
                            selectedValue={selectedTemplate?._id || ""}
                            onValueChange={handleTemplateSelect}
                        />

                        <PickerModal
                            title={user?.language === 'English' ? "Select the Type" : "Sélectionner le Type"}
                            options={[
                                { label: user?.language === 'English' ? "Warning" : "Avertissement", value: "warning" },
                                { label: user?.language === 'English' ? "Suspension" : "Suspension", value: "suspension" },
                            ]}

                            selectedValue={type}
                            onValueChange={(value) => {
                                setType(value);
                                if (value === "suspension") {
                                    const currentDate = new Date().toDateString(); // Ex: "Fri Feb 14 2025"
                                    fetchDisponibilites(employee._id, currentDate);
                                }
                            }}
                        />


                        <TextInput
                            style={styles.input}
                            placeholder={user?.language === 'English' ? "Reason" : "Raison"}
                            value={reason}
                            onChangeText={setReason}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder={user?.language === 'English' ? "Description" : "Description"}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />
                        <TextInput
                            style={styles.input}
                            placeholder={user?.language === 'English' ? "Link (optional)" : "Lien (optionnel)"}
                            value={link}
                            onChangeText={setLink}
                        />



                        {/* Sélection de la gravité */}
                        {type !== "suspension" && (
                            <PickerModal
                                title={user?.language === 'English' ? "Select the Severity" : "Sélectionner la Gravité"}
                                options={[
                                    { label: user?.language === 'English' ? "Low" : "Faible", value: "low" },
                                    { label: user?.language === 'English' ? "Medium" : "Moyenne", value: "medium" },
                                    { label: user?.language === 'English' ? "High" : "Élevée", value: "high" },
                                ]}
                                selectedValue={severity}
                                onValueChange={setSeverity}
                            />

                        )}

                        {type === "suspension" && (
                            <>
                                <PickerModal
                                    title={user?.language === 'English' ? "Select the Available to Suspend" : "Sélectionner les Disponibilités à Suspendre"}
                                    options={disponibilitesOptions}
                                    selectedValue={""}
                                    onValueChange={(value) => {
                                        const selectedOption = disponibilitesOptions.find((opt) => opt.value === value);
                                        if (selectedOption && !selectedShiftDates.some((item) => item.id === selectedOption.value)) {
                                            setSelectedShiftDates((prevDates) => [...prevDates, { id: selectedOption.value, label: selectedOption.label }]);
                                        }
                                    }}
                                />

                                <View>
                                    <Text style={styles.label}>
                                        {user?.language === 'English' ? 'Selected Availability:' : 'Disponibilités sélectionnées :'}
                                    </Text>
                                    {selectedShiftDates.length > 0 ? (
                                        <View style={styles.datesContainer}>
                                            {selectedShiftDates.map((item, index) => {
                                                const dispoOption = disponibilitesOptions.find(opt => opt.value === item.id);
                                                return (
                                                    <View key={index} style={styles.dateItem}>
                                                        <Text style={styles.dateText}>
                                                            {dispoOption?.suspension ? "❗ " : ""}{item.label}
                                                        </Text>
                                                        <TouchableOpacity
                                                            style={styles.removeButton}
                                                            onPress={() => {
                                                                setSelectedShiftDates((prevDates) => prevDates.filter((_, i) => i !== index));
                                                            }}
                                                        >
                                                            <Text style={{ color: "red", fontWeight: "bold" }}>X</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    ) : (
                                        <Text style={styles.noDatesText}>
                                            {user?.language === 'English' ? 'No availability selected.' : 'Aucune disponibilité sélectionnée.'}
                                        </Text>
                                    )}
                                </View>

                            </>
                        )}


                        {selectedImage ? (
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={() => setSelectedImage(null)}
                                >
                                    <Text style={styles.removeImageText}>X</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.pickImageButton} onPress={pickImage}>
                                <Text style={styles.pickImageButtonText}>
                                    {user?.language === 'English' ? '📸 Add an image' : '📸 Ajouter une image'}
                                </Text>
                            </TouchableOpacity>
                        )}



                        <Pressable
                            style={[styles.buttonSubmit, isSubmitting && styles.buttonDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ?
                                <ActivityIndicator size="small" color="#fff" /> :
                                <Text style={styles.buttonText}>
                                    {user?.language === 'English' ? 'Send' : 'Envoyer'}
                                </Text>
                            }
                        </Pressable>

                        <Pressable style={styles.buttonClose} onPress={onClose}>
                            <Text style={styles.buttonText}>
                                {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                            </Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default CortexWarning;

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    modalContainer: { width: "90%", maxHeight: "80%", backgroundColor: "#fff", borderRadius: 10, padding: 20 },
    title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
    input: { width: "100%", height: 40, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingHorizontal: 10, marginBottom: 10 },
    textArea: { height: 80, textAlignVertical: "top" },
    buttonSubmit: { backgroundColor: "#001933", padding: 10, borderRadius: 8, alignItems: "center" },
    buttonClose: { marginTop: 10, backgroundColor: "#888", padding: 10, borderRadius: 8, alignItems: "center" },
    pickImageButton: {
        backgroundColor: "#001933",
        padding: 10,
        borderRadius: 8,
        alignItems: "center",
        marginVertical: 10,
    },
    pickImageButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    buttonDisabled: {
        backgroundColor: "#7f8c8d", // Gris pour désactivation
    },
    buttonText: {
        color: "#ffffff",
        fontWeight: "bold",
        fontSize: 16,
    },
    imagePreviewContainer: {
        alignItems: "center",
        marginVertical: 10,
        position: "relative",
    },

    imagePreview: {
        width: 200,
        height: 200,
        borderRadius: 10,
    },

    removeImageButton: {
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: "red",
        borderRadius: 70,
        padding: 10,
    },

    removeImageText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    datesContainer: {
        marginTop: 10,
        padding: 10,
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
    },

    dateItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },

    dateText: {
        fontSize: 14,
        color: "#001933",
    },

    removeButton: {
        marginLeft: 10,
        padding: 5,
        justifyContent: "center",
        alignItems: "center",
    },

    noDatesText: {
        fontSize: 14,
        color: "#7f8c8d",
        fontStyle: "italic",
    },

    label: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 8,
        color: "#001933",
    },

});
