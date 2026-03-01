import React from "react";
import { FlatList, StyleSheet, useWindowDimensions } from "react-native";
import BookCard from "./BookCard";
import { Text, View } from "./Themed";

const PersonalLibrary = ({books, title = "Mi biblioteca"}) => {
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
        renderItem={({ item }) => <BookCard book={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
    )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  header: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 20,
  },
});



export default PersonalLibrary;