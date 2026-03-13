import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    // Vérifier le code de sécurité (code import: 4444)
    if (code !== '4444') {
      return NextResponse.json({ error: 'Code incorrect' }, { status: 401 });
    }

    // Supprimer dans l'ordre pour respecter les contraintes de clé étrangère
    // 1. Lignes de factures clients
    await prisma.ligneFactureClient.deleteMany({});
    
    // 2. Lignes de bons de livraison
    await prisma.ligneBonLivraison.deleteMany({});
    
    // 3. Règlements clients
    await prisma.reglementClient.deleteMany({});
    
    // 4. Règlements fournisseurs
    await prisma.reglementFournisseur.deleteMany({});
    
    // 5. Factures clients
    await prisma.factureClient.deleteMany({});
    
    // 6. Factures fournisseurs
    await prisma.factureFournisseur.deleteMany({});
    
    // 7. Bons de livraison
    await prisma.bonLivraison.deleteMany({});
    
    // 8. Articles
    await prisma.article.deleteMany({});
    
    // 9. Tiers
    await prisma.tiers.deleteMany({});
    
    // 10. Paramètres (optionnel - on peut les garder)
    // await prisma.parametres.deleteMany({});

    return NextResponse.json({ 
      success: true, 
      message: 'Toutes les données ont été supprimées avec succès' 
    });
  } catch (error: any) {
    console.error('Erreur lors de la suppression des données:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
