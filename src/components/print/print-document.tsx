'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, Settings } from 'lucide-react';

interface LayoutElement {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

interface PrintLayout {
  docInfo: LayoutElement;
  clientInfo: LayoutElement;
  tableStart: LayoutElement;
  totals: LayoutElement;
  footer: LayoutElement;
  margins: { top: number; right: number; bottom: number; left: number };
}

interface PrintDocumentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: 'BL' | 'FC' | 'FF' | 'RC' | 'RF';
  documentData: any;
  entreprise: any;
  code: string;
  printLayout?: PrintLayout | null;
  letterheadImage?: string | null;
}

const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH`;

const formatDate = (d: string | Date) => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR');
};

const DEFAULT_LAYOUT: PrintLayout = {
  docInfo: { x: 120, y: 10, width: 80, height: 30, visible: true },
  clientInfo: { x: 10, y: 60, width: 90, height: 40, visible: true },
  tableStart: { x: 10, y: 110, width: 190, height: 100, visible: true },
  totals: { x: 130, y: 220, width: 70, height: 40, visible: true },
  footer: { x: 10, y: 270, width: 190, height: 20, visible: true },
  margins: { top: 10, right: 10, bottom: 10, left: 10 }
};

export function PrintDocument({
  open,
  onOpenChange,
  documentType,
  documentData,
  entreprise,
  code,
  printLayout,
  letterheadImage
}: PrintDocumentProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [useCustomLayout, setUseCustomLayout] = useState(true);
  const layout = printLayout || DEFAULT_LAYOUT;

  const mmToPx = (mm: number) => `${mm * 3.779527559}px`;

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const customStyles = useCustomLayout && printLayout ? `
          /* Custom layout styles */
          .doc-info { position: absolute; left: ${mmToPx(layout.docInfo.x)}; top: ${mmToPx(layout.docInfo.y)}; width: ${mmToPx(layout.docInfo.width)}; }
          .client-info { position: absolute; left: ${mmToPx(layout.clientInfo.x)}; top: ${mmToPx(layout.clientInfo.y)}; width: ${mmToPx(layout.clientInfo.width)}; }
          .table-container { position: absolute; left: ${mmToPx(layout.tableStart.x)}; top: ${mmToPx(layout.tableStart.y)}; width: ${mmToPx(layout.tableStart.width)}; }
          .totals-section { position: absolute; left: ${mmToPx(layout.totals.x)}; top: ${mmToPx(layout.totals.y)}; width: ${mmToPx(layout.totals.width)}; }
          .footer-section { position: absolute; left: ${mmToPx(layout.footer.x)}; top: ${mmToPx(layout.footer.y)}; width: ${mmToPx(layout.footer.width)}; }
        ` : '';

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Impression</title>
            <style>
              @page { size: A4; margin: 0; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: Arial, sans-serif;
                font-size: 10pt;
                width: 210mm;
                height: 297mm;
                position: relative;
                ${letterheadImage && useCustomLayout ? `background-image: url(${letterheadImage}); background-size: cover; background-position: center;` : ''}
              }
              .page-container {
                position: relative;
                width: 210mm;
                height: 297mm;
                padding: ${layout.margins.top}mm ${layout.margins.right}mm ${layout.margins.bottom}mm ${layout.margins.left}mm;
              }
              ${useCustomLayout && printLayout ? `
                .doc-info { position: absolute; left: ${mmToPx(layout.docInfo.x)}; top: ${mmToPx(layout.docInfo.y)}; width: ${mmToPx(layout.docInfo.width)}; text-align: right; }
                .client-info { position: absolute; left: ${mmToPx(layout.clientInfo.x)}; top: ${mmToPx(layout.clientInfo.y)}; width: ${mmToPx(layout.clientInfo.width)}; }
                .table-container { position: absolute; left: ${mmToPx(layout.tableStart.x)}; top: ${mmToPx(layout.tableStart.y)}; width: ${mmToPx(layout.tableStart.width)}; }
                .totals-section { position: absolute; left: ${mmToPx(layout.totals.x)}; top: ${mmToPx(layout.totals.y)}; width: ${mmToPx(layout.totals.width)}; text-align: right; }
                .footer-section { position: absolute; left: ${mmToPx(layout.footer.x)}; top: ${mmToPx(layout.footer.y)}; width: ${mmToPx(layout.footer.width)}; font-size: 8pt; }
              ` : `
                .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
                .company { text-align: left; }
                .company h1 { font-size: 18pt; color: #db2777; margin-bottom: 5px; }
                .company p { font-size: 10pt; color: #666; }
                .doc-info { text-align: right; }
                .doc-info h2 { font-size: 16pt; color: #333; margin-bottom: 5px; }
                .doc-info p { font-size: 10pt; }
                .parties { display: flex; justify-content: space-between; margin: 20px 0; }
                .client-info { width: 48%; padding: 10px; background: #f8f9fa; border-radius: 5px; }
                .client-info h3 { font-size: 10pt; color: #666; margin-bottom: 5px; }
                .client-info p { font-size: 11pt; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background: #db2777; color: white; padding: 10px; text-align: left; font-size: 10pt; }
                td { padding: 8px 10px; border-bottom: 1px solid #ddd; font-size: 10pt; }
                tr:nth-child(even) { background: #f8f9fa; }
                .totals-section { text-align: right; margin-top: 20px; }
                .totals-section p { margin: 5px 0; font-size: 11pt; }
                .totals-section .total-ttc { font-size: 14pt; font-weight: bold; color: #db2777; }
                .footer-section { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 9pt; color: #666; }
              `}
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <div class="page-container">
              ${printRef.current.innerHTML}
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  if (!documentData) return null;

  const getTitle = () => {
    switch (documentType) {
      case 'BL': return 'Bon de Livraison';
      case 'FC': return 'Facture Client';
      case 'FF': return 'Facture Fournisseur';
      case 'RC': return 'Règlement Client';
      case 'RF': return 'Règlement Fournisseur';
      default: return 'Document';
    }
  };

  const getNumero = () => documentData.numero || documentData.numeroFacture || '';

  const getTiers = () => documentData.client || documentData.fournisseur || {};

  const lignes = documentData.lignes || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Aperçu - {getTitle()}</DialogTitle>
            <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-mono font-bold">{code}-PRT</span>
          </div>
        </DialogHeader>

        <div className="flex gap-2 mb-4 flex-wrap">
          {printLayout && (
            <Button
              variant={useCustomLayout ? "default" : "outline"}
              onClick={() => setUseCustomLayout(!useCustomLayout)}
              className={useCustomLayout ? "bg-pink-600 hover:bg-pink-700" : ""}
            >
              <Settings className="w-4 h-4 mr-2" />
              {useCustomLayout ? 'Mise en page personnalisée' : 'Mise en page standard'}
            </Button>
          )}
          <Button onClick={handlePrint} className="bg-pink-600 hover:bg-pink-700">
            <Printer className="w-4 h-4 mr-2" /> Imprimer
          </Button>
        </div>

        {/* Preview */}
        <div
          ref={printRef}
          className="border rounded-lg bg-white relative overflow-hidden"
          style={{
            width: '210mm',
            height: '297mm',
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
            marginBottom: '-148.5mm', // Compensate for scale
            marginRight: '-105mm'
          }}
        >
          {/* Background image if letterhead */}
          {letterheadImage && useCustomLayout && (
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage: `url(${letterheadImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          )}

          {useCustomLayout && printLayout ? (
            /* Custom Layout Mode */
            <>
              {/* Document Info */}
              {layout.docInfo.visible && (
                <div className="doc-info absolute text-right" style={{
                  left: mmToPx(layout.docInfo.x),
                  top: mmToPx(layout.docInfo.y),
                  width: mmToPx(layout.docInfo.width)
                }}>
                  <h2 className="text-lg font-bold">{getTitle()}</h2>
                  <p className="font-bold text-pink-700">{getNumero()}</p>
                  <p className="text-sm">Date: {formatDate(documentData.dateBL || documentData.dateFacture || documentData.dateReglement)}</p>
                  {documentData.dateEcheance && (
                    <p className="text-sm">Échéance: {formatDate(documentData.dateEcheance)}</p>
                  )}
                </div>
              )}

              {/* Client Info */}
              {layout.clientInfo.visible && (
                <div className="client-info absolute" style={{
                  left: mmToPx(layout.clientInfo.x),
                  top: mmToPx(layout.clientInfo.y),
                  width: mmToPx(layout.clientInfo.width)
                }}>
                  <h3 className="text-xs text-gray-500 mb-1">{documentType === 'FF' || documentType === 'RF' ? 'FOURNISSEUR' : 'CLIENT'}</h3>
                  <p className="font-bold">{getTiers()?.raisonSociale}</p>
                  {getTiers()?.adresse && <p className="text-sm">{getTiers()?.adresse}</p>}
                  {getTiers()?.ville && <p className="text-sm">{getTiers()?.ville}</p>}
                  {getTiers()?.ice && <p className="text-sm">ICE: {getTiers()?.ice}</p>}
                </div>
              )}

              {/* Table */}
              {layout.tableStart.visible && lignes.length > 0 && (
                <div className="table-container absolute" style={{
                  left: mmToPx(layout.tableStart.x),
                  top: mmToPx(layout.tableStart.y),
                  width: mmToPx(layout.tableStart.width)
                }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-pink-700 text-white">
                        <th className="p-2 text-left text-xs">Désignation</th>
                        <th className="p-2 text-right text-xs w-16">Qté</th>
                        <th className="p-2 text-right text-xs w-20">P.U. HT</th>
                        {documentType !== 'BL' && <th className="p-2 text-right text-xs w-12">TVA</th>}
                        <th className="p-2 text-right text-xs w-24">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((l: any, i: number) => (
                        <tr key={i} className="border-b">
                          <td className="p-2 text-sm">{l.designation}</td>
                          <td className="p-2 text-right text-sm">{l.quantite}</td>
                          <td className="p-2 text-right text-sm">{formatCurrency(l.prixUnitaire)}</td>
                          {documentType !== 'BL' && <td className="p-2 text-right text-sm">{l.tauxTVA}%</td>}
                          <td className="p-2 text-right text-sm">{formatCurrency(l.totalHT)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              {layout.totals.visible && (
                <div className="totals-section absolute text-right" style={{
                  left: mmToPx(layout.totals.x),
                  top: mmToPx(layout.totals.y),
                  width: mmToPx(layout.totals.width)
                }}>
                  {documentData.totalHT !== undefined && (
                    <p>Total HT: <span className="font-bold">{formatCurrency(documentData.totalHT)}</span></p>
                  )}
                  {documentData.totalTVA !== undefined && documentData.totalTVA > 0 && (
                    <p>TVA: <span className="font-bold">{formatCurrency(documentData.totalTVA)}</span></p>
                  )}
                  {documentData.montantTVA !== undefined && documentData.montantTVA > 0 && (
                    <p>TVA: <span className="font-bold">{formatCurrency(documentData.montantTVA)}</span></p>
                  )}
                  {documentData.totalTTC !== undefined && (
                    <p className="text-lg font-bold text-pink-700">Total TTC: {formatCurrency(documentData.totalTTC)}</p>
                  )}
                  {documentData.montantTTC !== undefined && (
                    <p className="text-lg font-bold text-pink-700">Total TTC: {formatCurrency(documentData.montantTTC)}</p>
                  )}
                  {documentData.montant !== undefined && (
                    <p className="text-lg font-bold text-pink-700">Montant: {formatCurrency(documentData.montant)}</p>
                  )}
                </div>
              )}

              {/* Footer */}
              {layout.footer.visible && (
                <div className="footer-section absolute text-xs text-gray-500" style={{
                  left: mmToPx(layout.footer.x),
                  top: mmToPx(layout.footer.y),
                  width: mmToPx(layout.footer.width)
                }}>
                  <p>{entreprise?.nomEntreprise} - {entreprise?.villeEntreprise || ''}</p>
                  {entreprise?.ice && <p>ICE: {entreprise.ice}</p>}
                  {entreprise?.rc && <p>RC: {entreprise.rc} {entreprise?.rcLieu || ''}</p>}
                </div>
              )}
            </>
          ) : (
            /* Standard Layout Mode */
            <>
              {/* Header */}
              <div className="flex justify-between border-b-2 border-pink-700 pb-4 mb-6 p-6">
                <div>
                  <h1 className="text-xl font-bold text-pink-700">{entreprise?.nomEntreprise || 'Votre Entreprise'}</h1>
                  <p className="text-sm text-gray-600">
                    {entreprise?.adresseEntreprise}<br />
                    {entreprise?.villeEntreprise}<br />
                    Tél: {entreprise?.telephoneEntreprise || '-'}<br />
                    Email: {entreprise?.emailEntreprise || '-'}
                  </p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-bold">{getTitle()}</h2>
                  <p className="font-bold text-pink-700">{getNumero()}</p>
                  <p className="text-sm">Date: {formatDate(documentData.dateBL || documentData.dateFacture || documentData.dateReglement)}</p>
                  {documentData.dateEcheance && (
                    <p className="text-sm">Échéance: {formatDate(documentData.dateEcheance)}</p>
                  )}
                </div>
              </div>

              {/* Client/Fournisseur */}
              <div className="mb-6 p-4 bg-gray-50 rounded mx-6">
                <h3 className="text-xs text-gray-500 mb-1">{documentType === 'FF' || documentType === 'RF' ? 'FOURNISSEUR' : 'CLIENT'}</h3>
                <p className="font-bold">{getTiers()?.raisonSociale}</p>
                {getTiers()?.adresse && <p className="text-sm">{getTiers()?.adresse}</p>}
                {getTiers()?.ville && <p className="text-sm">{getTiers()?.ville}</p>}
                {getTiers()?.ice && <p className="text-sm">ICE: {getTiers()?.ice}</p>}
              </div>

              {/* Lines table */}
              {lignes.length > 0 && (
                <table className="w-full border-collapse mb-6 mx-6">
                  <thead>
                    <tr className="bg-pink-700 text-white">
                      <th className="p-2 text-left text-xs">Désignation</th>
                      <th className="p-2 text-right text-xs w-20">Qté</th>
                      <th className="p-2 text-right text-xs w-24">P.U. HT</th>
                      {documentType !== 'BL' && <th className="p-2 text-right text-xs w-16">TVA</th>}
                      <th className="p-2 text-right text-xs w-28">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 text-sm">{l.designation}</td>
                        <td className="p-2 text-right text-sm">{l.quantite}</td>
                        <td className="p-2 text-right text-sm">{formatCurrency(l.prixUnitaire)}</td>
                        {documentType !== 'BL' && <td className="p-2 text-right text-sm">{l.tauxTVA}%</td>}
                        <td className="p-2 text-right text-sm">{formatCurrency(l.totalHT)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Totals */}
              <div className="text-right space-y-1 mx-6">
                {documentData.totalHT !== undefined && (
                  <p>Total HT: <span className="font-bold">{formatCurrency(documentData.totalHT)}</span></p>
                )}
                {documentData.totalTVA !== undefined && documentData.totalTVA > 0 && (
                  <p>TVA: <span className="font-bold">{formatCurrency(documentData.totalTVA)}</span></p>
                )}
                {documentData.montantTVA !== undefined && documentData.montantTVA > 0 && (
                  <p>TVA: <span className="font-bold">{formatCurrency(documentData.montantTVA)}</span></p>
                )}
                {documentData.totalTTC !== undefined && (
                  <p className="text-lg font-bold text-pink-700">Total TTC: {formatCurrency(documentData.totalTTC)}</p>
                )}
                {documentData.montantTTC !== undefined && (
                  <p className="text-lg font-bold text-pink-700">Total TTC: {formatCurrency(documentData.montantTTC)}</p>
                )}
                {documentData.montant !== undefined && (
                  <p className="text-lg font-bold text-pink-700">Montant: {formatCurrency(documentData.montant)}</p>
                )}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t text-xs text-gray-500 mx-6">
                <p>{entreprise?.nomEntreprise} - {entreprise?.villeEntreprise || ''}</p>
                {entreprise?.ice && <p>ICE: {entreprise.ice}</p>}
                {entreprise?.rc && <p>RC: {entreprise.rc} {entreprise?.rcLieu || ''}</p>}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
