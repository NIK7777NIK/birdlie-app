import { View, Image } from "react-native";
import { MotiView } from "moti";

export default function BirdlieSplash() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FAFB" }}>

      {/* Vogel + Koffer als Gruppe */}
      <MotiView
        from={{ translateY: 100, opacity: 0 }}
        animate={{ translateY: [100, 0, -5, 0], opacity: 1 }}

        transition={{ type: "timing", duration: 2000 }}
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        {/* Vogel */}
        <Image
          source={require("../assets/birdlie-logo.png")}
          style={{ width: 200, height: 200 }}
          resizeMode="contain"
        />

        {/* Koffer näher und höher */}
        <MotiView
          from={{ rotate: "0deg" }}
          animate={{ rotate: ["0deg", "5deg", "-5deg", "0deg"] }}
          transition={{ loop: true, duration: 1000 }}
          style={{
            position: "absolute",
            bottom: 58, // höher
            right: 11  // näher an den Vogel
          }}
        >
          <Image
            source={require("../assets/birdlie-suitcase.png")}
            style={{ width: 60, height: 60 }}
            resizeMode="contain"
          />
        </MotiView>

      </MotiView>

    </View>
  );
}
