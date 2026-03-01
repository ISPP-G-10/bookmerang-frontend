import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

const BookCard = ({ book }) => {
    return (
        <View>
            <Image source={{ uri: book.image}} style={styles.image} />
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{book.condition}</Text>
            </View>

            <View style={styles.info}>
                <Text style={styles.title}>{book.title}</Text>
                <Text style={styles.author}>{book.author}</Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 3, // sombra Android
  },
  image: {
    width: "100%",
    height: 180,
  },
  badge: {
    position: "absolute",
    bottom: 90,
    left: 10,
    backgroundColor: "#E86A4A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  info: {
    padding: 12,
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
  },
  author: {
    color: "#666",
  },
});

export default BookCard;