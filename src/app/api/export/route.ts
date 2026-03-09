import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const format = searchParams.get('format') || 'csv';

    let data: any[] = [];
    let headers: string[] = [];
    let filename = 'export';

    switch (type) {
      case 'tiers':
        data = await prisma.tiers.findMany();
        headers = ['code', 'type', 'raisonSociale', 'adresse', 'codePostal', 'ville', 'telephone', 'email', 'ice', 'rc'];
        filename = 'tiers';
        break;
      case 'articles':
        data = await prisma.article.findMany();
        headers = ['code', 'designation', 'prixUnitaire', 'unite', 'tauxTVA', 'actif'];
        filename = 'articles';
        break;
      case 'factures-clients':
        data = await prisma.factureClient.findMany({ include: { client: true } });
        headers = ['numero', 'dateFacture', 'codeClient', 'dateEcheance', 'totalHT', 'totalTVA', 'totalTTC', 'statut'];
        filename = 'factures_clients';
        break;
      case 'reglements-clients':
        data = await prisma.reglementClient.findMany({ include: { facture: { include: { client: true } } } });
        headers = ['numero', 'dateReglement', 'numeroFacture', 'montant', 'modePaiement', 'reference'];
        filename = 'reglements_clients';
        break;
      case 'factures-fournisseurs':
        data = await prisma.factureFournisseur.findMany({ include: { fournisseur: true } });
        headers = ['numeroFacture', 'dateFacture', 'codeFournisseur', 'dateEcheance', 'montantHT', 'montantTVA', 'montantTTC', 'statut'];
        filename = 'factures_fournisseurs';
        break;
      case 'reglements-fournisseurs':
        data = await prisma.reglementFournisseur.findMany({ include: { facture: { include: { fournisseur: true } } } });
        headers = ['dateReglement', 'numeroFacture', 'montant', 'modePaiement', 'reference'];
        filename = 'reglements_fournisseurs';
        break;
      case 'bons-livraison':
        data = await prisma.bonLivraison.findMany({ include: { client: true } });
        headers = ['numero', 'dateBL', 'codeClient', 'totalHT', 'statut'];
        filename = 'bons_livraison';
        break;
      default:
        return NextResponse.json({ error: 'Type non supporté' }, { status: 400 });
    }

    // Transform data for export
    const rows = data.map(row => {
      const values: Record<string, string> = {};
      for (const h of headers) {
        let val: any = row;
        for (const part of h.split('.')) {
          val = val?.[part];
        }
        if (val === null || val === undefined) {
          values[h] = '';
        } else if (typeof val === 'object' && 'raisonSociale' in val) {
          values[h] = val.raisonSociale;
        } else if (typeof val === 'object' && 'numero' in val) {
          values[h] = val.numero;
        } else if (typeof val === 'object' && 'numeroFacture' in val) {
          values[h] = val.numeroFacture;
        } else if (typeof val === 'object' && 'code' in val) {
          values[h] = val.code;
        } else if (h === 'codeClient' || h === 'codeFournisseur') {
          // Get the code from the related entity
          const entity = row.client || row.fournisseur;
          values[h] = entity?.code || '';
        } else {
          values[h] = String(val);
        }
      }
      return values;
    });

    if (format === 'csv') {
      const csvRows = [headers.join(';')];
      for (const row of rows) {
        const values = headers.map(h => String(row[h] || '').replace(/;/g, ',').replace(/\n/g, ' '));
        csvRows.push(values.join(';'));
      }
      const csv = csvRows.join('\n');
      const bom = '\uFEFF';

      return new NextResponse(bom + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      });
    } else if (format === 'xls') {
      // Generate simple HTML table that Excel can open
      let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">';
      html += '<head><meta charset="utf-8"></head><body>';
      html += '<table border="1">';
      html += '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
      for (const row of rows) {
        html += '<tr>' + headers.map(h => `<td>${String(row[h] || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('') + '</tr>';
      }
      html += '</table></body></html>';

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.xls"`
        }
      });
    } else if (format === 'xlsx') {
      // Same as XLS but with xlsx extension - will work in modern Excel
      let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">';
      html += '<head><meta charset="utf-8"></head><body>';
      html += '<table border="1">';
      html += '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
      for (const row of rows) {
        html += '<tr>' + headers.map(h => `<td>${String(row[h] || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('') + '</tr>';
      }
      html += '</table></body></html>';

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`
        }
      });
    }

    return NextResponse.json({ error: 'Format non supporté' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
