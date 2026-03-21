import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Primary strategy: @react-pdf/renderer (server-side)
    const React = (await import("react")).default;
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const ReactPDF = await import("@react-pdf/renderer");

    const { Document, Page, Text, View, StyleSheet } = ReactPDF;

    const styles = StyleSheet.create({
      page: {
        padding: 30,
        fontFamily: "Helvetica",
      },
      title: {
        fontSize: 24,
        marginBottom: 20,
        fontWeight: "bold",
      },
      subtitle: {
        fontSize: 14,
        marginBottom: 12,
        color: "#555555",
      },
      diacritics: {
        fontSize: 16,
        marginBottom: 16,
        color: "#333333",
      },
      paragraph: {
        fontSize: 12,
        lineHeight: 1.6,
        color: "#444444",
      },
      footer: {
        fontSize: 10,
        marginTop: 30,
        color: "#999999",
      },
    });

    const TestDocument = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: styles.page },
        React.createElement(
          View,
          null,
          React.createElement(
            Text,
            { style: styles.title },
            "GrantAssist Moldova - Test PDF"
          ),
          React.createElement(
            Text,
            { style: styles.subtitle },
            "Validare generare PDF cu diacritice romanesti"
          ),
          React.createElement(
            Text,
            { style: styles.diacritics },
            "Caractere romanesti: \u0103, \u00e2, \u00ee, \u0219, \u021b, \u0102, \u00c2, \u00ce, \u0218, \u021a"
          ),
          React.createElement(
            Text,
            { style: styles.paragraph },
            "Aceasta este o aplicatie de test pentru generarea PDF-urilor cu diacritice romanesti corecte."
          ),
          React.createElement(
            Text,
            { style: styles.paragraph },
            "Dac\u0103 pute\u021bi citi acest text corect, inclusiv caracterele speciale rom\u00e2ne\u0219ti, atunci @react-pdf/renderer func\u021bioneaz\u0103 pe Vercel."
          ),
          React.createElement(
            Text,
            { style: styles.footer },
            `Generat: ${new Date().toISOString()} | Strategie: @react-pdf/renderer (server-side)`
          )
        )
      )
    );

    const buffer = await renderToBuffer(TestDocument);

    return new Response(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="test-diacritics.pdf"',
      },
    });
  } catch (error: unknown) {
    // Fallback: document jspdf as the alternative strategy
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        primary_strategy: "react-pdf-failed",
        error: errorMessage,
        fallback_strategy: "jspdf-client-side",
        recommendation:
          "Use jspdf with embedded Geist Sans TTF font on the client side",
        next_steps: [
          "Download Geist Sans .ttf from npm package",
          "Use jspdf.addFont() with base64-encoded font",
          "Generate PDF client-side in the browser",
          "Romanian diacritics will render correctly with custom font",
        ],
        phase5_impact:
          "Export button will trigger client-side PDF generation instead of server-side route",
      },
      { status: 200 }
    );
  }
}
