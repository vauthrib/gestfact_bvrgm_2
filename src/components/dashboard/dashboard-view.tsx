'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Package, Truck, CreditCard, Receipt } from 'lucide-react';

const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

const getMonthName = (monthOffset: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthOffset);
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
};

const getMonthRange = (monthOffset: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthOffset);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
};

export function DashboardView() {
  const [stats, setStats] = useState({
    tiers: 0, articles: 0, facturesClients: 0, facturesFournisseurs: 0,
    bonsLivraison: 0, reglementsClients: 0, reglementsFournisseurs: 0
  });
  
  const [monthlyStats, setMonthlyStats] = useState({
    facturesClients: { m2: 0, m1: 0, m0: 0 },
    facturesFournisseurs: { m2: 0, m1: 0, m0: 0 },
    blNonFactures: { m2: 0, m1: 0, m0: 0 }
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [tiers, articles, fc, ff, bl, rc, rf] = await Promise.all([
          fetch('/api/tiers').then(r => r.json()).catch(() => []),
          fetch('/api/articles').then(r => r.json()).catch(() => []),
          fetch('/api/factures-clients').then(r => r.json()).catch(() => []),
          fetch('/api/factures-fournisseurs').then(r => r.json()).catch(() => []),
          fetch('/api/bons-livraison').then(r => r.json()).catch(() => []),
          fetch('/api/reglements-clients').then(r => r.json()).catch(() => []),
          fetch('/api/reglements-fournisseurs').then(r => r.json()).catch(() => []),
        ]);
        
        setStats({
          tiers: Array.isArray(tiers) ? tiers.length : 0,
          articles: Array.isArray(articles) ? articles.length : 0,
          facturesClients: Array.isArray(fc) ? fc.length : 0,
          facturesFournisseurs: Array.isArray(ff) ? ff.length : 0,
          bonsLivraison: Array.isArray(bl) ? bl.length : 0,
          reglementsClients: Array.isArray(rc) ? rc.length : 0,
          reglementsFournisseurs: Array.isArray(rf) ? rf.length : 0,
        });
        
        // Calculate monthly totals
        const calcMonthlyTotals = (items: any[], dateField: string, valueField: string = 'totalHT') => {
          const ranges = [getMonthRange(2), getMonthRange(1), getMonthRange(0)];
          return ranges.map(range => {
            return items
              .filter((item: any) => {
                const date = new Date(item[dateField]);
                return date >= range.start && date <= range.end;
              })
              .reduce((sum: number, item: any) => sum + (item[valueField] || 0), 0);
          });
        };
        
        const fcTotals = calcMonthlyTotals(Array.isArray(fc) ? fc : [], 'dateFacture');
        const ffTotals = calcMonthlyTotals(Array.isArray(ff) ? ff : [], 'dateFacture');
        
        // BL non facturés (sans factureId ou statut != 'FACTURE')
        const blNonFacturesData = Array.isArray(bl) ? bl.filter((b: any) => !b.factureId && b.statut !== 'FACTURE') : [];
        const blTotals = calcMonthlyTotals(blNonFacturesData, 'dateBL');
        
        setMonthlyStats({
          facturesClients: { m2: fcTotals[0], m1: fcTotals[1], m0: fcTotals[2] },
          facturesFournisseurs: { m2: ffTotals[0], m1: ffTotals[1], m0: ffTotals[2] },
          blNonFactures: { m2: blTotals[0], m1: blTotals[1], m0: blTotals[2] }
        });
      } catch (e) { console.error(e); }
    };
    fetchStats();
  }, []);

  // Monthly stats component
  const MonthlyStatBar = ({ data, label }: { data: { m2: number, m1: number, m0: number }, label: string }) => (
    <div className="bg-pink-50 rounded-lg p-3 mb-3 border border-pink-200">
      <div className="text-xs text-pink-600 font-medium mb-2">{label}</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-muted-foreground">{getMonthName(2)}</div>
          <div className="text-sm font-bold text-pink-700">{formatCurrency(data.m2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{getMonthName(1)}</div>
          <div className="text-sm font-bold text-pink-700">{formatCurrency(data.m1)}</div>
        </div>
        <div className="bg-pink-100 rounded px-1">
          <div className="text-xs text-pink-600 font-medium">{getMonthName(0)}</div>
          <div className="text-sm font-bold text-pink-800">{formatCurrency(data.m0)}</div>
        </div>
      </div>
    </div>
  );

  const cards = [
    { 
      title: 'Tiers', 
      value: stats.tiers, 
      icon: <Users className="w-5 h-5 text-pink-500" />,
      monthlyStats: <MonthlyStatBar data={monthlyStats.facturesClients} label="Total HT Factures Clients" />
    },
    { 
      title: 'Articles', 
      value: stats.articles, 
      icon: <Package className="w-5 h-5 text-pink-500" />,
      monthlyStats: <MonthlyStatBar data={monthlyStats.facturesFournisseurs} label="Total HT Factures Fourn." />
    },
    { 
      title: 'Factures Clients', 
      value: stats.facturesClients, 
      icon: <FileText className="w-5 h-5 text-pink-500" />,
      monthlyStats: <MonthlyStatBar data={monthlyStats.blNonFactures} label="Total HT BL non facturés" />
    },
    { 
      title: 'Factures Fourn.', 
      value: stats.facturesFournisseurs, 
      icon: <Receipt className="w-5 h-5 text-pink-500" /> 
    },
    { 
      title: 'Bons de Livraison', 
      value: stats.bonsLivraison, 
      icon: <Truck className="w-5 h-5 text-pink-500" /> 
    },
    { 
      title: 'Règlements', 
      value: stats.reglementsClients + stats.reglementsFournisseurs, 
      icon: <CreditCard className="w-5 h-5 text-pink-500" /> 
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pink-700">Tableau de bord</h1>
          <p className="text-muted-foreground">Bienvenue sur SRGA V1.84</p>
        </div>
        <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-mono font-bold">TDB01</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            {card.monthlyStats && (
              <div className="px-4 pt-4">
                {card.monthlyStats}
              </div>
            )}
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{card.value}</div></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
