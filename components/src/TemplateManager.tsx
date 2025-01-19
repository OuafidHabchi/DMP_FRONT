import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    ScrollView,
    StyleSheet,
    Pressable,
    Alert,
} from 'react-native';
import PickerModal from '@/components/src/PickerModal';
import axios from 'axios';
import AppURL from './URL';


// Définir le type Template
type Template = {
    _id:string;
    type: string;
    raison: string;
    description: string;
    severity: string;
    link: string;
};

type TemplateManagerProps = {
    isVisible: boolean;
    onClose: () => void;
    dsp_code: string;
    language: string;
};

const TemplateManager: React.FC<TemplateManagerProps> = ({ isVisible, onClose, dsp_code, language }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [newTemplate, setNewTemplate] = useState<Template | null>(null);



    const fetchTemplates = async () => {
        try {
            const response = await axios.get(`${AppURL}/api/warnings/wornings/templates/get?dsp_code=${dsp_code}`);
            setTemplates(response.data);
        } catch (error) {
            console.error('Error fetching templates:', error);
            Alert.alert('Erreur', 'Impossible de récupérer les modèles.');
        }
    };

    useEffect(() => {
        if (isVisible) {
            fetchTemplates();
        }
    }, [isVisible]);
    

    // Ajouter un nouveau modèle
    const addTemplate = async () => {
        if (
            newTemplate &&
            newTemplate.type &&
            newTemplate.raison &&
            newTemplate.description &&
            newTemplate.severity
        ) {
            try {
                // Add the "template" attribute to the newTemplate object
                const templateData = { ...newTemplate, template: true };

                const response = await axios.post(
                    `${AppURL}/api/warnings/wornings?dsp_code=${dsp_code}`,
                    templateData
                );
                if (response.data) {
                    setTemplates((prev) => [...prev, response.data]);
                    setNewTemplate(null);
                    setShowCreateModal(false);
                }
            } catch (error) {
                console.error('Error creating template:', error);
                Alert.alert('Erreur', 'Impossible de créer le modèle.');
            }
        } else {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs requis.');
        }
    };


    // Mettre à jour un modèle existant
    const updateTemplate = async () => {
        if (selectedTemplate && selectedTemplate._id) {
            try {
                const response = await axios.put(
                    `${AppURL}/api/warnings/wornings/${selectedTemplate._id}?dsp_code=${dsp_code}`,
                    selectedTemplate
                );
                if (response.data) {
                    console.log("Update successful:", response.data);
                    setTemplates((prev) =>
                        prev.map((template) =>
                            template._id === selectedTemplate._id ? response.data : template
                        )
                    );
                    setSelectedTemplate(null);
                    setShowEditModal(false);
                }
            } catch (error) {
                console.error('Error updating template:', error);
                Alert.alert(
                    'Erreur',
                    "Erreur lors de la mise à jour du modèle. Veuillez réessayer."
                );
            }
        } else {
            Alert.alert(
                'Erreur',
                'Modèle sélectionné invalide ou ID manquant. Veuillez réessayer.'
            );
        }
    };
    


    // Supprimer un modèle
    const deleteTemplate = async () => {
        if (selectedTemplate) {
            try {
                await axios.delete(
                    `${AppURL}/api/warnings/wornings/${selectedTemplate._id}?dsp_code=${dsp_code}`
                );
                setTemplates((prev) =>
                    prev.filter((template) => template._id !== selectedTemplate._id)
                );
                setSelectedTemplate(null);
                setShowDeleteModal(false);
            } catch (error) {
                console.error('Error deleting template:', error);
                Alert.alert('Erreur', 'Impossible de supprimer le modèle.');
            }
        }
    };


    return (
        <Modal visible={isVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <Text style={styles.title}>Gérer les modèles</Text>

                        {/* Liste des modèles */}
                        {templates.map((template) => (
                            <TouchableOpacity
                                key={template._id}
                                style={styles.templateItem}
                                onPress={() => {
                                    setSelectedTemplate(template);
                                    setShowEditModal(true);
                                }}
                                onLongPress={() => {
                                    setSelectedTemplate(template);
                                    setShowDeleteModal(true);
                                }}
                            >
                                <Text style={styles.templateType}>{template.raison}</Text>
                                <Text style={styles.templateraison}>{template.type}</Text>
                            </TouchableOpacity>
                        ))}

                        {/* Bouton Fermer */}
                        <Pressable style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.buttonText}>Fermer</Text>
                        </Pressable>
                    </ScrollView>

                    {/* Bouton Ajouter */}
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            setNewTemplate({
                                _id: '',
                                type: '',
                                raison: '',
                                description: '',
                                severity: '',
                                link: '',
                            });
                            setShowCreateModal(true);
                        }}
                    >
                        <Text style={styles.addButtonText}>+</Text>
                    </TouchableOpacity>
                </View>

                {/* Modal Créer un modèle */}
                {showCreateModal && newTemplate && (
                    <Modal visible transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <ScrollView contentContainerStyle={styles.scrollContent}>
                                    <Text style={styles.formTitle}>Créer un modèle</Text>

                                    <PickerModal
                                        title="Type"
                                        options={[
                                            { label: 'warning', value: 'warning' },
                                            { label: 'suspension', value: 'suspension' },
                                        ]}
                                        selectedValue={newTemplate?.type || ''}
                                        onValueChange={(value) =>
                                            setNewTemplate((prev) =>
                                                prev ? { ...prev, type: value } : { _id: '', type: value, raison: '', description: '', severity: '', link: '' }
                                            )
                                        }
                                    />

                                    <TextInput
                                        style={styles.input}
                                        placeholder="Raison"
                                        value={newTemplate?.raison || ''}
                                        onChangeText={(text) =>
                                            setNewTemplate((prev) =>
                                                prev ? { ...prev, raison: text } : { _id: '', type: '', raison: text, description: '', severity: '', link: '' }
                                            )
                                        }
                                    />

                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder="Description"
                                        value={newTemplate?.description || ''}
                                        onChangeText={(text) =>
                                            setNewTemplate((prev) =>
                                                prev ? { ...prev, description: text } : { _id: '', type: '', raison: '', description: text, severity: '', link: '' }
                                            )
                                        }
                                    />

                                    <PickerModal
                                        title="Gravité"
                                        options={[
                                            { label: 'Faible', value: 'low' },
                                            { label: 'Moyenne', value: 'medium' },
                                            { label: 'Élevée', value: 'high' },
                                        ]}
                                        selectedValue={newTemplate?.severity || ''}
                                        onValueChange={(value) =>
                                            setNewTemplate((prev) =>
                                                prev ? { ...prev, severity: value } : { _id: '', type: '', raison: '', description: '', severity: value, link: '' }
                                            )
                                        }
                                    />

                                    <TextInput
                                        style={styles.input}
                                        placeholder="Lien (optionnel)"
                                        value={newTemplate?.link || ''}
                                        onChangeText={(text) =>
                                            setNewTemplate((prev) =>
                                                prev ? { ...prev, link: text } : { _id: '', type: '', raison: '', description: '', severity: '', link: text }
                                            )
                                        }
                                    />

                                    <TouchableOpacity style={styles.saveButton} onPress={addTemplate}>
                                        <Text style={styles.buttonText}>Enregistrer</Text>
                                    </TouchableOpacity>

                                    <Pressable
                                        style={styles.closeButton}
                                        onPress={() => setShowCreateModal(false)}
                                    >
                                        <Text style={styles.buttonText}>Annuler</Text>
                                    </Pressable>
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                )}
                {/* Modal for Editing or Deleting a Template */}
                {showEditModal && selectedTemplate && (
                    <Modal visible transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <ScrollView contentContainerStyle={styles.scrollContent}>
                                    <Text style={styles.formTitle}>Modifier le modèle</Text>

                                    <PickerModal
                                        title="Type"
                                        options={[
                                            { label: 'warning', value: 'warning' },
                                            { label: 'suspension', value: 'suspension' },
                                        ]}
                                        selectedValue={selectedTemplate?.type || ''}
                                        onValueChange={(value) =>
                                            setSelectedTemplate((prev) =>
                                                prev ? { ...prev, type: value } : null
                                            )
                                        }
                                    />

                                    <TextInput
                                        style={styles.input}
                                        placeholder="Raison"
                                        value={selectedTemplate?.raison || ''}
                                        onChangeText={(text) =>
                                            setSelectedTemplate((prev) =>
                                                prev ? { ...prev, raison: text } : null
                                            )
                                        }
                                    />

                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder="Description"
                                        value={selectedTemplate?.description || ''}
                                        onChangeText={(text) =>
                                            setSelectedTemplate((prev) =>
                                                prev ? { ...prev, description: text } : null
                                            )
                                        }
                                    />

                                    <PickerModal
                                        title="Gravité"
                                        options={[
                                            { label: 'Faible', value: 'low' },
                                            { label: 'Moyenne', value: 'medium' },
                                            { label: 'Élevée', value: 'high' },
                                        ]}
                                        selectedValue={selectedTemplate?.severity || ''}
                                        onValueChange={(value) =>
                                            setSelectedTemplate((prev) =>
                                                prev ? { ...prev, severity: value } : null
                                            )
                                        }
                                    />

                                    <TextInput
                                        style={styles.input}
                                        placeholder="Lien (optionnel)"
                                        value={selectedTemplate?.link || ''}
                                        onChangeText={(text) =>
                                            setSelectedTemplate((prev) =>
                                                prev ? { ...prev, link: text } : null
                                            )
                                        }
                                    />

                                    <TouchableOpacity style={styles.saveButton} onPress={updateTemplate}>
                                        <Text style={styles.buttonText}>Enregistrer</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.saveButton, { backgroundColor: '#e74c3c' }]}
                                        onPress={deleteTemplate}
                                    >
                                        <Text style={styles.buttonText}>Supprimer</Text>
                                    </TouchableOpacity>

                                    <Pressable
                                        style={styles.closeButton}
                                        onPress={() => setShowEditModal(false)}
                                    >
                                        <Text style={styles.buttonText}>Annuler</Text>
                                    </Pressable>
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                )}

            </View>
        </Modal>

    );
};

export default TemplateManager;

const styles = StyleSheet.create({
    textArea: {
        height: 190,
        textAlignVertical: 'top',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#001933',
    },
    templateItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        marginVertical: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ebedef',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    templateType: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#001933',
    },
    templateraison: {
        fontSize: 14,
        color: '#001933',
    },
    formTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#001933',
    },
    input: {
        height: 50,
        borderColor: '#001933',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#ffffff',
        color: '#2c3e50',
        fontSize: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 1,
    },
    saveButton: {
        backgroundColor: '#001933',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    addButton: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#001933',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
        marginBottom: 50
    },
    addButtonText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    closeButton: {
        backgroundColor: '#7f8c8d',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 1,
    },
});
