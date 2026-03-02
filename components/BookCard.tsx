import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

const BookCard = ({ book }: { book: any }) => {
  return (
    <View style={styles.card}>
      <Image source={{ uri: book.image }} style={styles.image} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{book.condition}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    backgroundColor: "#fdfbf7",
    overflow: "hidden",
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 180,
  },
  badge: {
    position: "absolute",
    bottom: 90,
    left: 10,
    backgroundColor: "#e07a5f",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fdfbf7",
    fontSize: 12,
    fontWeight: "bold",
  },
  info: {
    padding: 12,
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#3e2723",
  },
  author: {
    color: "#3d405b",
  },
});

export default BookCard;