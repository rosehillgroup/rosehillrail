/**
 * Simple PDF Template for Testing
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export const SimplePDF = () => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.title}>Test PDF</Text>
          <Text>This is a simple test PDF.</Text>
        </View>
      </Page>
    </Document>
  );
};
