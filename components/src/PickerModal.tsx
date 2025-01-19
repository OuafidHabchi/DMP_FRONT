import React, { useState } from 'react';
import { Platform, View, Text, Modal, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface PickerModalProps {
  title: string; // Placeholder title
  options: { label: string; value: string }[]; // Options for the picker
  selectedValue: string; // Currently selected value
  onValueChange: (value: string) => void; // Callback for value change
  style?: { container?: object; picker?: object; input?: object }; // Custom styles for container, picker, and input
}

const PickerModal: React.FC<PickerModalProps> = ({
  title,
  options,
  selectedValue,
  onValueChange,
  style = {}, // Default empty object for custom styles
}) => {
  const [isModalVisible, setModalVisible] = useState(false);

  const handleOptionSelect = (value: string) => {
    onValueChange(value);
    setModalVisible(false); // Close modal after selection
  };

  const allOptions = [{ label: title, value: '' }, ...options];

  return (
    <View style={[styles.container, style.container]}>
      {Platform.OS === 'web' ? (
        <Picker
          selectedValue={selectedValue}
          style={[styles.picker, style.picker]} // Allow overriding styles
          onValueChange={(value) => onValueChange(value)}
        >
          {allOptions.map((option, index) => (
            <Picker.Item
              key={option.value || `fallback-key-${index}`} // Ensure unique key
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.input, style.input]} // Allow overriding input styles
            onPress={() => setModalVisible(true)}
          >
            <Text style={{ color: selectedValue ? '#000' : '#888' }}>
              {selectedValue
                ? allOptions.find((option) => option.value === selectedValue)?.label
                : title}
            </Text>
          </TouchableOpacity>

          <Modal visible={isModalVisible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>{title}</Text>
                <FlatList
                  data={allOptions}
                  keyExtractor={(item, index) => item.value || `list-key-${index}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => handleOptionSelect(item.value)}
                    >
                      <Text style={styles.modalOptionText}>{item.label}</Text>
                    </TouchableOpacity>
                  )}
                  style={styles.listContainer}
                />
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCloseButtonText}>
                    {Platform.OS === 'ios' ? 'Close' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  picker: {
    height: 50,
    borderWidth: 1,
    borderColor: '#001933',
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#001933',
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  listContainer: {
    width: '100%',
    maxHeight: 200,
  },
  modalOption: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  modalOptionText: {
    fontSize: 16,
  },
  modalCloseButton: {
    marginTop: 16,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#001933',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default PickerModal;
