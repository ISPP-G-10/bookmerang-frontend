import React from "react";
import { FlatList, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import BookCard from "./BookCard";
import { Text, View } from "./Themed";

const PersonalLibrary = ({ books, title = "Mi biblioteca", onBookPress }: { books: any[]; title?: string; onBookPress?: (book: any) => void }) => {
  const { width } = useWindowDimensions();

  const isWeb = width > 768;
  const columns = isWeb ? 4 : 2;

  return(
    <View style={styles.container}>
      <Text style={styles.header}>{title}</Text>

      <FlatList
        data={books}
        key={columns}
        numColumns={columns}
        renderItem={({ item }) => (
          <Pressable onPress={() => onBookPress?.(item)}>
            <BookCard book={item} />
          </Pressable>
        )}        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  header: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 20,
    color: "#e07a5f",
  },
  empty: {
    textAlign: "center",
    color: "#3d405b",  },
});



export default PersonalLibrary;