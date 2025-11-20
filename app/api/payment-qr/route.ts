// import { type NextRequest, NextResponse } from "next/server"
// import QRCode from "qrcode"
// import jsPDF from "jspdf"

// interface InvoiceRequest {
//   amount: number
//   upiId: string
// }

// export async function POST(request: NextRequest) {
//   try {
//     const body = (await request.json()) as InvoiceRequest
//     let { amount, upiId } = body

//     if (!amount || !upiId) {
//       amount = 1500
//       upiId = "user@paytm"
//     }

//     // Validate inputs
//     if (!amount || amount <= 0 || !upiId) {
//       return NextResponse.json({ error: "Invalid amount or UPI ID" }, { status: 400 })
//     }

//     console.log("[v0] Generating invoice for amount:", amount, "UPI:", upiId)

//     // Generate UPI string
//     const upiString = `upi://pay?pa=${upiId}&am=${amount}&tn=Invoice`
//     console.log("[v0] UPI String:", upiString)

//     const qrCodeDataUrl = await QRCode.toDataURL(upiString, {
//         errorCorrectionLevel: "H",
//         type: "image/png",
//         margin: 1,
//         width: 300,
//       });
      

//     console.log("[v0] QR Code generated successfully")

//     const doc = new jsPDF()
//     const pageWidth = doc.internal.pageSize.getWidth()
//     const pageHeight = doc.internal.pageSize.getHeight()
//     let yPosition = 20

//     // Header
//     doc.setFontSize(24)
//     doc.setFont(undefined, "bold")
//     doc.text("INVOICE", 20, yPosition)
//     yPosition += 15

//     // Invoice details
//     const invoiceNumber = `INV-${Date.now()}`
//     const today = new Date().toLocaleDateString("en-IN")

//     doc.setFontSize(12)
//     doc.setFont(undefined, "normal")
//     doc.text(`Invoice Number: ${invoiceNumber}`, 20, yPosition)
//     yPosition += 8
//     doc.text(`Date: ${today}`, 20, yPosition)
//     yPosition += 15

//     // Amount section
//     doc.setFontSize(14)
//     doc.setFont(undefined, "bold")
//     doc.text("Amount Details:", 20, yPosition)
//     yPosition += 10

//     doc.setFontSize(14)
//     doc.setFont(undefined, "bold")
//     doc.text(`Amount: ₹${amount.toFixed(2)}`, 20, yPosition)
//     yPosition += 8

//     doc.setFontSize(12)
//     doc.setFont(undefined, "normal")
//     doc.text(`UPI ID: ${upiId}`, 20, yPosition)
//     yPosition += 15

//     // QR Code section
//     doc.setFontSize(14)
//     doc.setFont(undefined, "bold")
//     doc.text("Payment QR Code:", 20, yPosition)
//     yPosition += 10

//     doc.addImage(qrCodeDataUrl, "PNG", (pageWidth - 100) / 2, yPosition, 100, 100)
//     yPosition += 110

//     // Instructions
//     doc.setFontSize(10)
//     doc.setFont(undefined, "normal")
//     doc.setTextColor(100, 100, 100)
//     doc.text("Scan the QR code above to make payment via UPI", 20, yPosition)

//     const pdfBytes = doc.output("arraybuffer")
//     const pdfBuffer = Buffer.from(pdfBytes)

//     console.log("[v0] PDF generated successfully, size:", pdfBuffer.length, "bytes")

//     return new NextResponse(pdfBuffer, {
//       headers: {
//         "Content-Type": "application/pdf",
//         "Content-Disposition": 'attachment; filename="invoice.pdf"',
//       },
//     })
//   } catch (error) {
//     console.error("[v0] Error generating invoice:", error)
//     return NextResponse.json({ error: "Failed to generate invoice", details: String(error) }, { status: 500 })
//   }
// }
