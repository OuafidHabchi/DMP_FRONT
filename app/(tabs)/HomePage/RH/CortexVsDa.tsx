import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, Platform, FlatList, Modal, Dimensions } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { Image } from "react-native";
import AppURL from "@/components/src/URL";

// Define the type User
type User = {
  _id: string;
  name: string;
  familyName: string;
  tel: string;
  email: string;
  password: string;
  role: string;
  scoreCard: string;
  focusArea: string;
  language: string;
  dsp_code: string;
};

type TimeCard = {
  CortexDureeFormatted: string;
  _id: string;
  employeeId: string;
  day: string;
  startTime: string | null;
  endTime: string | null;
  CortexEndTime: string | null;
  CortexDuree: string | null;
  startTimeMs?: number | null; // Ajouté
  endTimeMs?: number | null; // Ajouté
  durationDifference?: string | null; // Ajouté
  endTimeDifference?: string | null; // Ajouté
  image?: string;
};


type Employee = {
  _id: string;
  name: string;
  familyName: string;
};
interface Comment {
  _id: string;
  text: string;
}
const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

const CortexVsDa: React.FC = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };
  const [loading, setLoading] = useState<boolean>(true);
  const [timeCards, setTimeCards] = useState<TimeCard[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [comments, setComments] = useState<Record<string, string>>({}); // Stocker les commentaires
  const [selectedComment, setSelectedComment] = useState<string | null>(null); // Stocker le commentaire sélectionné
  const [isCommentModalVisible, setIsCommentModalVisible] = useState<boolean>(false); // Contrôle de la modale
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Pour stocker l'image sélectionnée
  const [isImageModalVisible, setIsImageModalVisible] = useState<boolean>(false); // Pour afficher ou masquer le modal

  const handleLongPressEmployee = async (employeeId: string) => {
    const timeCard = timeCards.find((tc) => tc.employeeId === employeeId);
    if (timeCard?.image) {
      setSelectedImage(`${AppURL}/uploads-timecard${timeCard.image}`);
      setIsImageModalVisible(true);
    } else {
      const messageTitle =
        user.language === "English" ? "No image available" : "Aucune image disponible";
      const messageBody =
        user.language === "English"
          ? "This time card does not have an associated image."
          : "Cette fiche de temps n'a pas d'image associée.";
  
      if (Platform.OS === "web") {
        window.alert(`${messageTitle}\n${messageBody}`);
      } else {
        Alert.alert(messageTitle, messageBody);
      }
    }
  };
  
  const parseTimeToMilliseconds = (time: string | null): number | null => {
    if (!time) return null;
    const [hours, minutes] = time.split(":").map(Number);
    return (hours * 60 + minutes) * 60 * 1000;
  };

  const formatCortexDuration = (duration: string | null): string => {
    if (!duration) return "N/A";
    const [hours, minutes] = duration.split(":").map(Number);
    return `${hours}h ${minutes}m`;
  };


  const formatDifference = (difference: number | null): string => {
    if (difference === null) return "N/A";

    const isPositive = difference > 0; // Si différence positive (Plan > Employé)
    const absDifference = Math.abs(difference);
    const hours = Math.floor(absDifference / (1000 * 60 * 60));
    const minutes = Math.floor((absDifference % (1000 * 60 * 60)) / (1000 * 60));

    const formattedDiff = `${hours > 0 ? `${hours}h ` : ""}${minutes}min`;
    return isPositive ? `+${formattedDiff}` : `-${formattedDiff}`;
  };

  const fetchCommentsByDate = async () => {
    try {
      const formattedDate = formatDate(date); // Formater la date actuelle

      const response = await axios.get(
        `${AppURL}/api/comments/date/${encodeURIComponent(formattedDate)}?dsp_code=${user.dsp_code}`
      );
      console.log(response);


      const commentsMap = response.data.reduce((acc: Record<string, string>, comment: any) => {
        acc[comment.idEmploye] = comment.comment; // Utilisez `comment.comment` au lieu de `comment.text`
        return acc;
      }, {});


      setComments(commentsMap); // Mettre à jour l'état local

    } catch (error) {
    }
  };



  const fetchData = async (selectedDate: Date) => {
    setLoading(true);
    try {
      const formattedDate = formatDate(selectedDate);
      const timeCardsRes = await axios.get<TimeCard[]>(
        `${AppURL}/api/timecards/timecardsss/dday/${formattedDate}?dsp_code=${user.dsp_code}`
      );
      const rawTimeCards = timeCardsRes.data;

      const employeeIds = [...new Set(rawTimeCards.map((tc) => tc.employeeId))];
      const employeeRes = await axios.post<Employee[]>(
        `${AppURL}/api/employee/by-ids?dsp_code=${user.dsp_code}`,
        { ids: employeeIds }
      );

      const employeesMap = employeeRes.data.reduce((acc, emp) => {
        acc[emp._id] = emp;
        return acc;
      }, {} as Record<string, Employee>);

      const timeCards = rawTimeCards.map((tc) => {
        const startTimeMs = parseTimeToMilliseconds(tc.startTime) ?? null;
        const endTimeMs = parseTimeToMilliseconds(tc.endTime) ?? null;
        const cortexEndTimeMs = parseTimeToMilliseconds(tc.CortexEndTime) ?? null;
        const cortexDurationMs = parseTimeToMilliseconds(tc.CortexDuree) ?? null;

        const workDurationMs =
          startTimeMs !== null && endTimeMs !== null ? endTimeMs - startTimeMs - 30 * 60 * 1000 : null;

        const durationDifference =
          workDurationMs !== null && cortexDurationMs !== null
            ? cortexDurationMs - workDurationMs // Plan - Employé
            : null;

        const endTimeDifference =
          endTimeMs !== null && cortexEndTimeMs !== null
            ? cortexEndTimeMs - endTimeMs // Plan - Employé
            : null;

        return {
          ...tc,
          startTimeMs,
          endTimeMs,
          CortexDureeFormatted: formatCortexDuration(tc.CortexDuree),
          durationDifference: durationDifference !== null ? formatDifference(durationDifference) : "N/A",
          endTimeDifference: endTimeDifference !== null ? formatDifference(endTimeDifference) : "N/A",
        };
      });
      setTimeCards(timeCards);
      setEmployees(employeesMap);
    } catch (error) {
      setTimeCards([]);
      setEmployees({});
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData(date);
    fetchCommentsByDate(); // Appeler la récupération des commentaires
  }, [date]);


  const formatDate = (date: Date): string => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthsOfYear = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${daysOfWeek[date.getDay()]} ${monthsOfYear[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")} ${date.getFullYear()}`;
  };

  const handleDateChange = (selectedDate?: Date) => {
    if (selectedDate) {
      setDate(selectedDate);
      fetchData(selectedDate);
    }
  };

  const calculateWorkDuration = (startTime: number | null, endTime: number | null): string => {
    if (startTime === null || endTime === null) return "N/A";

    // Soustraire 30 minutes (30 * 60 * 1000 ms) du calcul de la durée
    const diffMs = endTime - startTime - 30 * 60 * 1000;

    if (diffMs < 0) return "Invalid Time";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };


  const getColorForDifference = (difference: number | null): string => {
    if (difference === null) return "#001933"; // Bleu par défaut
    const diffInMinutes = Math.abs(difference / 1000 / 60);

    if (difference > 0) {
      // Cas positif (Plan > Employé)
      return "#32CD32"; // Vert
    } else {
      // Cas négatif (Plan < Employé)
      if (diffInMinutes > 60) return "#FF0000"; // Rouge pour grande différence
      if (diffInMinutes > 30) return "#FFA500"; // Orange pour différence modérée
      return "#001933"; // Bleu par défaut
    }
  };




  const renderEmployee = ({ item }: { item: TimeCard }) => {
    const employee = employees[item.employeeId];

    const durationDiffMs = item.durationDifference
      ? parseFloat(item.durationDifference.replace(/[^0-9.-]+/g, "")) * 60 * 1000
      : null;
    const endTimeDiffMs = item.endTimeDifference
      ? parseFloat(item.endTimeDifference.replace(/[^0-9.-]+/g, "")) * 60 * 1000
      : null;

    let pressTimer: NodeJS.Timeout; // Timer pour simuler un appui long sur le web

    const handleMouseDown = () => {
      // Démarrer un timer pour simuler un appui long
      pressTimer = setTimeout(() => {
        handleLongPressEmployee(item.employeeId); // Appeler l'action pour un appui long
      }, 500); // Délai pour l'appui long
    };

    const handleMouseUp = () => {
      // Annuler le timer si l'utilisateur relâche avant la fin
      clearTimeout(pressTimer);
    };

    const handleMouseLeave = () => {
      // Annuler le timer si l'utilisateur déplace la souris avant la fin
      clearTimeout(pressTimer);
    };

    return (
      <View style={styles.row}>
        <Text
          style={[
            styles.employeeName,
            comments[item.employeeId] ? styles.employeeWithComment : {}, // Ajouter un style si un commentaire existe
          ]}
          onPress={() => {
            if (comments[item.employeeId]) {
              setSelectedComment(comments[item.employeeId]); // Stocker le commentaire sélectionné
              setIsCommentModalVisible(true); // Afficher la modale
            }
          }}
          {...(Platform.OS === "web"
            ? {
              onMouseDown: handleMouseDown, // Gérer le clic maintenu sur le web
              onMouseUp: handleMouseUp, // Gérer la fin du clic maintenu
              onMouseLeave: handleMouseLeave, // Gérer le déplacement de la souris
            }
            : {
              onLongPress: () => handleLongPressEmployee(item.employeeId), // Action native pour mobile
            })}
        >
          {employee ? `${employee.name} ${employee.familyName}` : "Unknown"}
        </Text>

        <Text style={styles.workDuration}>
          {calculateWorkDuration(item.startTimeMs ?? null, item.endTimeMs ?? null)}
        </Text>
        <Text style={styles.cortexDuration}>{item.CortexDureeFormatted || "N/A"}</Text>
        <Text style={{ ...styles.difference, color: getColorForDifference(durationDiffMs) }}>
          {item.durationDifference}
        </Text>
        <Text style={styles.time}>{item.endTime || "N/A"}</Text>
        <Text style={styles.time}>{item.CortexEndTime || "N/A"}</Text>
        <Text style={{ ...styles.difference, color: getColorForDifference(endTimeDiffMs) }}>
          {item.endTimeDifference}
        </Text>
      </View>
    );
  };





  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#001933" />
        <Text style={styles.loadingText}>
          {user.language === 'English' ? 'Loading data...' : 'Chargement des données...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.datePickerContainer}>
        {Platform.OS === "web" ? (
          <input
            type="date"
            value={date.toISOString().split("T")[0]}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => {
              const selectedDate = e.target.value;
              const [year, month, day] = selectedDate.split("-").map(Number);
              const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
              handleDateChange(localDate);
            }}
            style={styles.webDatePicker}
          />
        ) : (
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {user.language === 'English' ? `Selected Date: ${formatDate(date)}` : `Date sélectionnée : ${formatDate(date)}`}
            </Text>
            <MaterialIcons name="calendar-today" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        {showDatePicker && Platform.OS !== "web" && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              handleDateChange(selectedDate || date);
            }}
            maximumDate={new Date()}
          />
        )}
      </View>

      <FlatList
        data={timeCards}
        keyExtractor={(item) => item._id}
        renderItem={renderEmployee}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={styles.headerText}>
              {user.language === 'English' ? 'Employee' : 'Employé'}
            </Text>
            <Text style={styles.headerText}>
              {user.language === 'English' ? 'Work Duration' : 'Durée de travail'}
            </Text>
            <Text style={styles.headerText}>
              {user.language === 'English' ? 'Cortex Duration' : 'Durée Cortex'}
            </Text>
            <Text style={styles.headerText}>
              {user.language === 'English'
                ? Platform.OS === 'web' ? 'Duration Difference' : 'Duration Diff'
                : Platform.OS === 'web' ? 'Différence de durée' : 'Diff. durée'}
            </Text>
            <Text style={styles.headerText}>
              {user.language === 'English' ? 'End Time' : 'Heure de fin'}
            </Text>
            <Text style={styles.headerText}>
              {user.language === 'English' ? 'Cortex End Time' : 'Heure de fin Cortex'}
            </Text>
            <Text style={styles.headerText}>
              {user.language === 'English'
                ? Platform.OS === 'web' ? 'End Time Difference' : 'End Time Diff'
                : Platform.OS === 'web' ? 'Différence de l’heure de fin' : 'Diff. fin'}
            </Text>
          </View>
        }
      />
      {isCommentModalVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isCommentModalVisible}
          onRequestClose={() => setIsCommentModalVisible(false)} // Fermer la modale
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {user.language === "English" ? "Comment" : "Commentaire"}
              </Text>
              <Text style={styles.modalComment}>
                {selectedComment || (user.language === "English" ? "No comment found." : "Aucun commentaire trouvé.")}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsCommentModalVisible(false)} // Fermer la modale
              >
                <Text style={styles.closeButtonText}>
                  {user.language === "English" ? "Close" : "Fermer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {isImageModalVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isImageModalVisible}
          onRequestClose={() => setIsImageModalVisible(false)} // Fermer le modal
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.imagePreview}
                  resizeMode="contain" // Permet d'afficher l'image sans zoom ni modification
                />
              ) : (
                <Text style={styles.noImageText}>
                  {user.language === "English" ? "No image available" : "Aucune image disponible"}
                </Text>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsImageModalVisible(false)} // Fermer le modal
              >
                <Text style={styles.closeButtonText}>
                  {user.language === "English" ? "Close" : "Fermer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}



    </View>
  );
};

export default CortexVsDa;

const styles = StyleSheet.create({

  imagePreview: {
    width: Platform.OS === "web" ? "50%" : screenWidth * 0.9,
    height: Platform.OS === "web" ? screenHeight * 0.7 : screenHeight * 0.7,
    borderRadius: 10,
    marginBottom: 20,
    alignSelf: "center",
  } ,
  noImageText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginTop: 20,
  },

  employeeWithComment: {
    textDecorationLine: "underline", // Souligner les noms avec des commentaires
    color: "#007BFF", // Couleur distincte
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Fond semi-transparent
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalComment: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  closeButton: {
    backgroundColor: "#001933",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  time: {
    flex: 1,
    fontSize: 14,
    textAlign: "center",
    color: "#001933",
  },
  difference: {
    flex: 1,
    fontSize: 14,
    textAlign: "center",
    color: "#FF5733",

  },

  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FAFAFA",
  },
  datePickerContainer: {
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#001933",
    borderRadius: 8,
    backgroundColor: "#FFF",
    padding: 8,
  },
  webDatePicker: {
    width: "98%",
    padding: 10,
    fontSize: 16,
    borderColor: "#001933",
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    fontFamily: "Arial",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#001933",
    borderRadius: 8,
    marginBottom: 20,
  },
  dateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#EAEAEA",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    color: "#001933",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 5,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  employeeName: {
    flex: 1,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "bold",
    color: "#001933",
  },
  workDuration: {
    flex: 1,
    fontSize: 14,
    textAlign: "center",
    color: "#001933",
  },
  cortexDuration: {
    flex: 1,
    fontSize: 14,
    textAlign: "center",
    color: "#001933",

  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#001933",
  },
});
