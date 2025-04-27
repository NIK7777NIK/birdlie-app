import { useState, useEffect } from "react";
import { SafeAreaView, View, Text, Pressable, TextInput, ScrollView, Dimensions, Switch, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Kalender() {
  const { userName, subName, startMonth, startYear, duration, groupCode, darkMode, monthIndex: passedMonthIndex, year: passedYear } = useLocalSearchParams();
  const router = useRouter();
  const SERVER_URL = "https://birdlie.com:3000";
  const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  
  const startMonthIndex = months.indexOf(startMonth);
  const durationMonths = duration === "2 Monate" ? 2 : 1;
  const endMonthIndex = (startMonthIndex + durationMonths - 1) % 12;
  const endYear = durationMonths === 2 && endMonthIndex < startMonthIndex ? parseInt(startYear) + 1 : parseInt(startYear);

  const windowWidth = Dimensions.get('window').width;
  const calendarHeight = 360;

  const getDaysInMonth = (monthIndex: number, year: number) => {
    if (monthIndex === 1) {
      return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28;
    }
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthIndex];
  };

  const getFirstDayOfMonth = (monthIndex: number, year: number) => {
    const day = new Date(year, monthIndex, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const [monthIndex, setMonthIndex] = useState(passedMonthIndex ? parseInt(passedMonthIndex) : startMonthIndex);
  const [year, setYear] = useState(passedYear ? parseInt(passedYear) : parseInt(startYear));
  const [days, setDays] = useState(
    Array.from({ length: getDaysInMonth(startMonthIndex, parseInt(startYear)) }, () => ({
      status: "none",
      notes: [],
      user: ""
    }))
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [direction, setDirection] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(darkMode === "true");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const storedMode = await AsyncStorage.getItem("darkMode");
      if (storedMode !== null) setIsDarkMode(JSON.parse(storedMode));
      console.log("groupCode beim Laden:", groupCode);
      await fetchCalendarData();
    };
    loadData();
  }, [monthIndex, year]);

  const fetchCalendarData = async () => {
    setIsLoading(true);
    try {
      if (!groupCode) {
        Alert.alert("Fehler", "Kein Gruppencode vorhanden");
        return;
      }
      const response = await fetch(`${SERVER_URL}/group/${groupCode}`);
      const data = await response.json();
      console.log("Server-Daten beim Laden:", data);
      if (response.ok) {
        const calendar = data.calendar || {};
        console.log("Calendar:", calendar);
        const userData = calendar[userName] || { days: [], notes: [] };
        console.log("UserData:", userData);
        const daysInCurrentMonth = getDaysInMonth(monthIndex, year);

        const newDays = Array.from({ length: daysInCurrentMonth }, (_, i) => {
          const day = i + 1;
          const dayData = userData.days.find(d => d.monthIndex === monthIndex && d.day === day) || { status: "none" };
          const allNotes = Object.values(calendar)
            .flatMap((u: any) => u.notes || [])
            .filter((n: any) => n.monthIndex === monthIndex && n.day === day)
            .map((n: any) => ({
              text: n.text,
              timestamp: n.timestamp || new Date().toLocaleString("de-DE"),
              user: n.user || "Unbekannt"
            }));
          
          const uniqueNotes = Array.from(new Map(allNotes.map(note => [`${note.text}-${note.timestamp}-${note.user}`, note])).values());
          
          return {
            status: dayData.status || "none",
            notes: uniqueNotes,
            user: dayData.user || ""
          };
        });
        setDays(newDays);
      } else {
        Alert.alert("Fehler", data.error || "Konnte Kalenderdaten nicht laden");
      }
    } catch (error) {
      Alert.alert("Fehler", "Der Server ist nicht erreichbar. Bitte überprüfe deine Internetverbindung oder versuche es später erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveCalendarData = async (updatedDays) => {
    setIsLoading(true);
    try {
      const daysToSave = updatedDays.map((day, index) => ({
        monthIndex: monthIndex,
        day: index + 1,
        status: day.status,
        user: day.user
      }));

      const notesToSave = updatedDays.flatMap((day, index) =>
        day.notes
          .filter(note => note.user === userName)
          .map(note => ({
            monthIndex: monthIndex,
            day: index + 1,
            text: note.text,
            timestamp: note.timestamp,
            user: note.user
          }))
      );

      console.log("Daten zum Speichern (gesendet):", { days: daysToSave, notes: notesToSave });

      const saveResponse = await fetch(`${SERVER_URL}/update-calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: groupCode,
          userName,
          days: daysToSave,
          notes: notesToSave
        })
      });
      const saveData = await saveResponse.json();
      console.log("Server-Antwort (empfangen):", saveData);
      if (!saveResponse.ok) {
        Alert.alert("Fehler", saveData.error || "Fehler beim Speichern");
      }
    } catch (error) {
      Alert.alert("Fehler", "Der Server ist nicht erreichbar. Bitte überprüfe deine Internetverbindung oder versuche es später erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem("darkMode", JSON.stringify(newMode));
  };

  const statusColors = {
    none: isDarkMode ? "#2D3748" : "#FFFFFF",
    free: isDarkMode ? "#68D391" : "#D1FAE5",
    partial: isDarkMode ? "#F6E05E" : "#FEF3C7"
  };

  const toggleStatus = async (index: number) => {
    console.log("toggleStatus aufgerufen für Index:", index);
    const newDays = [...days];
    const statusCycle = ["none", "free", "partial"];
    const currentStatusIndex = statusCycle.indexOf(newDays[index].status);
    const nextStatus = statusCycle[(currentStatusIndex + 1) % statusCycle.length];
    newDays[index] = {
      ...newDays[index],
      status: nextStatus,
      user: nextStatus === "none" ? "" : userName || "Unbekannt"
    };
    console.log("Vorheriger Status:", days[index].status);
    console.log("Neuer Status für Tag", index + 1, ":", nextStatus);
    console.log("Neuer State (newDays):", newDays[index]);
    setDays(newDays);
    console.log("State nach setDays gesetzt");
    await saveCalendarData(newDays);
  };

  const openNoteModal = (index: number) => {
    setSelectedDayIndex(index);
    setNoteInput("");
    setModalVisible(true);
  };

  const saveNote = () => {
    if (selectedDayIndex !== null && noteInput.trim()) {
      const newDays = [...days];
      const timestamp = new Date().toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      newDays[selectedDayIndex].notes.push({
        text: noteInput,
        timestamp,
        user: userName || "Unbekannt"
      });
      setDays(newDays);
      setNoteInput("");
      saveCalendarData(newDays);
    }
  };

  const deleteNote = (noteIndex: number) => {
    if (selectedDayIndex !== null) {
      const newDays = [...days];
      newDays[selectedDayIndex].notes = newDays[selectedDayIndex].notes.filter((_, i) => i !== noteIndex);
      setDays(newDays);
      saveCalendarData(newDays);
    }
  };

  const handleMonthChange = (dir: "prev" | "next") => {
    const newMonth = (monthIndex + (dir === "next" ? 1 : -1) + 12) % 12;
    const newYear = dir === "prev" && monthIndex === 0 ? year - 1 : dir === "next" && monthIndex === 11 ? year + 1 : year;
    
    if (dir === "prev" && (newYear < parseInt(startYear) || (newYear === parseInt(startYear) && newMonth < startMonthIndex))) return;
    if (dir === "next" && (newYear > endYear || (newYear === endYear && newMonth > endMonthIndex))) return;

    setDirection(dir === "next" ? 1 : -1);
    setMonthIndex(newMonth);
    setYear(newYear);
  };

  const goToÜbersicht = async () => {
    await saveCalendarData(days);
    router.push({
      pathname: "/auswertung",
      params: { 
        startMonth: startMonth,
        startYear: startYear,
        groupCode, 
        darkMode: isDarkMode.toString(), 
        duration, 
        monthIndex: monthIndex.toString(),
        year: year.toString()
      }
    });
  };

  const goToUrlaubsplanung = async () => {
    await saveCalendarData(days);
    console.log("Navigiere zu Urlaubsplanung mit groupCode:", groupCode);
    router.push({
      pathname: "/urlaubsplanung",
      params: { 
        userName: userName || "Unbekannt", 
        subName: subName || "Kein Untername", 
        startMonth: startMonth || "April", 
        startYear: startYear || "2025", 
        duration: duration || "1 Monat", 
        darkMode: isDarkMode.toString(),
        groupCode,
        monthIndex: monthIndex.toString(),
        year: year.toString()
      }
    });
  };

  const firstDayOffset = getFirstDayOfMonth(monthIndex, year);

  const weeks = [];
  let week = Array(firstDayOffset).fill(null);

  days.forEach((day, index) => {
    week.push({ ...day, dayNumber: index + 1 });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  });

  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? "#1A202C" : "#F0F4F8" }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: "900", color: isDarkMode ? "#E2E8F0" : "#1F2937", letterSpacing: 2 }}>
            BIRD<Text style={{ color: "#F87171" }}>L</Text>IE <Text style={{ color: "#60A5FA" }}>KALENDER</Text>
          </Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: "#D1D5DB", true: "#60A5FA" }}
            thumbColor={isDarkMode ? "#F87171" : "#FFFFFF"}
            accessibilityLabel="Dunkelmodus umschalten"
          />
        </View>
        <Text style={{ fontSize: 16, fontWeight: "600", textAlign: "center", color: isDarkMode ? "#CBD5E0" : "#374151", marginBottom: 5 }}>
          {userName || "Unbekannt"}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: "500", textAlign: "center", color: isDarkMode ? "#A0AEC0" : "#6B7280", marginBottom: 20 }}>
          {subName || "Kein Untername"}
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Pressable onPress={() => handleMonthChange("prev")} disabled={monthIndex === startMonthIndex && year === parseInt(startYear)}>
            <Text style={{ fontSize: 20, color: monthIndex === startMonthIndex && year === parseInt(startYear) ? (isDarkMode ? "#4A5568" : "#D1D5DB") : (isDarkMode ? "#E2E8F0" : "#4B5563") }}>◀︎</Text>
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "600", color: isDarkMode ? "#E2E8F0" : "#374151" }}>{months[monthIndex]} {year}</Text>
          <Pressable onPress={() => handleMonthChange("next")} disabled={monthIndex === endMonthIndex && year === endYear}>
            <Text style={{ fontSize: 20, color: monthIndex === endMonthIndex && year === endYear ? (isDarkMode ? "#4A5568" : "#D1D5DB") : (isDarkMode ? "#E2E8F0" : "#4B5563") }}>▶︎</Text>
          </Pressable>
        </View>

        <View style={{ width: windowWidth * 0.9, height: calendarHeight, alignSelf: "center", position: "relative" }}>
          {isLoading && (
            <View style={{ 
              position: "absolute", 
              top: 0, 
              bottom: 0, 
              left: 0, 
              right: 0, 
              justifyContent: "center", 
              alignItems: "center",
              zIndex: 1
            }}>
              <ActivityIndicator size="small" color={isDarkMode ? "#60A5FA" : "#34D399"} />
            </View>
          )}
          <View style={{ position: "absolute", left: 0, right: 0, top: 0 }}>
            <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 12 }}>
              {"Mo Di Mi Do Fr Sa So".split(" ").map((day) => (
                <View key={day} style={{ flex: 1, aspectRatio: 1, justifyContent: "center", alignItems: "center", backgroundColor: isDarkMode ? "#4A5568" : "#E5E7EB", borderRadius: 8, margin: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: isDarkMode ? "#CBD5E0" : "#6B7280" }}>{day}</Text>
                </View>
              ))}
            </View>

            {weeks.map((week, wIndex) => (
              <View key={wIndex} style={{ flexDirection: "row" }}>
                {week.map((day, dIndex) => day ? (
                  <Pressable
                    key={dIndex}
                    onPress={() => toggleStatus(day.dayNumber - 1)}
                    onLongPress={() => openNoteModal(day.dayNumber - 1)}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      margin: 2,
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: 8,
                      backgroundColor: statusColors[day.status],
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      position: "relative",
                    }}
                    pointerEvents="auto"
                    accessibilityLabel={`Tag ${day.dayNumber}, Status: ${day.status}`}
                  >
                    <Text style={{ fontSize: 14, color: isDarkMode ? "#E2E8F0" : "#374151" }}>{day.dayNumber}</Text>
                    {day.user && (
                      <Text style={{ fontSize: 10, color: isDarkMode ? "#CBD5E0" : "#374151", textAlign: "center" }}>{day.user}</Text>
                    )}
                    {day.notes.length > 0 && (
                      <Text style={{
                        position: "absolute",
                        bottom: 2,
                        right: 2,
                        fontSize: 10,
                        color: isDarkMode ? "#60A5FA" : "#34D399",
                      }}>
                        ✏️
                      </Text>
                    )}
                  </Pressable>
                ) : <View key={dIndex} style={{ flex: 1, aspectRatio: 1, margin: 2 }} />)}
              </View>
            ))}
          </View>
        </View>

        <View style={{
          alignSelf: "center",
          width: "90%",
          marginTop: 20,
          padding: 12,
          borderRadius: 12,
          backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
          flexDirection: "row",
          justifyContent: "space-around",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}>
          <View style={{ alignItems: "center" }}><View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: statusColors.free, marginBottom: 4 }} /><Text style={{ fontSize: 10, color: isDarkMode ? "#CBD5E0" : "#374151" }}>Verfügbar</Text></View>
          <View style={{ alignItems: "center" }}><View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: statusColors.partial, marginBottom: 4 }} /><Text style={{ fontSize: 10, color: isDarkMode ? "#CBD5E0" : "#374151" }}>Teilweise</Text></View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20, gap: 20 }}>
          <Pressable
            onPress={goToÜbersicht}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: "#60A5FA",
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}
          >
            <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "600" }}>Übersicht</Text>
          </Pressable>
          <Pressable
            onPress={goToUrlaubsplanung}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: "#F87171",
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}
          >
            <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "600" }}>Urlaubsplanung</Text>
          </Pressable>
        </View>
      </ScrollView>

      {modalVisible && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: "85%",
              backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
              padding: 20,
              borderRadius: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#1F2937", textAlign: "center", marginBottom: 16 }}>
              Notiz für Tag {selectedDayIndex !== null ? selectedDayIndex + 1 : ""}
            </Text>
            <TextInput
              placeholder="Deine Notiz..."
              value={noteInput}
              onChangeText={setNoteInput}
              style={{
                borderWidth: 1,
                borderColor: isDarkMode ? "#4A5568" : "#D1D5DB",
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                backgroundColor: isDarkMode ? "#4A5568" : "#F9FAFB",
                marginBottom: 20,
                minHeight: 100,
                color: isDarkMode ? "#E2E8F0" : "#374151",
              }}
              multiline
              numberOfLines={4}
              placeholderTextColor={isDarkMode ? "#A0AEC0" : "#6B7280"}
              accessibilityLabel="Notizfeld"
            />
            {selectedDayIndex !== null && days[selectedDayIndex].notes.length > 0 && (
              <ScrollView style={{ maxHeight: 150, marginBottom: 20 }}>
                {days[selectedDayIndex].notes.map((note, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: "row",
                      paddingVertical: 8,
                      borderBottomWidth: index === days[selectedDayIndex].notes.length - 1 ? 0 : 1,
                      borderColor: isDarkMode ? "#4A5568" : "#E5E7EB",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: isDarkMode ? "#CBD5E0" : "#374151", fontWeight: "500" }}>
                        {note.timestamp} - {note.user}
                      </Text>
                      <Text style={{ fontSize: 12, color: isDarkMode ? "#CBD5E0" : "#374151" }}>{note.text}</Text>
                    </View>
                    {note.user === userName && (
                      <Pressable
                        onPress={() => deleteNote(index)}
                        style={{
                          padding: 6,
                          backgroundColor: isDarkMode ? "#FC8181" : "#FECACA",
                          borderRadius: 8,
                          marginLeft: 10,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.3,
                          shadowRadius: 4,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: isDarkMode ? "#E2E8F0" : "#1F2937" }}>Löschen</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  backgroundColor: isDarkMode ? "#4A5568" : "#E5E7EB",
                  borderRadius: 12,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ fontSize: 16, color: isDarkMode ? "#E2E8F0" : "#374151", fontWeight: "600" }}>Abbrechen</Text>
              </Pressable>
              <Pressable
                onPress={saveNote}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  backgroundColor: "#34D399",
                  borderRadius: 12,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "600" }}>Hinzufügen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}