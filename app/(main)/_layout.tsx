import { Tabs } from "expo-router";

import { BottomNav } from "@/components/bottom-nav";

export const unstable_settings = {
  initialRouteName: "dashboard",
};

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tabs.Screen name="leaderboard" />
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="team" />
    </Tabs>
  );
}
