/**
 * PDF Quote Template
 * Generates professional PDF quotes using @react-pdf/renderer
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { QuoteInput } from "./types";
import type { PricedBOMLine, QuoteTotals } from "./pricing";

// Rosehill Rail brand colors
const colors = {
  primaryBlue: "#1a365d",
  secondaryBlue: "#2d4a71",
  accentOrange: "#ff6b35",
  lightGray: "#f8f9fa",
  mediumGray: "#e9ecef",
  darkGray: "#6c757d",
  textDark: "#333333",
};

// PDF styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.textDark,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: `2px solid ${colors.primaryBlue}`,
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: "contain",
  },
  companyInfo: {
    textAlign: "right",
    fontSize: 9,
    color: colors.darkGray,
  },
  title: {
    fontSize: 24,
    color: colors.primaryBlue,
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.darkGray,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.primaryBlue,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: `1px solid ${colors.mediumGray}`,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: "40%",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  value: {
    width: "60%",
    fontSize: 9,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.primaryBlue,
    padding: 8,
    color: "white",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: `1px solid ${colors.mediumGray}`,
    fontSize: 9,
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: colors.lightGray,
    borderBottom: `1px solid ${colors.mediumGray}`,
    fontSize: 9,
  },
  col1: { width: "40%" },
  col2: { width: "15%", textAlign: "right" },
  col3: { width: "15%", textAlign: "right" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "15%", textAlign: "right" },
  totalsSection: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    width: "40%",
    justifyContent: "space-between",
    padding: 5,
    fontSize: 10,
  },
  grandTotalRow: {
    flexDirection: "row",
    width: "40%",
    justifyContent: "space-between",
    padding: 8,
    backgroundColor: colors.accentOrange,
    color: "white",
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    marginTop: 5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTop: `1px solid ${colors.mediumGray}`,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: colors.darkGray,
  },
  logoText: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.primaryBlue,
  },
  companyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: colors.primaryBlue,
    marginBottom: 5,
  },
  contactText: {
    marginTop: 5,
  },
  titleContainer: {
    marginBottom: 20,
  },
  dateText: {
    fontSize: 9,
    color: colors.darkGray,
  },
  footerRight: {
    textAlign: "right",
  },
});

interface QuotePDFProps {
  input: QuoteInput;
  bom: PricedBOMLine[];
  totals: QuoteTotals;
}

export const QuotePDF: React.FC<QuotePDFProps> = ({ input, bom, totals }) => {
  const quoteDate = new Date().toLocaleDateString("en-GB");
  const rhrLength = Math.ceil(input.design_len / 1.8) * 1.8;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: input.currency || "EUR",
    }).format(amount);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logoText}>
              ROSEHILL RAIL
            </Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>
              Rosehill Rail
            </Text>
            <Text>Beech Road</Text>
            <Text>Sowerby Bridge</Text>
            <Text style={styles.contactText}>Tel: +44 (0)1422 839 456</Text>
            <Text>Email: info@rosehillrail.com</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Rail Crossing Quotation</Text>
          <Text style={styles.subtitle}>Project: {String(input.project_name || '')}</Text>
          <Text style={styles.dateText}>
            Quote Date: {String(quoteDate)}
          </Text>
        </View>

        {/* Configuration Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Design Length:</Text>
            <Text style={styles.value}>{String(input.design_len)}m (RHR: {String(rhrLength.toFixed(1))}m)</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Number of Tracks:</Text>
            <Text style={styles.value}>{String(input.tracks)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Rail Gauge:</Text>
            <Text style={styles.value}>{String(input.gauge)}mm</Text>
          </View>
          {input.tracks > 1 && input.track_spacing ? (
            <View style={styles.row}>
              <Text style={styles.label}>Track Spacing:</Text>
              <Text style={styles.value}>{String(input.track_spacing)}m</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Crossing Angle:</Text>
            <Text style={styles.value}>{String(input.crossing_angle)}°</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Usage Type:</Text>
            <Text style={styles.value}>{String(input.usage)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Speed:</Text>
            <Text style={styles.value}>{String(input.speed_kph)} km/h</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Field Panel Type:</Text>
            <Text style={styles.value}>{String(input.field_panel_type)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Edge Beam:</Text>
            <Text style={styles.value}>{String(input.edge_beam)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Connection Type:</Text>
            <Text style={styles.value}>{String(input.connection)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Material:</Text>
            <Text style={styles.value}>{String(input.material)}</Text>
          </View>
        </View>

        {/* Bill of Materials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill of Materials</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Product</Text>
              <Text style={styles.col2}>Qty</Text>
              <Text style={styles.col3}>Unit</Text>
              <Text style={styles.col4}>Unit Price</Text>
              <Text style={styles.col5}>Total</Text>
            </View>

            {/* Table Rows */}
            {bom.map((line, index) => (
              <View
                key={index}
                style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={styles.col1}>{String(line.name)}</Text>
                <Text style={styles.col2}>{String(line.qty)}</Text>
                <Text style={styles.col3}>{String(line.unit)}</Text>
                <Text style={styles.col4}>{String(formatCurrency(line.unit_price))}</Text>
                <Text style={styles.col5}>{String(formatCurrency(line.line_total))}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text>Subtotal:</Text>
              <Text>{String(formatCurrency(totals.subtotal))}</Text>
            </View>
            {totals.tax > 0 ? (
              <View style={styles.totalRow}>
                <Text>Tax ({String((totals.tax_rate * 100).toFixed(0))}%):</Text>
                <Text>{String(formatCurrency(totals.tax))}</Text>
              </View>
            ) : null}
            <View style={styles.grandTotalRow}>
              <Text>Total:</Text>
              <Text>{String(formatCurrency(totals.total))}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text>This quotation is valid for 30 days from the date of issue.</Text>
            <Text>All prices exclude delivery and installation unless otherwise stated.</Text>
          </View>
          <View style={styles.footerRight}>
            <Text>Page 1 of 1</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
