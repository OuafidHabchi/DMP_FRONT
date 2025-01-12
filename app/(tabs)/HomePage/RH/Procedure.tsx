import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';

// Définir le type User
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
    const route = useRoute();
    const { user } = route.params as { user: User };
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


    const API_URL = 'https://coral-app-wqv9l.ondigitalocean.app/api/procedure';
    const URL_Employees = 'https://coral-app-wqv9l.ondigitalocean.app/api';

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await axios.get<Employee[]>(`${URL_Employees}/employee?dsp_code=${user.dsp_code}`);
                setEmployees(response.data);
            } catch (err) {
                console.error('Error fetching employees:', err);
            }
        };

        fetchEmployees();
    }, []);

    const handleSeenClick = async (procedure: Procedure) => {
        try {
            // Recharger les employés avant d'afficher le modal
            const response = await axios.get<Employee[]>(`${URL_Employees}/employee?dsp_code=${user.dsp_code}`);
            setEmployees(response.data);

            // Filtrer les employés qui ont vu la procédure
            const seenList = response.data.filter(emp => procedure.seen.includes(emp._id));
            setSeenEmployees(seenList);
            setSeenModalVisible(true);
        } catch (err) {
            console.error('Error fetching seen employees:', err);
        }
    };
    const handleRefresh = async () => {
        setIsLoading(true); // Démarre le chargement
        try {
            const [proceduresResponse, employeesResponse] = await Promise.all([
                axios.get<Procedure[]>(`${API_URL}/?dsp_code=${user.dsp_code}`), // Récupérer les procédures
                axios.get<Employee[]>(`${URL_Employees}/employee?dsp_code=${user.dsp_code}`), // Récupérer les employés
            ]);

            setProcedures(proceduresResponse.data); // Met à jour les procédures
            setEmployees(employeesResponse.data); // Met à jour les employés
        } catch (err) {
            console.error('Error refreshing data:', err);
        } finally {
            setIsLoading(false); // Arrête le chargement
        }
    };





    // Charger les procédures au montage du composant
    useEffect(() => {
        const fetchProcedures = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get<Procedure[]>(`${API_URL}/?dsp_code=${user.dsp_code}`);
                setProcedures(response.data);
            } catch (err) {
                console.error('Error fetching procedures:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProcedures();
    }, []);

    // Gérer la création d'une procédure
    const handleCreateProcedure = async () => {
        if (!newProcedure.name || !newProcedure.content) {
            Alert.alert('Error', 'Please fill in the required fields.');
            return;
        }

        const procedureData = {
            ...newProcedure,
            date: new Date().toISOString(),
            createdBy: user._id,
            employeeExpoTokens: employees.map(emp => emp.expoPushToken), // Inclure les tokens
        };

        try {
            const response = await axios.post(`${API_URL}?dsp_code=${user.dsp_code}`, procedureData);
            setProcedures(prev => [response.data, ...prev]);
            setModalVisible(false);
            resetForm();
        } catch (err) {
            console.error('Error creating procedure:', err);
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
            const response = await axios.put(`${API_URL}/${selectedProcedure._id}?dsp_code=${user.dsp_code}`, updatedProcedure);
            setProcedures(prev =>
                prev.map(proc => (proc._id === selectedProcedure._id ? response.data : proc))
            );
            setEditModalVisible(false);
        } catch (err) {
            console.error('Error updating procedure:', err);
        }
    };


    // Gérer la suppression d'une procédure sans confirmation
    const handleDeleteProcedure = async (procedureId: string) => {
        try {
            await axios.delete(`${API_URL}/${procedureId}?dsp_code=${user.dsp_code}`); // Effectuer la requête de suppression
            setProcedures(prev => prev.filter(proc => proc._id !== procedureId)); // Mettre à jour la liste des procédures
            setEditModalVisible(false); // Fermer le modal après suppression
        } catch (err) {
            console.error('Error deleting procedure:', err); // Gérer les erreurs
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
            <Text style={styles.title}>
                {user.language === 'English' ? 'Procedures Management' : 'Gestion des Procédures'}
            </Text>
            <TextInput
                style={styles.searchBar}
                placeholder={user.language === 'English' ? 'Search procedures...' : 'Rechercher des procédures...'}
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
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
                            : (user.language === 'English' ? 'Unknown Creator' : 'Créateur Inconnu');


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
                                            {user.language === 'English' ? `Created By: ${creatorName}` : `Créé par : ${creatorName}`}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.seenButton}
                                        onPress={() => handleSeenClick(item)}
                                    >
                                        <Text style={styles.seenButtonText}>
                                            {user.language === 'English' ? 'Seen' : 'Vu'}
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
                    {user.language === 'English' ? 'No procedures' : 'Aucune procédure'}
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
                            {user.language === 'English' ? 'Create Procedure' : 'Créer une Procédure'}
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder={user.language === 'English' ? 'Name' : 'Nom'}
                            value={newProcedure.name}
                            onChangeText={text => setNewProcedure(prev => ({ ...prev, name: text }))}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder={user.language === 'English' ? 'Content' : 'Contenu'}
                            value={newProcedure.content}
                            onChangeText={text => setNewProcedure(prev => ({ ...prev, content: text }))}
                            multiline
                        />
                        <TextInput
                            style={styles.input}
                            placeholder={user.language === 'English' ? 'Link (optional)' : 'Lien (facultatif)'}
                            value={newProcedure.link}
                            onChangeText={text => setNewProcedure(prev => ({ ...prev, link: text }))}
                        />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleCreateProcedure}>
                                <Text style={styles.buttonText}>
                                    {user.language === 'English' ? 'Save' : 'Enregistrer'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.buttonText}>
                                    {user.language === 'English' ? 'Cancel' : 'Annuler'}
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
                        <Text style={styles.modalTitle}>Edit Procedure</Text>

                        <TextInput
                            style={styles.input}
                            placeholder={user.language === 'English' ? 'Name' : 'Nom'}
                            value={selectedProcedure?.name || ''}
                            onChangeText={text => setSelectedProcedure(prev => prev && { ...prev, name: text })}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder={user.language === 'English' ? 'Content' : 'Contenu'}
                            value={selectedProcedure?.content || ''}
                            onChangeText={text => setSelectedProcedure(prev => prev && { ...prev, content: text })}
                            multiline
                        />
                        <TextInput
                            style={[styles.input, styles.textAreaLink]}
                            placeholder={user.language === 'English' ? 'Link (optional)' : 'Lien (facultatif)'}
                            value={selectedProcedure?.link || ''}
                            onChangeText={text => setSelectedProcedure(prev => prev && { ...prev, link: text })}
                        />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdateProcedure}>
                                <Text style={styles.buttonText}>
                                    {user.language === 'English' ? 'Save' : 'Enregistrer'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.warningButton]} onPress={() => selectedProcedure && handleDeleteProcedure(selectedProcedure._id)}>
                                <Text style={styles.buttonText}>
                                    {user.language === 'English' ? 'Delete' : 'Supprimer'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.buttonText}>
                                    {user.language === 'English' ? 'Cancel' : 'Annuler'}
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
                            {user.language === 'English' ? 'Seen Employees' : 'Employés vus'}
                        </Text>
                        {seenEmployees.length > 0 ? (
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
                                {user.language === 'English' ? 'No one has seen this procedure.' : 'Personne n\'a vu cette procédure.'}
                            </Text>
                        )}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setSeenModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>
                                {user.language === 'English' ? 'Close' : 'Fermer'}
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
    searchBar: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
        height: 50,
        borderWidth: 1,
        borderColor: '#001933',
        color: '#2c3e50',
        fontSize: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
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
