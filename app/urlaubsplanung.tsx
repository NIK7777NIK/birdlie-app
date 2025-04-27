import { useState, useEffect } from "react";
import { SafeAreaView, View, Text, Pressable, ScrollView, Switch, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Urlaubsplanung() {
  const { userName, subName, startMonth, startYear, duration, darkMode, groupCode, monthIndex, year } = useLocalSearchParams();
  const router = useRouter();
  const SERVER_URL = "https://birdlie.com:3000";
  const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  
  const startMonthIndex = months.indexOf(startMonth);
  const durationMonths = duration === "2 Monate" ? 2 : 1;
  const endMonthIndex = (startMonthIndex + durationMonths - 1) % 12;
  const endYear = durationMonths === 2 && endMonthIndex < startMonthIndex ? parseInt(startYear) + 1 : parseInt(startYear);

  const [isDarkMode, setIsDarkMode] = useState(darkMode === "true");
  const [isLoading, setIsLoading] = useState(false);
  const [groupData, setGroupData] = useState(null);
  const [bestDaysByMonth, setBestDaysByMonth] = useState([]);

  useEffect(() => {
    const loadDarkMode = async () => {
      const storedMode = await AsyncStorage.getItem("darkMode");
      if (storedMode !== null) setIsDarkMode(JSON.parse(storedMode));
    };
    loadDarkMode();
    fetchGroupData();
  }, []);

  const fetchGroupData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/group/${groupCode}`);
      const data = await response.json();
      if (response.ok) {
        setGroupData(data);
        calculateBestDays(data);
      } else {
        Alert.alert("Fehler", data.error || "Konnte Gruppendaten nicht laden");
      }
    } catch (error) {
      Alert.alert("Fehler", "Der Server ist nicht erreichbar. Bitte überprüfe deine Internetverbindung oder versuche es später erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBestDays = (data) => {
    const calendar = data.calendar || {};
    const bestDaysByMonth = [];

    for (let monthOffset = 0; monthOffset < durationMonths; monthOffset++) {
      const currentMonthIndex = (startMonthIndex + monthOffset) % 12;
      const currentYear = parseInt(startYear) + Math.floor((startMonthIndex + monthOffset) / 12);
      const daysInMonth = getDaysInMonth(currentMonthIndex, currentYear);
      const availabilityMap = {};

      // Initialisiere die Verfügbarkeitskarte für jeden Tag im aktuellen Monat
      for (let day = 1; day <= daysInMonth; day++) {
        availabilityMap[day] = new Set();
      }

      // Zähle einzigartige Nutzer pro Tag und Monat
      Object.entries(calendar).forEach(([user, userData]: [string, any]) => {
        const userDays = userData.days || [];
        userDays.forEach((day: any) => {
          if (day.status === "free" && day.monthIndex === currentMonthIndex) {
            availabilityMap[day.day].add(user);
          }
        });
      });

      // Berechne die Anzahl der verfügbaren Nutzer pro Tag
      const availabilityCount = Array(daysInMonth).fill(0);
      for (let day = 1; day <= daysInMonth; day++) {
        availabilityCount[day - 1] = availabilityMap[day].size;
      }

      const maxAvailability = Math.max(...availabilityCount);
      const bestDaysList = availabilityCount
        .map((count, index) => ({ day: index + 1, count }))
        .filter(item => item.count === maxAvailability && item.count > 0)
        .sort((a, b) => a.day - b.day);

      bestDaysByMonth.push({
        month: months[currentMonthIndex],
        year: currentYear,
        bestDays: bestDaysList
      });
    }

    setBestDaysByMonth(bestDaysByMonth);
  };

  const getDaysInMonth = (monthIndex: number, year: number) => {
    if (monthIndex === 1) {
      return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28;
    }
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthIndex];
  };

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem("darkMode", JSON.stringify(newMode));
  };

  const goBackToKalender = () => {
    // Fallback-Werte für monthIndex und year, falls sie undefined sind
    const safeMonthIndex = monthIndex !== undefined ? monthIndex : startMonthIndex.toString();
    const safeYear = year !== undefined ? year : startYear;

    console.log("Navigiere zurück zum Kalender mit:", {
      userName,
      subName,
      startMonth,
      startYear,
      duration,
      darkMode: isDarkMode.toString(),
      groupCode,
      monthIndex: safeMonthIndex,
      year: safeYear
    });

    router.push({
      pathname: "/kalender",
      params: { 
        userName, 
        subName, 
        startMonth, 
        startYear, 
        duration, 
        darkMode: isDarkMode.toString(), 
        groupCode, 
        monthIndex: safeMonthIndex.toString(),
        year: safeYear.toString()
      }
    });
  };

  const goToPackliste = () => {
    router.push({
      pathname: "/packliste",
      params: { userName, subName, startMonth, startYear, duration, darkMode: isDarkMode.toString(), groupCode }
    });
  };

  const goToBudgetTracker = () => {
    router.push({
      pathname: "/budgettracker",
      params: { userName, subName, startMonth, startYear, duration, darkMode: isDarkMode.toString(), groupCode }
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? "#1A202C" : "#F0F4F8" }}>
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
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: "900", color: isDarkMode ? "#E2E8F0" : "#1F2937", letterSpacing: 2 }}>
            BIRD<Text style={{ color: "#F87171" }}>L</Text>IE <Text style={{ color: "#60A5FA" }}>URLAUBSPLANUNG</Text>
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
        <Text style={{ fontSize: 18, fontWeight: "600", color: isDarkMode ? "#E2E8F0" : "#374151", marginBottom: 20 }}>
          Start: {startMonth} {startYear}, Dauer: {duration}
        </Text>

        {bestDaysByMonth.length > 0 ? (
          bestDaysByMonth.map((monthData, monthIndex) => (
            <View key={monthIndex} style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: isDarkMode ? "#E2E8F0" : "#374151", marginBottom: 10 }}>
                Beste Tage für {monthData.month} {monthData.year}:
              </Text>
              {monthData.bestDays.length > 0 ? (
                monthData.bestDays.map((day, index) => (
                  <View
                    key={index}
                    style={{
                      padding: 10,
                      backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
                      borderRadius: 8,
                      marginBottom: 10,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: isDarkMode ? "#CBD5E0" : "#374151" }}>
                      {day.day}. {monthData.month} {monthData.year}: {day.count} Mitglieder verfügbar
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 16, color: isDarkMode ? "#E2E8F0" : "#374151", marginBottom: 10 }}>
                  Keine Tage gefunden, an denen Mitglieder verfügbar sind.
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 16, color: isDarkMode ? "#E2E8F0" : "#374151", marginBottom: 20 }}>
            Keine Tage gefunden, an denen Mitglieder verfügbar sind.
          </Text>
        )}

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20, gap: 20 }}>
          <Pressable
            onPress={goToPackliste}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: "#FBBF24",
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}
          >
            <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "600" }}>Gepäckliste</Text>
          </Pressable>
          <Pressable
            onPress={goToBudgetTracker}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: "#10B981",
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}
          >
            <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "600" }}>Budget-Tracker</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={goBackToKalender}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 24,
            backgroundColor: "#60A5FA",
            borderRadius: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            alignSelf: "center",
            marginTop: 20,
          }}
        >
          <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "600" }}>Zurück zum Kalender</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}