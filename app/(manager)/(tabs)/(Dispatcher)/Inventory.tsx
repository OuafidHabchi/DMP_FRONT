import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';

type Vehicle = {
    id: string; // Utilisé pour React
    _id?: string; // Optionnel pour les données provenant de la base de données
    name: string;
    key: boolean;
    shellCard: boolean;
    paper: boolean;
    cable: boolean;
    exists: boolean; // Pour aligner avec votre structure
    status: string;
};

type Phone = {
    id: string;
    _id?: string; // Optionnel
    name: string;
    comment?: string;
    exists: boolean;
    status: string;
};

type Battery = {
    id: string;
    _id?: string; // Optionnel
    name: string;
    comment?: string;
    exists: boolean;
    status: string;
};


type InventoryItem = {
    _id?: string; // Champ optionnel pour indiquer les nouveaux éléments qui n'ont pas encore d'ID
    type: 'VEHICLE' | 'PHONE' | 'BATTERY';
    name: string;
    comment?: string;
    status?: string;
    [key: string]: any; // Pour accepter d'autres champs comme 'key', 'exists', etc.
};


const Inventory = () => {
    const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
    const [activeTab, setActiveTab] = useState<'VEHICLES' | 'PHONES' | 'BATTERIES'>('VEHICLES');
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [phones, setPhones] = useState<Phone[]>([]);
    const [batteries, setBatteries] = useState<Battery[]>([]);
    const [selectedItem, setSelectedItem] = useState<null | { id: string; type: 'VEHICLE' | 'PHONE' | 'BATTERY' }>(null);
    const statusOptions = ['Used', 'On Road', 'Not Used', 'Missing'];
    const [loading, setLoading] = useState(false);
    const [resetCounter, setResetCounter] = useState(0); // Track forced resets
    const [refreshing, setRefreshing] = useState(false); // Pour gérer l'état de rafraîchissement
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [buttonText, setButtonText] = useState("Save");


    const openStatusModal = (id: string, type: 'VEHICLE' | 'PHONE' | 'BATTERY') => {
        setSelectedItem({ id, type });
    };

    const handleStatusSelect = (status: string) => {
        if (selectedItem) {
            if (selectedItem.type === 'VEHICLE') {
                setVehicles((prev) =>
                    prev.map((v) => (v.id === selectedItem.id ? { ...v, status } : v))
                );
            } else if (selectedItem.type === 'PHONE') {
                setPhones((prev) =>
                    prev.map((p) => (p.id === selectedItem.id ? { ...p, status } : p))
                );
            } else if (selectedItem.type === 'BATTERY') {
                setBatteries((prev) =>
                    prev.map((b) => (b.id === selectedItem.id ? { ...b, status } : b))
                );
            }
        }
        setSelectedItem(null);
    };

    const CustomCheckbox = ({ value, onValueChange }: { value: boolean; onValueChange: () => void }) => (
        <Pressable
            onPress={onValueChange}
            style={[styles.checkbox, value ? styles.checkboxChecked : styles.checkboxUnchecked]}
        >
            {value && <Text style={styles.checkboxMark}>✔</Text>}
        </Pressable>
    );

    const toggleCheckbox = <T extends { id: string }>(
        list: T[],
        setList: React.Dispatch<React.SetStateAction<T[]>>,
        id: string,
        field: keyof T
    ) => {
        const updatedList = list.map((item) =>
            item.id === id ? { ...item, [field]: !item[field] } : item
        );
        setList(updatedList);
    };


    useEffect(() => {
        if (activeTab === 'VEHICLES') fetchVehicles();
        else if (activeTab === 'PHONES') fetchPhones();
        else if (activeTab === 'BATTERIES') fetchBatteries();
    }, [activeTab]);

    useEffect(() => {
        loadItems();
    }, []);

    // Fonction de rafraîchissement
    const onRefresh = async () => {
        setRefreshing(true); // Démarre l'animation de rafraîchissement

        try {
            if (activeTab === 'VEHICLES') {
                await fetchVehicles();
            } else if (activeTab === 'PHONES') {
                await fetchPhones();
            } else if (activeTab === 'BATTERIES') {
                await fetchBatteries();
            }
            await loadItems();
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false); // Arrête l'animation une fois terminé
        }
    };



    const fetchVehicles = async () => {
        if (vehicles.length > 0) return; // Only fetch if state is empty
        try {
            const response = await fetch(`${AppURL}/api/vehicles/all?dsp_code=${user?.dsp_code}`);
            const result = await response.json();

            // Vérifiez et accédez aux données
            const vehiclesData = Array.isArray(result.data) ? result.data : [];
            const formattedData = vehiclesData.map((vehicle: any) => ({
                id: vehicle._id,
                name: vehicle.vehicleNumber,
                key: false,
                shellCard: false,
                paper: false,
                cable: false,
                exists: false,
                status: '',
            }));
            setVehicles(formattedData);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        }
    };



    const fetchPhones = async () => {
        try {
            const response = await fetch(`${AppURL}/api/phones/phones?dsp_code=${user?.dsp_code}`);
            const data = await response.json(); // Assurez-vous que cette ligne traite bien le JSON
            const formattedPhones = data.map((phone: { _id: any; name: any; comment: any; exists: any; status: any; }) => ({
                id: phone._id,
                name: phone.name,
                comment: phone.comment || 'No comment', // Ajout d'un fallback
                exists: phone.exists || false,
                status: phone.status || '',
            }));
            setPhones(formattedPhones); // Met à jour l'état
        } catch (error) {
            console.error('Error fetching phones:', error);
        }
    };


    const fetchBatteries = async () => {
        try {
            const response = await fetch(`${AppURL}/api/powerbanks/powerbanks?dsp_code=${user?.dsp_code}`);
            const data = await response.json();
            const formattedData = data.map((battery: any) => ({
                id: battery._id,
                name: battery.name,
                comment: battery.comment || 'No comment', // Fallback si `comment` est absent
                exists: battery.exists || false,
                status: battery.status || '',
            }));
            setBatteries(formattedData);
        } catch (error) {
            console.error('Error fetching batteries:', error);
        }
    };


    const consolidateInventoryItems = (): Partial<InventoryItem>[] => {
        const items = [
            ...vehicles.map(vehicle => ({
                id: vehicle.id || vehicle._id, // Utilisez `_id` si `id` est manquant
                type: 'VEHICLE' as const,
                name: vehicle.name,
                key: vehicle.key,
                shellCard: vehicle.shellCard,
                paper: vehicle.paper,
                cable: vehicle.cable,
                status: vehicle.status,
            })),
            ...phones.map(phone => ({
                id: phone.id || phone._id, // Utilisez `_id` si `id` est manquant
                type: 'PHONE' as const,
                name: phone.name,
                comment: phone.comment,
                exists: phone.exists,
                status: phone.status,
            })),
            ...batteries.map(battery => ({
                id: battery.id || battery._id, // Utilisez `_id` si `id` est manquant
                type: 'BATTERY' as const,
                name: battery.name,
                comment: battery.comment,
                exists: battery.exists,
                status: battery.status,
            })),
        ];

        return items;
    };

    const loadItems = async () => {
        try {
            const response = await axios.get(`${AppURL}/api/inventory?dsp_code=${user?.dsp_code}`);
            const items = response.data;

            if (items.length > 0) {
                setButtonText("Update"); // La liste n'est pas vide, passer à "Update"
                const loadedVehicles = items
                    .filter((item: { type: string; }) => item.type === 'Vehicle')
                    .map((vehicle: { _id: any; key: any; shellCard: any; paper: any; cable: any; exists: any; }) => ({
                        ...vehicle,
                        id: vehicle._id,
                        key: vehicle.key || false,
                        shellCard: vehicle.shellCard || false,
                        paper: vehicle.paper || false,
                        cable: vehicle.cable || false,
                        exists: vehicle.exists || false,
                    }));

                const loadedPhones = items
                    .filter((item: { type: string; }) => item.type === 'Phone')
                    .map((phone: { _id: any; exists: any; }) => ({
                        ...phone,
                        id: phone._id,
                        exists: phone.exists || false,
                    }));

                const loadedBatteries = items
                    .filter((item: { type: string; }) => item.type === 'Battery')
                    .map((battery: { _id: any; exists: any; }) => ({
                        ...battery,
                        id: battery._id,
                        exists: battery.exists || false,
                    }));

                setVehicles(loadedVehicles);
                setPhones(loadedPhones);
                setBatteries(loadedBatteries);
            } else {
                setButtonText("Save"); // La liste est vide, passer à "Save"
            }
        } catch (error) {
            console.error('Error loading items:', error);
        }
    };



    const createItems = async () => {
        const consolidatedItems = consolidateInventoryItems();

        try {
            setLoading(true);
            await axios.post(
                `${AppURL}/api/inventory/create?dsp_code=${user?.dsp_code}`,
                consolidatedItems,
                { headers: { 'Content-Type': 'application/json' } }
            );
            Alert.alert('Success', 'Items created successfully!');
            await loadItems(); // Recharger les données après la création
        } catch (error) {
            console.error('Error creating items:', error);
            Alert.alert('Error', 'Failed to create items. Please try again.');
        } finally {
            setLoading(false);
        }
    };




    const updateItems = async () => {
        const consolidatedItems = consolidateInventoryItems(); // Gather all items without altering the structure

        try {
            setLoading(true);
            // Send the consolidated items without changing their structure
            const response = await axios.put(
                `${AppURL}/api/inventory/update?dsp_code=${user?.dsp_code}`,
                consolidatedItems,
                { headers: { 'Content-Type': 'application/json' } }
            );
            // Reload items without altering their structure
            await loadItems();
            Alert.alert('Success', 'Items updated successfully!');
            window.alert('Items updated successfully!');
        } catch (error) {
            console.error('Error updating items:', error);
            Alert.alert('Error', 'Failed to update items. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const deleteItems = async () => {
        const confirmationMessage =
            user?.language === 'English'
                ? 'Are you sure you want to delete all items?'
                : 'Êtes-vous sûr de vouloir supprimer tous les articles ?';

        const confirmation = Platform.OS === 'web'
            ? window.confirm(confirmationMessage)
            : await new Promise((resolve) => {
                Alert.alert(
                    user?.language === 'English' ? 'Confirmation' : 'Confirmation',
                    confirmationMessage,
                    [
                        {
                            text: user?.language === 'English' ? 'Cancel' : 'Annuler',
                            onPress: () => resolve(false),
                            style: 'cancel',
                        },
                        {
                            text: user?.language === 'English' ? 'OK' : 'D\'accord',
                            onPress: () => resolve(true),
                        },
                    ]
                );
            });

        if (!confirmation) return;

        try {
            setLoading(true); // Indique que les données sont en cours de suppression
            const response = await axios.delete(`${AppURL}/api/inventory/`, {
                params: {
                    dsp_code: user?.dsp_code, // Ajout de dsp_code
                },
            });

            if (response.data) {
                Alert.alert(
                    user?.language === 'English' ? 'Success' : 'Succès',
                    user?.language === 'English'
                        ? 'All items deleted successfully!'
                        : 'Tous les articles ont été supprimés avec succès !'
                );
                setInventoryItems([]); // Réinitialise l'état local
            }
        } catch (error) {
            console.error('Error deleting items:', error);
            Alert.alert(
                user?.language === 'English' ? 'Error' : 'Erreur',
                user?.language === 'English'
                    ? 'Failed to delete items. Please try again.'
                    : 'Échec de la suppression des articles. Veuillez réessayer.'
            );
        } finally {
            setLoading(false); // Stop loading
        }
    };





    const generatePDF = async () => {
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        console.log(date);
        

        const cleanedData = {
            vehicles: cleanData(vehicles),
            phones: cleanData(phones.map(phone => ({ ...phone, comment: phone.comment || '' }))),
            batteries: cleanData(batteries.map(battery => ({ ...battery, comment: battery.comment || '' }))),
            userName: `${user?.name} ${user?.familyName}`,
            date
        };

        if (Platform.OS === 'web') {
            try {
                const response = await fetch(`${AppURL}/api/download/generate-pdf?dsp_code=${user?.dsp_code}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cleanedData), // Use cleaned data
                });

                if (!response.ok) {
                    throw new Error('Error generating PDF on backend');
                }

                // Parse response and trigger download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `Inventory for ${date}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error generating or downloading PDF:', error);
                Alert.alert('Error', 'Failed to generate PDF.');
            }
        }
        if (Platform.OS !== 'web') {
            try {
                const response = await fetch(`${AppURL}/api/download/generate-pdf?dsp_code=${user?.dsp_code}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cleanedData), // Use cleaned data
                });

                if (!response.ok) {
                    throw new Error('Error generating PDF on backend');
                }

                // Create a local path for the file
                const pdfBlob = await response.blob();
                const pdfPath = `${FileSystem.documentDirectory}Inventory for ${date}.pdf`;

                // Save the blob as a file
                const reader = new FileReader();
                reader.onloadend = async () => {
                    if (typeof reader.result === 'string' && reader.result) {
                        const base64data = reader.result.split(',')[1]; // Extract base64 string
                        await FileSystem.writeAsStringAsync(pdfPath, base64data, {
                            encoding: FileSystem.EncodingType.Base64,
                        });

                        // Share the PDF
                        await Sharing.shareAsync(pdfPath);
                    } else {
                        throw new Error('Failed to read PDF blob as base64');
                    }
                };

                reader.onerror = (error) => {
                    console.error('FileReader error:', error);
                    Alert.alert('Error', 'Failed to read the file.');
                };

                // Read the blob as a base64 string
                reader.readAsDataURL(pdfBlob);
            } catch (error) {
                console.error('Error generating or downloading PDF:', error);
                Alert.alert('Error', 'Failed to generate PDF.');
            }
        }


    };


    const cleanData = (data: Vehicle[] | Phone[]) => {
        return JSON.parse(JSON.stringify(data, (key, value) => {
            // Exclude React-specific properties and other non-serializable fields
            if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
                return undefined;
            }
            return value;
        }));
    };





    const clearData = async () => {
        setLoading(true); // Start loading

        // Reset all states
        setVehicles([]);
        setPhones([]);
        setBatteries([]);
        await deleteItems();
        loadItems();

        // Re-fetch data based on the active tab
        if (activeTab === 'VEHICLES') {
            await fetchVehicles();
        } else if (activeTab === 'PHONES') {
            await fetchPhones();
        } else if (activeTab === 'BATTERIES') {
            await fetchBatteries();
        }

        setResetCounter((prev) => prev + 1); // Force re-render
        setLoading(false); // Stop loading
    };







    return (
        <View style={styles.container}>
            <View style={styles.tabContainer}>
                {['VEHICLES', 'PHONES', 'BATTERIES'].map((tab) => (
                    <Pressable
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab as 'VEHICLES' | 'PHONES' | 'BATTERIES')}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                    </Pressable>
                ))}
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh} // Appelle la fonction de rafraîchissement
                        colors={['#001933']} // Couleur de l'indicateur (Android)
                        tintColor="#001933" // Couleur de l'indicateur (iOS)
                    />
                }
            >


                {/* Render Vehicles */}
                {activeTab === 'VEHICLES' &&
                    vehicles.map((vehicle) => (
                        <View key={vehicle.id} style={styles.itemContainer}>
                            <View style={styles.rowWithCheck}>
                                <Text style={styles.itemName}>{vehicle.name}</Text>
                                {vehicle.status !== '' && (
                                    <Text style={styles.checkmark}>✔</Text>
                                )}
                            </View>
                            <View style={styles.checkboxRow}>
                                {['key', 'shellCard', 'paper', 'cable'].map((field) => (
                                    <View key={field} style={styles.checkboxContainer}>
                                        <Text style={styles.checkboxLabel}>{field}</Text>
                                        <CustomCheckbox
                                            value={vehicle[field as keyof Vehicle] as boolean}
                                            onValueChange={() =>
                                                toggleCheckbox(vehicles, setVehicles, vehicle.id, field as keyof Vehicle)
                                            }
                                        />
                                    </View>
                                ))}
                            </View>
                            <Pressable
                                style={styles.statusButton}
                                onPress={() => openStatusModal(vehicle.id, 'VEHICLE')}
                            >
                                <Text style={styles.statusButtonText}>{vehicle.status || 'Status'}</Text>
                            </Pressable>
                        </View>
                    ))}

                {/* Render Phones */}
                {activeTab === 'PHONES' &&
                    phones.map((phone) => (
                        <View key={phone.id} style={styles.itemContainer}>
                            <View style={styles.rowWithCheck}>
                                <Text style={styles.itemName}>{phone.name}</Text>
                                {phone.status !== '' && (
                                    <Text style={styles.checkmark}>✔</Text>
                                )}
                            </View>
                            <CustomCheckbox
                                value={phone.exists}
                                onValueChange={() => toggleCheckbox(phones, setPhones, phone.id, 'exists')}
                            />
                            <Pressable
                                style={styles.statusButton}
                                onPress={() => openStatusModal(phone.id, 'PHONE')}
                            >
                                <Text style={styles.statusButtonText}>{phone.status || 'Status'}</Text>
                            </Pressable>
                        </View>
                    ))}

                {/* Render Batteries */}
                {activeTab === 'BATTERIES' &&
                    batteries.map((battery) => (
                        <View key={battery.id} style={styles.itemContainer}>
                            <View style={styles.rowWithCheck}>
                                <Text style={styles.itemName}>{battery.name}</Text>
                                {battery.status !== '' && (
                                    <Text style={styles.checkmark}>✔</Text>
                                )}
                            </View>
                            <CustomCheckbox
                                value={battery.exists}
                                onValueChange={() => toggleCheckbox(batteries, setBatteries, battery.id, 'exists')}
                            />
                            <Pressable
                                style={styles.statusButton}
                                onPress={() => openStatusModal(battery.id, 'BATTERY')}
                            >
                                <Text style={styles.statusButtonText}>{battery.status || 'Status'}</Text>
                            </Pressable>
                        </View>
                    ))}
            </ScrollView>



            <View style={styles.bottomButtons}>
                <Pressable
                    style={styles.saveButton}
                    onPress={buttonText === "Save" ? createItems : updateItems}
                >
                    <Text style={styles.buttonText}>
                        {user?.language === 'English' ? buttonText : (buttonText === 'Save' ? 'Sauvegarder' : 'Mettre à jour')}
                    </Text>
                </Pressable>

                <Pressable style={styles.downloadButton} onPress={generatePDF}>
                    <Text style={styles.buttonText}>
                        {user?.language === 'English' ? 'PDF' : 'PDF'}
                    </Text>
                </Pressable>

                <Pressable
                    style={[styles.clearButton, loading && styles.disabledButton]}
                    onPress={loading ? null : clearData}
                >
                    <Text style={styles.buttonText}>
                        {user?.language === 'English' ? (loading ? 'Clearing...' : 'Clear') : (loading ? 'Effacement...' : 'Effacer')}
                    </Text>
                </Pressable>
                {Platform.OS === "web" && (
                    <Pressable
                        style={[styles.refreshButton, refreshing && styles.disabledButton]}
                        onPress={refreshing ? null : onRefresh}
                    >
                        <Text style={styles.buttonText}>
                            {user?.language === 'English' ? 'Refresh' : 'Rafraîchir'}
                        </Text>
                    </Pressable>

                )}

            </View>


            {selectedItem && (
                <Modal visible transparent animationType="slide">
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>
                                {user?.language === 'English' ? 'Select Status' : 'Sélectionner le statut'}
                            </Text>
                            {statusOptions.map((status) => (
                                <Pressable
                                    key={status}
                                    style={styles.statusOption}
                                    onPress={() => handleStatusSelect(status)}
                                >
                                    <Text style={styles.statusText}>{status}</Text>
                                </Pressable>
                            ))}
                            <Pressable
                                style={styles.closeButton}
                                onPress={() => setSelectedItem(null)}
                            >
                                <Text style={styles.closeButtonText}>
                                    {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
};

export default Inventory;

const styles = StyleSheet.create({
    refreshButton: {
        flex: 1,
        marginHorizontal: 8,
        padding: 12,
        backgroundColor: '#007ACC', // Couleur bleue pour le bouton Refresh
        borderRadius: 6,
        alignItems: 'center',
    },

    disabledButton: {
        backgroundColor: '#CCC', // Light gray to indicate disabled
    },

    bottomButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    saveButton: {
        flex: 1,
        marginRight: 8,
        padding: 12,
        backgroundColor: '#001933',
        borderRadius: 6,
        alignItems: 'center',
    },
    downloadButton: {
        flex: 1,
        marginLeft: 8,
        padding: 12,
        backgroundColor: 'green',
        borderRadius: 6,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    clearButton: {
        flex: 1,
        marginLeft: 8,
        padding: 12,
        backgroundColor: 'red', // A red color to signify "clear" or "reset"
        borderRadius: 6,
        alignItems: 'center',
    },


    rowWithCheck: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    checkmark: {
        fontSize: 18,
        color: '#001933', // Green checkmark color
        fontWeight: 'bold',
        marginLeft: -20, // Moves the checkmark slightly to the left
    },
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10, // Reduced padding
        backgroundColor: '#F9F9F9',
    },
    activeTab: {
        backgroundColor: '#001933',
    },
    tabText: {
        fontSize: 14, // Slightly smaller text
        color: '#001933',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    content: {
        padding: 12, // Reduced padding
    },
    itemContainer: {
        marginBottom: 12, // Reduced margin
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        padding: 12, // Reduced padding
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    itemName: {
        fontSize: 16, // Slightly smaller text
        fontWeight: '600',
        color: '#333333',
        marginBottom: 6, // Reduced margin
    },
    checkboxRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    checkboxContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        marginVertical: 6, // Reduced margin
        width: '22%',
    },
    checkboxLabel: {
        fontSize: 12, // Reduced label size
        color: '#757575',
        marginBottom: 4,
    },
    checkbox: {
        width: 20, // Reduced size
        height: 20,
        borderWidth: 2,
        borderColor: '#CCCCCC',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    checkboxChecked: {
        backgroundColor: '#001933',
        borderColor: '#001933',
    },
    checkboxUnchecked: {
        backgroundColor: '#FFFFFF',
    },
    checkboxMark: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    statusButton: {
        marginTop: 10, // Reduced margin
        paddingVertical: 10, // Reduced padding
        backgroundColor: '#001933',
        borderRadius: 6,
        alignItems: 'center',
    },
    statusButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14, // Slightly smaller font
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#FFFFFF',
        padding: 20, // Reduced padding
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    modalTitle: {
        fontSize: 18, // Slightly smaller font
        fontWeight: '600',
        marginBottom: 12, // Reduced margin
    },
    statusOption: {
        width: '100%',
        paddingVertical: 10, // Reduced padding
        backgroundColor: '#F1F1F1',
        borderRadius: 6,
        marginBottom: 8,
        alignItems: 'center',
    },
    statusText: {
        fontSize: 14, // Slightly smaller font
        color: '#333333',
    },
    closeButton: {
        marginTop: 12, // Reduced margin
        paddingVertical: 10, // Reduced padding
        width: '100%',
        backgroundColor: '#CCCCCC',
        borderRadius: 6,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 14, // Slightly smaller font
        color: '#FFFFFF',
        fontWeight: '600',
    },
});
