import React from 'react'
import {
  Font,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import path from 'path'

/**
 * Register Geist Sans font for proper Romanian diacritics (ă, â, î, ș, ț).
 *
 * Uses node_modules path which works locally and in Vercel serverless functions.
 * For Vercel Edge or static export, copy fonts to public/fonts/ as a fallback.
 *
 * WARNING: Do NOT use variable font files (e.g., Geist-Italic[wght].ttf) --
 * PDF spec does not support variable fonts.
 */
Font.register({
  family: 'Geist Sans',
  fonts: [
    {
      src: path.join(
        process.cwd(),
        'node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf'
      ),
      fontWeight: 'normal',
    },
    {
      src: path.join(
        process.cwd(),
        'node_modules/geist/dist/fonts/geist-sans/Geist-Bold.ttf'
      ),
      fontWeight: 'bold',
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Geist Sans',
    fontSize: 11,
    lineHeight: 1.6,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 4,
  },
  text: {
    fontSize: 11,
    color: '#333',
    marginBottom: 12,
  },
  footer: {
    fontSize: 9,
    color: '#999',
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
})

interface ApplicationPdfDocumentProps {
  grantName: string
  providerAgency: string
  sections: Array<{ fieldLabel: string; finalText: string }>
}

export function ApplicationPdfDocument({
  grantName,
  providerAgency,
  sections,
}: ApplicationPdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.title}>{grantName}</Text>
          <Text style={styles.subtitle}>{providerAgency}</Text>
        </View>

        {sections.map((section, index) => (
          <View key={index}>
            <Text style={styles.sectionTitle}>{section.fieldLabel}</Text>
            <Text style={styles.text}>{section.finalText}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text>
            Generat cu GrantAssist Moldova | {new Date().toISOString()}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
