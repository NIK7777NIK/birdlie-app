import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Auswertung() {
  const { startMonth, startYear, groupCode, darkMode, duration, monthIndex, year } = useLocalSearchParams();
  const router = useRouter();
  const SERVER_URL = "https://birdlie.com:3000";
  const [isDarkMode, setIsDarkMode] = useState(darkMode === "true");
  const [groupData, setGroupData] = useState(null);

  const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const startMonthIndex = months.indexOf(startMonth);

  useEffect(() => {
    const loadDarkMode = async () => {
      const storedMode = await AsyncStorage.getItem("darkMode");
      if (storedMode !== null) setIsDarkMode(JSON.parse(storedMode));
    };
    loadDarkMode();
    fetchGroupData();
  }, []);

  const fetchGroupData = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/group/${groupCode}`);
      const data = await response.json();
      if (response.ok) {
        setGroupData(data);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Gruppendaten:", error);
    }
  };

  const getDaysInMonth = (monthIndex: number, year: number) => {
    if (monthIndex === 1) {
      return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28;
    }
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthIndex];
  };

  const dayStats = () => {
    if (!groupData) return [];
    const durationMonths = duration === "2 Monate" ? 2 : 1;
    const statsByMonth = [];

    for (let monthOffset = 0; monthOffset < durationMonths; monthOffset++) {
      const currentMonthIndex = (startMonthIndex + monthOffset) % 12;
      const currentYear = parseInt(startYear) + Math.floor((startMonthIndex + monthOffset) / 12);
      const daysInMonth = getDaysInMonth(currentMonthIndex, currentYear);
      const calendar = groupData.calendar || {};
      const members = groupData.members || [];

      const stats = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const freeUsers = [];
        const partialUsers = [];
        let totalVotes = 0;

        members.forEach(member => {
          const userData = calendar[member] || { days: [], notes: [] };
          const dayEntry = userData.days.find(d => d.monthIndex === currentMonthIndex && d.day === day) || { status: "none" };
          if (dayEntry.status === "free") {
            freeUsers.push(member);
            totalVotes++;
          } else if (dayEntry.status === "partial") {
            partialUsers.push(member);
            totalVotes++;
          }
        });

        const notes = members.flatMap(member => {
          const userData = calendar[member] || { notes: [] };
          return userData.notes.filter(n => n.monthIndex === currentMonthIndex && n.day === day).map(n => ({
            text: n.text,
            timestamp: n.timestamp,
            user: n.user
          }));
        });

        return {
          date: `${String(day).padStart(2, '0')}.${String(currentMonthIndex + 1).padStart(2, '0')}`,
          freeUsers,
          partialUsers,
          votedPercentage: members.length > 0 ? Math.round((totalVotes / members.length) * 100) : 0,
          notes
        };
      });

      const maxPercentage = Math.max(...stats.map(stat => stat.votedPercentage));
      const highlightedStats = stats.map(stat => ({
        ...stat,
        isHighlighted: stat.votedPercentage === maxPercentage && stat.votedPercentage > 0
      }));

      statsByMonth.push({
        month: months[currentMonthIndex],
        year: currentYear,
        stats: highlightedStats
      });
    }

    return statsByMonth;
  };

  const goBackToKalender = () => {
    router.push({
      pathname: "/kalender",
      params: { 
        userName: groupData?.name || "Unbekannt", 
        subName: groupData?.subName || "Kein Untername", 
        startMonth, 
        startYear, 
        duration, 
        darkMode: isDarkMode.toString(), 
        groupCode, 
        monthIndex: monthIndex.toString(),
        year: year.toString()
      }
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? "#1A202C" : "#F0F4F8", padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: "900", color: isDarkMode ? "#E2E8F0" : "#1F2937", textAlign: "center", marginBottom: 10, letterSpacing: 2 }}>
        BIRD<Text style={{ color: "#F87171" }}>L</Text>IE <Text style={{ color: "#60A5FA" }}>ÜBERSICHT</Text>
      </Text>
      {groupData && (
        <Text style={{ fontSize: 16, fontWeight: "500", color: isDarkMode ? "#A0AEC0" : "#6B7280", textAlign: "center", marginBottom: 20 }}>
          {groupData.members.length} Gruppenmitglieder
        </Text>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 300 }}
          style={{
            backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
            borderRadius: 12,
            padding: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          <View style={{ borderBottomWidth: 1, borderColor: isDarkMode ? "#4A5568" : "#D1D5DB", paddingBottom: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#374151" }}>
              Verfügbarkeit der Gruppenmitglieder:
            </Text>
          </View>

          {groupData ? (
            dayStats().map((monthData, monthIndex) => (
              <View key={monthIndex} style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: isDarkMode ? "#E2E8F0" : "#374151", marginBottom: 10 }}>
                  {monthData.month} {monthData.year}
                </Text>
                <View style={{ flexDirection: "row", borderBottomWidth: 1, borderColor: isDarkMode ? "#4A5568" : "#D1D5DB", paddingBottom: 8, marginBottom: 8 }}>
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#374151" }}>Datum</Text>
                  <Text style={{ flex: 2, fontSize: 16, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#374151" }}>Verfügbare Personen</Text>
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#374151" }}>Abgestimmt (%)</Text>
                </View>
                {monthData.stats.map((day, index) => {
                  const freeText = day.freeUsers.length > 0 ? day.freeUsers.join(", ") : "";
                  const partialText = day.partialUsers.length > 0 ? ` (${day.partialUsers.join(", ")})` : "";
                  const displayText = freeText || partialText ? `${freeText}${partialText}` : "Niemand";
                  return (
                    <View key={index} style={{ marginBottom: 20 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          paddingVertical: 10,
                          backgroundColor: day.isHighlighted ? (isDarkMode ? "#2F855A" : "#C6F6D5") : "transparent",
                          borderBottomWidth: index === monthData.stats.length - 1 && day.notes.length === 0 ? 0 : 1,
                          borderColor: isDarkMode ? "#4A5568" : "#E5E7EB",
                        }}
                      >
                        <Text style={{ flex: 1, fontSize: 14, color: isDarkMode ? "#CBD5E0" : "#374151", fontWeight: "500" }}>{day.date}</Text>
                        <Text style={{ flex: 2, fontSize: 14, color: isDarkMode ? "#CBD5E0" : "#374151" }}>{displayText}</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: isDarkMode ? "#CBD5E0" : "#374151", textAlign: "center" }}>{day.votedPercentage}%</Text>
                      </View>
                      {day.notes.length > 0 && (
                        <View style={{ marginTop: 5 }}>
                          <Text style={{ fontSize: 14, fontWeight: "500", color: isDarkMode ? "#A0AEC0" : "#6B7280" }}>Notizen:</Text>
                          {day.notes.map((note, i) => (
                            <Text key={i} style={{ fontSize: 12, color: isDarkMode ? "#CBD5E0" : "#374151", marginLeft: 10 }}>
                              {note.timestamp} - {note.user}: {note.text}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 16, color: isDarkMode ? "#A0AEC0" : "#6B7280", textAlign: "center", paddingVertical: 20 }}>
              Lade Daten...
            </Text>
          )}
        </MotiView>
      </ScrollView>

      <Pressable
        onPress={goBackToKalender}
        style={{
          marginTop: 20,
          paddingVertical: 12,
          paddingHorizontal: 24,
          backgroundColor: "#60A5FA",
          borderRadius: 12,
          alignSelf: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        }}
      >
        <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "600" }}>Zurück</Text>
      </Pressable>
    </View>
  );
}