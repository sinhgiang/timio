import { Tabs } from "expo-router";

export default function ManagerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#e5e7eb",
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#1d4ed8",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Tổng quan", tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: "Chấm công", tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} /> }} />
      <Tabs.Screen name="employees" options={{ title: "Nhân viên", tabBarIcon: ({ color }) => <TabIcon emoji="👥" color={color} /> }} />
      <Tabs.Screen name="leave" options={{ title: "Nghỉ phép", tabBarIcon: ({ color }) => <TabIcon emoji="📅" color={color} /> }} />
      <Tabs.Screen name="report" options={{ title: "Báo cáo", tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} /> }} />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require("react-native");
  return <Text style={{ fontSize: 20, opacity: color === "#1d4ed8" ? 1 : 0.5 }}>{emoji}</Text>;
}
