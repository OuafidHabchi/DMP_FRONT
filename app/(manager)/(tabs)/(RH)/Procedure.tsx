import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    FlatList,
    Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';

type Employee = {
    _id: string;
    name: string;
    familyName: string;
    expoPushToken: string;
    tel: string;
};

// Définir le type Procedure
type Procedure = {
    _id: string;
    name: string;
    content: string;
    date: string;
    createdBy: string;
    link?: string;
    seen: string[];
};

const Procedure = () => {
    const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
    const [isSeenLoading, setIsSeenLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
    const [newProcedure, setNewProcedure] = useState({
        name: '',
        content: '',
        link: '',
    });
    // Ajouter un état pour stocker les employés et le modal
    const [employees, setEmployees] = useState<Employee[]>([]); // Liste des employés
    const [seenModalVisible, setSeenModalVisible] = useState(false); // Contrôle du modal
    const [seenEmployees, setSeenEmployees] = useState<Employee[]>([]); // Employés qui ont vu
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await axios.get<Employee[]>(`${AppURL}/api/employee?dsp_code=${user?.dsp_code}`);
                setEmployees(response.data);
            } catch (err) {
                if (Platform.OS === 'web') {
                    window.alert(
                        user?.language === 'English'
                            ? 'Error fetching employees.'
                            : 'Erreur lors de la récupération des employés.'
                    );
                } else {
                    Alert.alert(
                        user?.language === 'English' ? 'Error' : 'Erreur',
                        user?.language === 'English'
                            ? 'Error fetching employees.'
                            : 'Erreur lors de la récupération des employés.'
                    );
                }
            }
        };
        fetchEmployees();
    }, []);

    const handleSeenClick = async (procedure: Procedure) => {
        try {
            setIsSeenLoading(true); // Démarrer le chargement
            // Récupérer la liste des employés à jour
            const response = await axios.get<Employee[]>(`${AppURL}/api/employee?dsp_code=${user?.dsp_code}`);
            setEmployees(response.data);

            // Recharger les informations de la procédure spécifique pour obtenir la liste des "seen" actualisée
            const procedureResponse = await axios.get<Procedure>(`${AppURL}/api/procedure/${procedure._id}?dsp_code=${user?.dsp_code}`);

            // Filtrer les employés qui ont vu la procédure mise à jour
            const seenList = response.data.filter(emp => procedureResponse.data.seen.includes(emp._id));
            setSeenEmployees(seenList);
            setIsSeenLoading(false); // Arrêter le chargement avant d'afficher le modal
            setSeenModalVisible(true);
        } catch (err) {
            setIsSeenLoading(false); // Arrêter le chargement avant d'afficher le modal
            if (Platform.OS === 'web') {
                window.alert(
                    user?.language === 'English'
                        ? 'Error fetching seen employees.'
                        : 'Erreur lors de la récupération des employés vus.'
                );
            } else {
                Alert.alert(
                    user?.language === 'English' ? 'Error' : 'Erreur',
                    user?.language === 'English'
                        ? 'Error fetching seen employees.'
                        : 'Erreur lors de la récupération des employés vus.'
                );
            }

        }
    };
    const handleRefresh = async () => {
        setIsLoading(true); // Démarre le chargement
        try {
            const [proceduresResponse, employeesResponse] = await Promise.all([
                axios.get<Procedure[]>(`${AppURL}/api/procedure/?dsp_code=${user?.dsp_code}`), // Récupérer les procédures
                axios.get<Employee[]>(`${AppURL}/api/employee?dsp_code=${user?.dsp_code}`), // Récupérer les employés
            ]);

            setProcedures(proceduresResponse.data); // Met à jour les procédures
            setEmployees(employeesResponse.data); // Met à jour les employés
        } catch (err) {
            if (Platform.OS === 'web') {
                window.alert(
                    user?.language === 'English'
                        ? 'Error refreshing data.'
                        : 'Erreur lors du rafraîchissement des données.'
                );
            } else {
                Alert.alert(
                    user?.language === 'English' ? 'Error' : 'Erreur',
                    user?.language === 'English'
                        ? 'Error refreshing data.'
                        : 'Erreur lors du rafraîchissement des données.'
                );
            }
        } finally {
            setIsLoading(false); // Arrête le chargement
        }
    };





    // Charger les procédures au montage du composant
    useEffect(() => {
        const fetchProcedures = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get<Procedure[]>(`${AppURL}/api/procedure/?dsp_code=${user?.dsp_code}`);
                setProcedures(response.data);
            } catch (err) {
                if (Platform.OS === 'web') {
                    window.alert(
                        user?.language === 'English'
                            ? 'Error fetching procedures.'
                            : 'Erreur lors de la récupération des procédures.'
                    );
                } else {
                    Alert.alert(
                        user?.language === 'English' ? 'Error' : 'Erreur',
                        user?.language === 'English'
                            ? 'Error fetching procedures.'
                            : 'Erreur lors de la récupération des procédures.'
                    );
                }

            } finally {
                setIsLoading(false);
            }
        };

        fetchProcedures();
    }, []);

    // Gérer la création d'une procédure
    const handleCreateProcedure = async () => {
        if (!newProcedure.name || !newProcedure.content) {
            if (Platform.OS === 'web') {
                window.alert(
                    user?.language === 'English'
                        ? 'Please fill in the required fields.'
                        : 'Veuillez remplir les champs obligatoires.'
                );
            } else {
                Alert.alert(
                    user?.language === 'English' ? 'Error' : 'Erreur',
                    user?.language === 'English'
                        ? 'Please fill in the required fields.'
                        : 'Veuillez remplir les champs obligatoires.'
                );
            }

            return;
        }

        const procedureData = {
            ...newProcedure,
            date: new Date().toISOString(),
            createdBy: user?._id,
            employeeExpoTokens: employees.map(emp => emp.expoPushToken), // Inclure les tokens
        };

        try {
            const response = await axios.post(`${AppURL}/api/procedure?dsp_code=${user?.dsp_code}`, procedureData);
            setProcedures(prev => [response.data, ...prev]);
            setModalVisible(false);
            resetForm();
        } catch (err) {
            if (Platform.OS === 'web') {
                window.alert(
                    user?.language === 'English'
                        ? 'Error creating procedure.'
                        : 'Erreur lors de la création de la procédure.'
                );
            } else {
                Alert.alert(
                    user?.language === 'English' ? 'Error' : 'Erreur',
                    user?.language === 'English'
                        ? 'Error creating procedure.'
                        : 'Erreur lors de la création de la procédure.'
                );
            }

        }
    };


    // Gérer la modification d'une procédure
    const handleUpdateProcedure = async () => {
        if (!selectedProcedure) return;

        const updatedProcedure = {
            ...selectedProcedure,
            employeeExpoTokens: employees.map(emp => emp.expoPushToken), // Inclure les tokens
        };

        try {
            const response = await axios.put(`${AppURL}/api/procedure/${selectedProcedure._id}?dsp_code=${user?.dsp_code}`, updatedProcedure);
            setProcedures(prev =>
                prev.map(proc => (proc._id === selectedProcedure._id ? response.data : proc))
            );
            setEditModalVisible(false);
        } catch (err) {
            if (Platform.OS === 'web') {
                window.alert(
                    user?.language === 'English'
                        ? 'Error updating procedure.'
                        : 'Erreur lors de la mise à jour de la procédure.'
                );
            } else {
                Alert.alert(
                    user?.language === 'English' ? 'Error' : 'Erreur',
                    user?.language === 'English'
                        ? 'Error updating procedure.'
                        : 'Erreur lors de la mise à jour de la procédure.'
                );
            }

        }
    };


    // Gérer la suppression d'une procédure avec confirmation
    const handleDeleteProcedure = async (procedureId: string) => {
        const confirmationMessage = user?.language === 'English'
            ? 'Are you sure you want to delete this procedure?'
            : 'Êtes-vous sûr de vouloir supprimer cette procédure ?';

        const successMessage = user?.language === 'English'
            ? 'Procedure deleted successfully!'
            : 'Procédure supprimée avec succès !';

        const errorMessage = user?.language === 'English'
            ? 'Error deleting procedure.'
            : 'Erreur lors de la suppression de la procédure.';

        // Confirmation pour React Native (mobile)
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
                            await deleteProcedure(procedureId, successMessage, errorMessage);
                        },
                        style: 'destructive',
                    },
                ]
            );
        }

        // Confirmation pour le Web
        if (window.confirm(confirmationMessage)) {
            await deleteProcedure(procedureId, successMessage, errorMessage);
        }
    };

    // Fonction séparée pour la suppression après confirmation
    const deleteProcedure = async (procedureId: string, successMessage: string, errorMessage: string) => {
        try {
            await axios.delete(`${AppURL}/api/procedure/${procedureId}?dsp_code=${user?.dsp_code}`);

            // Mettre à jour la liste des procédures après suppression
            setProcedures(prev => prev.filter(proc => proc._id !== procedureId));
            setEditModalVisible(false); // Fermer le modal après suppression

            if (Platform.OS === 'web') {
                window.alert(errorMessage);
            } else {
                Alert.alert(user?.language === 'English' ? 'Success' : 'Succès', successMessage);
            }

        } catch (err) {
            if (Platform.OS === 'web') {
                window.alert(errorMessage);
            } else {
                Alert.alert('Error', errorMessage);
            }

        }
    };


    const filteredProcedures = procedures.filter((procedure) =>
        procedure.name.toLowerCase().includes(searchQuery.toLowerCase())
    );



    // Réinitialiser le formulaire
    const resetForm = () => {
        setNewProcedure({ name: '', content: '', link: '' });
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchBarContainer}>
                <TextInput
                    style={styles.searchBar}
                    placeholder={user?.language === 'English' ? ' 🔍 Search procedures...' : ' 🔍 Rechercher des procédures...'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>
            {isLoading ? (

                <ActivityIndicator size="large" color="#001933" />
            ) : procedures.length > 0 ? (
                <FlatList
                    data={filteredProcedures}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => {
                        // Extraire la date au format yyyy-mm-dd
                        const formattedDate = item.date.split('T')[0];

                        // Trouver le nom de l'utilisateur créé (exemple : récupéré depuis employees)
                        const creator = employees.find(emp => emp._id === item.createdBy);
                        const creatorName = creator
                            ? `${creator.name} ${creator.familyName}`
                            : (user?.language === 'English' ? 'Unknown Creator' : 'Créateur Inconnu');


                        return (
                            <TouchableOpacity
                                style={styles.procedureCard}
                                onPress={() => {
                                    setSelectedProcedure(item);
                                    setEditModalVisible(true);
                                }}
                            >
                                <View style={styles.procedureInfoContainer}>
                                    <View>
                                        <Text style={styles.procedureName}>{item.name}</Text>
                                        <Text style={styles.procedureDate}>Date: {formattedDate}</Text>
                                        <Text style={styles.procedureCreator}>
                                            {user?.language === 'English' ? `Created By: ${creatorName}` : `Créé par : ${creatorName}`}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.seenButton}
                                        onPress={() => handleSeenClick(item)}
                                    >
                                        <Text style={styles.seenButtonText}>
                                            {user?.language === 'English' ? 'Seen' : 'Vu'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                            </TouchableOpacity>
                        );
                    }}
                    refreshing={isLoading} // Indicateur de chargement pour le pull-to-refresh
                    onRefresh={handleRefresh} // Fonction appelée lors du glissement pour rafraîchir
                />

            ) : (
                <Text style={styles.emptyText}>
                    {user?.language === 'English' ? 'No procedures' : 'Aucune procédure'}
                </Text>
            )}

            {/* Bouton flottant pour ajouter une procédure */}
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
            >
                <MaterialIcons name="add" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Modal de création */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {user?.language === 'English' ? 'Create Procedure' : 'Créer une Procédure'}
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder={user?.language === 'English' ? 'Name' : 'Nom'}
                            value={newProcedure.name}
                            onChangeText={text => setNewProcedure(prev => ({ ...prev, name: text }))}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder={user?.language === 'English' ? 'Content' : 'Contenu'}
                            value={newProcedure.content}
                            onChangeText={text => setNewProcedure(prev => ({ ...prev, content: text }))}
                            multiline
                        />
                        <TextInput
                            style={styles.input}
                            placeholder={user?.language === 'English' ? 'Link (optional)' : 'Lien (facultatif)'}
                            value={newProcedure.link}
                            onChangeText={text => setNewProcedure(prev => ({ ...prev, link: text }))}
                        />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleCreateProcedure}>
                                <Text style={styles.buttonText}>
                                    {user?.language === 'English' ? 'Save' : 'Enregistrer'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.buttonText}>
                                    {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                </View>
            </Modal>

            {/* Modal de modification */}
            <Modal visible={editModalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {user?.language === 'English' ? 'Edit Procedure' : 'Modifier la Procédure'}
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder={user?.language === 'English' ? 'Name' : 'Nom'}
                            value={selectedProcedure?.name || ''}
                            onChangeText={text => setSelectedProcedure(prev => prev && { ...prev, name: text })}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder={user?.language === 'English' ? 'Content' : 'Contenu'}
                            value={selectedProcedure?.content || ''}
                            onChangeText={text => setSelectedProcedure(prev => prev && { ...prev, content: text })}
                            multiline
                        />
                        <TextInput
                            style={[styles.input, styles.textAreaLink]}
                            placeholder={user?.language === 'English' ? 'Link (optional)' : 'Lien (facultatif)'}
                            value={selectedProcedure?.link || ''}
                            onChangeText={text => setSelectedProcedure(prev => prev && { ...prev, link: text })}
                        />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdateProcedure}>
                                <Text style={styles.buttonText}>
                                    {user?.language === 'English' ? 'Save' : 'Enregistrer'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.warningButton]} onPress={() => selectedProcedure && handleDeleteProcedure(selectedProcedure._id)}>
                                <Text style={styles.buttonText}>
                                    {user?.language === 'English' ? 'Delete' : 'Supprimer'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.buttonText}>
                                    {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                </View>
            </Modal>

            {/* Modal de Seen */}

            <Modal visible={seenModalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {user?.language === 'English' ? 'Seen Employees' : 'Employés vus'}
                        </Text>

                        {isSeenLoading ? (
                            <ActivityIndicator size="large" color="#001933" />
                        ) : seenEmployees.length > 0 ? (
                            <FlatList
                                data={seenEmployees}
                                keyExtractor={(item) => item._id}
                                renderItem={({ item }) => (
                                    <Text style={styles.employeeText}>
                                        {item.name} {item.familyName}
                                    </Text>
                                )}
                            />
                        ) : (
                            <Text style={styles.emptyText}>
                                {user?.language === 'English' ? 'No one has seen this procedure.' : 'Personne n\'a vu cette procédure.'}
                            </Text>
                        )}

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setSeenModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>
                                {user?.language === 'English' ? 'Close' : 'Fermer'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>



        </View>
    );
};

export default Procedure;

const styles = StyleSheet.create({
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#001933',
        textAlign: 'center',
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
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        padding: 20,
    },
    procedureCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    procedureName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    procedureDate: {
        fontSize: 14,
        color: '#001933',
    },
    emptyText: {
        fontSize: 16,
        color: '#001933',
        textAlign: 'center',
        marginTop: 20,
    },
    addButton: {
        backgroundColor: '#001933',
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 30,
        right: 30,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dim the background for focus
    },
    modalContent: {
        backgroundColor: '#ffffff',
        padding: 25,
        borderRadius: 15,
        width: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 10, // Higher elevation for modern design
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
        color: '#001933',
        marginBottom: 15,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    textArea: {
        height: 190,
        textAlignVertical: 'top',
    },
    textAreaLink: {
        textAlignVertical: 'top', // Texte aligné en haut
        height: 50, // Hauteur fixe
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 10,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
        overflow: 'hidden', // Empêche le contenu de dépasser
    },
    buttonContainer: {
        marginTop: 20,
        flexDirection: 'column',
        alignItems: 'stretch',
    },
    button: {
        paddingVertical: 15,
        borderRadius: 8,
        marginBottom: 10,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: '#001933',
    },
    secondaryButton: {
        backgroundColor: '#6c757d',
    },
    warningButton: {
        backgroundColor: '#dc3545',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
    },

    fullWidthButton: {
        marginBottom: 10, // Espacement entre les boutons
        alignSelf: 'stretch', // Prendre toute la largeur disponible
    },
    saveButton: {
        backgroundColor: '#001933',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    deleteButton: {
        backgroundColor: '#ffc107',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#dc3545',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    seenButton: {
        backgroundColor: '#001933',
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 5,
        marginTop: 10,
    },
    seenButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    employeeText: {
        fontSize: 16,
        color: '#001933',
        paddingVertical: 5,
    },
    closeButton: {
        backgroundColor: '#6c757d',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 15,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    procedureInfoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    procedureCreator: {
        fontSize: 14,
        color: '#001933',
        marginTop: 5,
    },




});
