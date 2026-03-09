import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const parseNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).replace(',', '.').replace(/\s/g, '');
  return parseFloat(str) || 0;
};

const parseDate = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  const str = String(val);
  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str);
  }
  // Try DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return new Date(`${y}-${m}-${d}`);
  }
  return new Date(str);
};

const parseBool = (val: any): boolean => {
  if (typeof val === 'boolean') return val;
  const str = String(val).toLowerCase();
  return str === 'true' || str === '1' || str === 'oui' || str === 'yes';
};

async function parseCSV(text: string): Promise<Record<string, string>[]> {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length >= headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => row[h] = values[idx] || '');
      rows.push(row);
    }
  }
  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file || !type) {
      return NextResponse.json({ error: 'Fichier ou type manquant' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase();

    let rows: Record<string, any>[] = [];

    // Parse file content
    if (ext === 'csv') {
      const text = buffer.toString('utf-8');
      rows = await parseCSV(text);
    } else if (ext === 'xls' || ext === 'xlsx') {
      // For XLS/XLSX, we'll use a simple approach with xlsx library
      // For now, parse as CSV if it's actually text-based
      try {
        const text = buffer.toString('utf-8');
        rows = await parseCSV(text);
      } catch {
        return NextResponse.json({ error: 'Format XLS/XLSX nécessite une conversion en CSV' }, { status: 400 });
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Aucune donnée trouvée dans le fichier' }, { status: 400 });
    }

    let count = 0;

    switch (type) {
      case 'tiers': {
        for (const row of rows) {
          if (!row.code || !row.raisonSociale) continue;
          try {
            await prisma.tiers.upsert({
              where: { code: row.code },
              create: {
                code: row.code,
                type: row.type?.toUpperCase() || 'CLIENT',
                raisonSociale: row.raisonSociale,
                adresse: row.adresse || null,
                codePostal: row.codePostal || null,
                ville: row.ville || null,
                telephone: row.telephone || null,
                email: row.email || null,
                ice: row.ice || null,
                rc: row.rc || null,
              },
              update: {
                type: row.type?.toUpperCase() || 'CLIENT',
                raisonSociale: row.raisonSociale,
                adresse: row.adresse || null,
                ville: row.ville || null,
                telephone: row.telephone || null,
                email: row.email || null,
                ice: row.ice || null,
                rc: row.rc || null,
              }
            });
            count++;
          } catch (e) { console.error('Error importing tier:', e); }
        }
        break;
      }

      case 'articles': {
        for (const row of rows) {
          if (!row.code || !row.designation) continue;
          try {
            await prisma.article.upsert({
              where: { code: row.code },
              create: {
                code: row.code,
                designation: row.designation,
                prixUnitaire: parseNumber(row.prixUnitaire),
                unite: row.unite || 'pièce',
                tauxTVA: parseNumber(row.tauxTVA) || 20,
                actif: parseBool(row.actif),
                infoLibre: row.infoLibre || null,
              },
              update: {
                designation: row.designation,
                prixUnitaire: parseNumber(row.prixUnitaire),
                unite: row.unite || 'pièce',
                tauxTVA: parseNumber(row.tauxTVA) || 20,
                actif: parseBool(row.actif),
              }
            });
            count++;
          } catch (e) { console.error('Error importing article:', e); }
        }
        break;
      }

      case 'factures-clients': {
        for (const row of rows) {
          if (!row.numero || !row.codeClient) continue;
          try {
            const client = await prisma.tiers.findFirst({
              where: { code: row.codeClient, type: 'CLIENT' }
            });
            if (!client) continue;

            await prisma.factureClient.upsert({
              where: { numero: row.numero },
              create: {
                numero: row.numero,
                dateFacture: parseDate(row.dateFacture),
                clientId: client.id,
                dateEcheance: parseDate(row.dateEcheance || row.dateFacture),
                statut: row.statut || 'BROUILLON',
                totalHT: parseNumber(row.totalHT),
                totalTVA: parseNumber(row.totalTVA),
                totalTTC: parseNumber(row.totalHT) + parseNumber(row.totalTVA),
              },
              update: {
                dateFacture: parseDate(row.dateFacture),
                dateEcheance: parseDate(row.dateEcheance || row.dateFacture),
              }
            });
            count++;
          } catch (e) { console.error('Error importing facture client:', e); }
        }
        break;
      }

      case 'factures-fournisseurs': {
        for (const row of rows) {
          if (!row.numeroFacture || !row.codeFournisseur) continue;
          try {
            const fournisseur = await prisma.tiers.findFirst({
              where: { code: row.codeFournisseur, type: 'FOURNISSEUR' }
            });
            if (!fournisseur) continue;

            const montantHT = parseNumber(row.montantHT);
            const montantTVA = parseNumber(row.montantTVA);

            await prisma.factureFournisseur.create({
              data: {
                numeroFacture: row.numeroFacture,
                fournisseurId: fournisseur.id,
                dateFacture: parseDate(row.dateFacture),
                dateEcheance: parseDate(row.dateEcheance || row.dateFacture),
                montantHT,
                montantTVA,
                montantTTC: montantHT + montantTVA,
                statut: row.statut || 'ENREGISTREE',
              }
            });
            count++;
          } catch (e) { console.error('Error importing facture fournisseur:', e); }
        }
        break;
      }

      case 'reglements-clients': {
        for (const row of rows) {
          if (!row.numero || !row.numeroFacture) continue;
          try {
            const facture = await prisma.factureClient.findFirst({
              where: { numero: row.numeroFacture }
            });
            if (!facture) continue;

            await prisma.reglementClient.create({
              data: {
                numero: row.numero,
                factureId: facture.id,
                dateReglement: parseDate(row.dateReglement),
                montant: parseNumber(row.montant),
                modePaiement: row.modePaiement || 'VIREMENT',
                reference: row.reference || null,
              }
            });
            count++;
          } catch (e) { console.error('Error importing reglement client:', e); }
        }
        break;
      }

      case 'reglements-fournisseurs': {
        for (const row of rows) {
          if (!row.numeroFacture) continue;
          try {
            const facture = await prisma.factureFournisseur.findFirst({
              where: { numeroFacture: row.numeroFacture }
            });
            if (!facture) continue;

            await prisma.reglementFournisseur.create({
              data: {
                factureId: facture.id,
                dateReglement: parseDate(row.dateReglement),
                montant: parseNumber(row.montant),
                modePaiement: row.modePaiement || 'VIREMENT',
                reference: row.reference || null,
              }
            });
            count++;
          } catch (e) { console.error('Error importing reglement fournisseur:', e); }
        }
        break;
      }

      case 'bons-livraison': {
        for (const row of rows) {
          if (!row.numero || !row.codeClient) continue;
          try {
            const client = await prisma.tiers.findFirst({
              where: { code: row.codeClient, type: 'CLIENT' }
            });
            if (!client) continue;

            await prisma.bonLivraison.upsert({
              where: { numero: row.numero },
              create: {
                numero: row.numero,
                dateBL: parseDate(row.dateBL),
                clientId: client.id,
                statut: row.statut || 'BROUILLON',
                totalHT: parseNumber(row.totalHT),
              },
              update: {
                dateBL: parseDate(row.dateBL),
              }
            });
            count++;
          } catch (e) { console.error('Error importing bon livraison:', e); }
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Type non supporté' }, { status: 400 });
    }

    return NextResponse.json({ success: true, count });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de l\'import' }, { status: 500 });
  }
}
