import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Function to generate a unique invoice number
async function genererNumeroUnique(): Promise<string> {
  const parametres = await prisma.parametres.findFirst();
  const prefixe = parametres?.prefixeFacture || 'FC';
  const numeroDepart = parametres?.numeroFactureDepart || 1;

  // Count existing invoices
  const count = await prisma.factureClient.count();
  let prochainNumero = numeroDepart + count;
  let numero = `${prefixe}${prochainNumero.toString().padStart(5, '0')}`;

  // Check if the number already exists and increment if necessary
  let existe = await prisma.factureClient.findUnique({ where: { numero } });
  while (existe) {
    prochainNumero++;
    numero = `${prefixe}${prochainNumero.toString().padStart(5, '0')}`;
    existe = await prisma.factureClient.findUnique({ where: { numero } });
  }

  return numero;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blIds } = body;

    if (!blIds || !Array.isArray(blIds) || blIds.length === 0) {
      return NextResponse.json({ error: 'Aucun BL sélectionné' }, { status: 400 });
    }

    // Fetch all selected BLs with details
    const bls = await prisma.bonLivraison.findMany({
      where: { id: { in: blIds } },
      include: { client: true, lignes: true }
    });

    if (bls.length !== blIds.length) {
      return NextResponse.json({ error: 'Certains BL n\'existent pas' }, { status: 404 });
    }

    // Validate all BLs
    for (const bl of bls) {
      if (bl.statut !== 'VALIDEE') {
        return NextResponse.json({ 
          error: `Le BL ${bl.numero} doit être validé avant d'être converti` 
        }, { status: 400 });
      }
      if (bl.factureId) {
        return NextResponse.json({ 
          error: `Le BL ${bl.numero} a déjà été facturé` 
        }, { status: 400 });
      }
    }

    // Check if all BLs have the same client
    const clientIds = [...new Set(bls.map(bl => bl.clientId))];
    if (clientIds.length > 1) {
      return NextResponse.json({ 
        error: 'Tous les BL sélectionnés doivent appartenir au même client' 
      }, { status: 400 });
    }

    // Generate unique invoice number
    const numeroFacture = await genererNumeroUnique();

    // Merge all lines and calculate totals
    let totalHT = 0;
    let totalTVA = 0;
    const allLignes: any[] = [];

    for (const bl of bls) {
      for (const l of bl.lignes) {
        const ligneHT = l.totalHT;
        const ligneTVA = ligneHT * 0.20; // Default 20% TVA
        totalHT += ligneHT;
        totalTVA += ligneTVA;
        allLignes.push({
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          tauxTVA: 20,
          totalHT: ligneHT,
          articleId: l.articleId
        });
      }
    }

    // Get first BL for common fields
    const firstBL = bls[0];
    const blNumbers = bls.map(bl => bl.numero).sort().join(', ');

    // Create the grouped invoice
    const facture = await prisma.factureClient.create({
      data: {
        numero: numeroFacture,
        dateFacture: new Date(),
        dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        clientId: firstBL.clientId,
        bonCommande: firstBL.bonCommande,
        numeroBL: blNumbers,
        totalHT,
        totalTVA,
        totalTTC: totalHT + totalTVA,
        statut: 'BROUILLON',
        notes: `Facture groupée créée depuis ${bls.length} BL: ${blNumbers}`,
        lignes: { create: allLignes }
      },
      include: { client: true, lignes: true }
    });

    // Update all BLs to mark as converted
    await prisma.bonLivraison.updateMany({
      where: { id: { in: blIds } },
      data: { 
        factureId: facture.id,
        infoLibre: `Converti en facture ${numeroFacture}`
      }
    });

    return NextResponse.json(facture);
  } catch (error: any) {
    console.error('Convert multiple error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
