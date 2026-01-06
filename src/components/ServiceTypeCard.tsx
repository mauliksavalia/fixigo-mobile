import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../theme/colors";

interface Props {
  title: string;
  description: string;
  highlight?: boolean;
  onPress: () => void;
}

export default function ServiceTypeCard({
  title,
  description,
  highlight,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        highlight && { borderColor: colors.pro, borderWidth: 2 },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  desc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});