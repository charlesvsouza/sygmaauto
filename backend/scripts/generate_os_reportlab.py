#!/usr/bin/env python3
"""
Gerador de PDF de Ordem de Serviço usando ReportLab
Uso: python generate_os_reportlab.py --output os_sample.pdf
"""

import json
import sys
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from reportlab.pdfgen import canvas


class OSPDFGenerator:
    """Gerador de PDF para Ordem de Serviço usando ReportLab"""

    def __init__(self, filename="order.pdf"):
        self.filename = filename
        self.pagesize = A4
        self.width, self.height = self.pagesize
        self.margin = 0.5 * inch

    def format_currency(self, value):
        """Formata valor como moeda brasileira"""
        return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    def format_date(self, date_str):
        """Formata data para padrão brasileiro"""
        if isinstance(date_str, str):
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        else:
            dt = date_str
        return dt.strftime("%d/%m/%Y")

    def generate(self, data):
        """
        Gera PDF a partir de dados de OS
        data: dicionário com informações da OS
        """
        doc = SimpleDocTemplate(
            self.filename,
            pagesize=self.pagesize,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin,
        )

        styles = getSampleStyleSheet()
        story = []

        # ===== CABEÇALHO =====
        header_data = [
            [
                Paragraph("<b>SYGMAAUTO</b>", styles["Title"]),
                Paragraph(
                    f"<b>{data.get('companyName', 'SygmaAuto')}</b><br/>"
                    f"{data.get('companyAddress', '')}<br/>"
                    f"{data.get('companyPhone', '')}<br/>"
                    f"{data.get('companyEmail', '')}<br/>"
                    f"CNPJ: {data.get('companyCNPJ', '')}",
                    styles["Normal"],
                ),
            ]
        ]
        header_table = Table(header_data, colWidths=[2 * inch, 4 * inch])
        header_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("BORDER", (0, 0), (-1, -1), 0),
                ]
            )
        )
        story.append(header_table)
        story.append(Spacer(1, 0.2 * inch))

        # ===== TÍTULO =====
        story.append(Paragraph("<b>ORDEM DE SERVIÇO</b>", styles["Title"]))
        story.append(Spacer(1, 0.2 * inch))

        # ===== DADOS CLIENTE E OS =====
        client_os_data = [
            [
                Paragraph(
                    f"<b>Dados do Cliente</b><br/>"
                    f"<b>Nome:</b> {data.get('customerName', '')}<br/>"
                    f"<b>Documento:</b> {data.get('customerDocument', 'N/A')}<br/>"
                    f"<b>Telefone:</b> {data.get('customerPhone', 'N/A')}<br/>"
                    f"<b>Endereço:</b> {data.get('customerAddress', 'N/A')}",
                    styles["Normal"],
                ),
                Paragraph(
                    f"<b>Identificação</b><br/>"
                    f"<b>Número da OS:</b> #{data.get('osNumber', '')}<br/>"
                    f"<b>Data:</b> {data.get('osDate', '')}<br/>"
                    f"<b>Status:</b> {data.get('osStatus', '')}",
                    styles["Normal"],
                ),
            ]
        ]
        client_table = Table(client_os_data, colWidths=[3.5 * inch, 2.5 * inch])
        client_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("BORDER", (0, 0), (-1, -1), 1),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )
        story.append(client_table)
        story.append(Spacer(1, 0.15 * inch))

        # ===== VEÍCULO =====
        story.append(Paragraph("<b>Equipamentos</b>", styles["Heading3"]))
        vehicle_info = (
            f"{data.get('vehicleBrand', 'N/A')} {data.get('vehicleModel', '')} "
            f"{data.get('vehicleYear', '')}<br/>"
            f"Placa: {data.get('vehiclePlate', 'N/A')} | "
            f"VIN: {data.get('vehicleVIN', 'N/A')} | "
            f"KM: {data.get('vehicleKM', '0')} km"
        )
        story.append(Paragraph(vehicle_info, styles["Normal"]))
        story.append(Spacer(1, 0.1 * inch))

        # ===== DEFEITOS RELATADOS =====
        story.append(Paragraph("<b>Defeitos Relatados</b>", styles["Heading3"]))
        story.append(Paragraph(data.get("complaint", "Não informado"), styles["Normal"]))
        story.append(Spacer(1, 0.1 * inch))

        # ===== LAUDO TÉCNICO =====
        story.append(Paragraph("<b>Laudo Técnico</b>", styles["Heading3"]))
        story.append(
            Paragraph(data.get("diagnosis", "Aguardando diagnóstico"), styles["Normal"])
        )
        story.append(Spacer(1, 0.1 * inch))

        # ===== SERVIÇOS =====
        if data.get("services_rows"):
            story.append(Paragraph("<b>Serviços Prestados</b>", styles["Heading3"]))
            services_table = Table(
                data["services_rows"],
                colWidths=[0.5 * inch, 2.5 * inch, 0.6 * inch, 1 * inch, 1.2 * inch],
            )
            services_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 9),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("BACKGROUND", (0, 1), (-1, -2), colors.beige),
                        ("GRID", (0, 0), (-1, -2), 1, colors.black),
                        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                        ("ALIGN", (1, 0), (1, -1), "LEFT"),
                    ]
                )
            )
            story.append(services_table)
            story.append(Spacer(1, 0.1 * inch))

        # ===== PRODUTOS =====
        if data.get("products_rows"):
            story.append(Paragraph("<b>Produtos</b>", styles["Heading3"]))
            products_table = Table(
                data["products_rows"],
                colWidths=[0.5 * inch, 2.5 * inch, 0.6 * inch, 1 * inch, 1.2 * inch],
            )
            products_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 9),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("BACKGROUND", (0, 1), (-1, -2), colors.beige),
                        ("GRID", (0, 0), (-1, -2), 1, colors.black),
                        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                        ("ALIGN", (1, 0), (1, -1), "LEFT"),
                    ]
                )
            )
            story.append(products_table)
            story.append(Spacer(1, 0.1 * inch))

        # ===== RESUMO FINANCEIRO =====
        summary_data = [
            [Paragraph("<b>Subtotal:</b>", styles["Normal"]), data.get("subtotal", "R$ 0,00")],
            [Paragraph("<b>Descontos:</b>", styles["Normal"]), data.get("totalDiscount", "R$ 0,00")],
            [
                Paragraph("<b>TOTAL:</b>", ParagraphStyle("Bold", styles["Normal"], fontSize=12)),
                Paragraph(f"<b>{data.get('total', 'R$ 0,00')}</b>", styles["Normal"]),
            ],
        ]
        summary_table = Table(summary_data, colWidths=[4 * inch, 2 * inch])
        summary_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                    ("BORDER", (0, 2), (-1, 2), 2, colors.black),
                    ("BACKGROUND", (0, 2), (-1, 2), colors.grey),
                    ("TEXTCOLOR", (0, 2), (-1, 2), colors.whitesmoke),
                ]
            )
        )
        story.append(summary_table)
        story.append(Spacer(1, 0.3 * inch))

        # ===== OBSERVAÇÕES =====
        if data.get("observations"):
            story.append(Paragraph("<b>Observações</b>", styles["Heading3"]))
            story.append(Paragraph(data.get("observations"), styles["Normal"]))
            story.append(Spacer(1, 0.2 * inch))

        # ===== ASSINATURAS =====
        sig_data = [
            [
                Paragraph("_________________________________<br/>Assinatura do Técnico", styles["Normal"]),
                Paragraph("_________________________________<br/>Assinatura do Cliente", styles["Normal"]),
            ]
        ]
        sig_table = Table(sig_data, colWidths=[3 * inch, 3 * inch])
        sig_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("BORDER", (0, 0), (-1, -1), 0),
                ]
            )
        )
        story.append(sig_table)

        # Gerar PDF
        doc.build(story)
        print(f"✓ PDF gerado com sucesso: {self.filename}")


def load_sample_data():
    """Dados de exemplo para teste"""
    return {
        "companyName": "PowerTrain Serviços Técnicos Automotivos",
        "companyAddress": "Rua Luis Carlos Saroli 2021, Recreio dos Bandeirantes, Rio de Janeiro - RJ",
        "companyPhone": "(21) 97933-0093",
        "companyEmail": "comercial.widguet@hotmail.com",
        "companyCNPJ": "22907647000134",
        "customerName": "Moacir",
        "customerDocument": "123.456.789-00",
        "customerPhone": "(21) 98119-8750",
        "customerAddress": "Rua Álvaro Moreira, 335, Barra da Tijuca, Rio de Janeiro - RJ",
        "osNumber": "00000001",
        "osDate": "31/01/2025",
        "osStatus": "Em Progresso",
        "vehicleBrand": "VOLVO",
        "vehicleModel": "XC60",
        "vehicleYear": "4x4 TOD Automático",
        "vehiclePlate": "ABC-1234",
        "vehicleVIN": "VOLVOVIN123456",
        "vehicleKM": "125000",
        "complaint": "limpeza do sistema de alimentação incluído limpeza do reservatório de Combustível e reservatório da bomba de de baixa pressão.",
        "diagnosis": "após desmontagem do sistema de Combustível detectamos formação de \"goma\" no fundo do tanque. a limpeza efetuada deu - se produto Prime biosolution, remoção do tanque de combustível, limpeza e descontaminação da tubulacao de combustivel. limpeza se DTC do sistema, falhas aleatórias não permaneceram.",
        "services_rows": [
            ["1", "Análise com aparelho de diagnóstico Nexpeak", "1", "R$ 450,00", "R$ 450,00"],
            ["2", "Mão de obra mecânica", "5", "R$ 450,00", "R$ 2.250,00"],
            ["", "", "", "Total de Serviços:", "R$ 2.700,00"],
        ],
        "products_rows": [
            ["1", "Filtro de Combustível Diesel Volvo XC60", "1", "R$ 358,00", "R$ 358,00"],
            ["2", "Prime Tratamento Diesel", "1", "R$ 198,00", "R$ 198,00"],
            ["", "", "", "Total de Produtos:", "R$ 556,00"],
        ],
        "subtotal": "R$ 3.256,00",
        "totalDiscount": "R$ 0,00",
        "total": "R$ 3.256,00",
        "observations": "Garantia aplicável conforme políticas da oficina.",
    }


if __name__ == "__main__":
    output_file = "os_sample_reportlab.pdf"

    # Processar argumentos
    if "--output" in sys.argv:
        idx = sys.argv.index("--output")
        if idx + 1 < len(sys.argv):
            output_file = sys.argv[idx + 1]

    # Gerar PDF
    generator = OSPDFGenerator(output_file)
    data = load_sample_data()
    generator.generate(data)
