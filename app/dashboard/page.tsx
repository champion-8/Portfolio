'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import AddAssetModal from '@/components/AddAssetModal';
import PortfolioChart from '@/components/PortfolioChart';
import PortfolioCompositionChart from '@/components/PortfolioCompositionChart';
import Loading from '@/components/Loading';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  fullName: string | null;
}

interface PortfolioItem {
  id: string;
  assetType: 'fund' | 'stock' | 'crypto';
  assetId: string;
  assetName: string;
  quantity: number;
  avgBuyPrice: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
  notes: string | null;
  assetDetails?: Record<string, unknown>;
}

interface Summary {
  totalCost: number;
  totalValue: number;
  totalProfit: number;
  totalProfitPercent: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalCost: 0,
    totalValue: 0,
    totalProfit: 0,
    totalProfitPercent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<PortfolioItem | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [sortField, setSortField] = useState<keyof PortfolioItem | 'none'>('none');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [language, setLanguage] = useState<'th' | 'en'>('en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Translations
  const t = {
    portfolio: language === 'th' ? 'พอร์ตโฟลิโอ' : 'Portfolio',
    admin: language === 'th' ? 'ผู้ดูแล' : 'Admin',
    profile: language === 'th' ? 'โปรไฟล์' : 'Profile',
    logout: language === 'th' ? 'ออกจากระบบ' : 'Logout',
    totalValue: language === 'th' ? 'มูลค่ารวม' : 'Total Value',
    totalCost: language === 'th' ? 'ต้นทุนรวม' : 'Total Cost',
    profitLoss: language === 'th' ? 'กำไร/ขาดทุน' : 'Profit/Loss',
    percentage: language === 'th' ? 'เปอร์เซ็นต์' : 'Percentage',
    portfolioTrend: language === 'th' ? 'แนวโน้มพอร์ต' : 'Portfolio Trend',
    dayProgress: language === 'th' ? 'แนวโน้ม 30 วัน' : '30-day progression',
    composition: language === 'th' ? 'สัดส่วน' : 'Composition',
    distributionByType: language === 'th' ? 'แบ่งตามประเภท' : 'Distribution by type',
    yourPortfolio: language === 'th' ? 'พอร์ตของคุณ' : 'Your Portfolio',
    syncPrices: language === 'th' ? 'อัปเดตราคา' : 'Sync Prices',
    syncing: language === 'th' ? 'กำลังอัปเดตราคา...' : 'Syncing...',
    addAsset: language === 'th' ? 'เพิ่มสินทรัพย์' : 'Add Asset',
    sortBy: language === 'th' ? 'เรียงตาม:' : 'Sort by:',
    loading: language === 'th' ? 'กำลังโหลด...' : 'Loading...',
    sortDefault: language === 'th' ? 'ค่าเริ่มต้น' : 'Default',
    sortName: language === 'th' ? 'ชื่อ' : 'Name',
    sortType: language === 'th' ? 'ประเภท' : 'Type',
    sortValue: language === 'th' ? 'มูลค่า' : 'Value',
    sortProfit: language === 'th' ? 'กำไร/ขาดทุน' : 'Profit/Loss',
    sortProfitPercent: language === 'th' ? 'กำไร %' : 'P/L %',
    sortQuantity: language === 'th' ? 'จำนวน' : 'Quantity',
    sortCurrentPrice: language === 'th' ? 'ราคาปัจจุบัน' : 'Current Price',
  };

  useEffect(() => {
    fetchUserAndPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserAndPortfolio = async () => {
    try {
      const res = await fetch('/api/auth/profile');
      const data = await res.json();
      
      if (data.success) {
        setUser(data.user);
        await fetchPortfolio();
      }
    } catch {
      console.error('Failed to fetch user');
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('/api/portfolio');
      const data = await res.json();

      if (data.success) {
        setPortfolio(data.portfolio);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    }
  };

  const handleDeleteAsset = async (portfolioId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบ Asset นี้?')) return;

    try {
      const res = await fetch(`/api/portfolio?id=${portfolioId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        await fetchPortfolio();
      } else {
        alert(data.error || 'Cannot delete asset');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const handleEditAsset = (asset: PortfolioItem) => {
    setEditingAsset(asset);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      router.push('/signin');
      router.refresh();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleSyncPrices = async () => {
    setSyncing(true);
    setSyncMessage('');
    
    try {
      const res = await fetch('/api/portfolio/sync-prices', {
        method: 'POST',
      });
      
      const data = await res.json();
      
      if (data.success) {
        const { summary: syncSummary } = data;
        
        // Show sync results
        const messages = [];
        if (syncSummary.updated > 0) {
          messages.push(`✓ Updated ${syncSummary.updated} price(s)`);
        }
        if (syncSummary.cached > 0) {
          messages.push(`⚡ ${syncSummary.cached} using cache`);
        }
        if (syncSummary.failed > 0) {
          messages.push(`✗ ${syncSummary.failed} failed`);
        }
        
        setSyncMessage(messages.join(' • '));
        
        // Refresh portfolio data
        await fetchPortfolio();
        
        // Clear message after 5 seconds
        setTimeout(() => setSyncMessage(''), 5000);
      } else {
        setSyncMessage('✗ Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncMessage('✗ Sync error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSort = (field: keyof PortfolioItem) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending for most fields
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedPortfolio = [...portfolio].sort((a, b) => {
    if (sortField === 'none') return 0;

    const aValue = a[sortField];
    const bValue = b[sortField];

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-purple-100">
      {/* Header - Compact Minimal Design */}
      <header className="bg-purple-700 backdrop-blur-sm border-b border-purple-300 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-3">
          <div className="flex items-center justify-between relative">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center border border-purple-300">
                <Icon icon="solar:wallet-2-bold-duotone" className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-purple-50">
                  {t.portfolio}
                </h1>
                <p className="text-xs text-purple-200">
                  {user?.fullName || user?.username}
                </p>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Language Toggle */}
              <button
                onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
                className="px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-1.5 font-medium cursor-pointer border border-purple-200 hover:border-purple-300"
              >
                <Icon icon="ic:baseline-language" className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'EN' : 'TH'}</span>
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-1.5 font-medium cursor-pointer border border-purple-200 hover:border-purple-300"
                >
                  <Icon icon="solar:settings-bold-duotone" className="w-3.5 h-3.5" />
                  <span>{t.admin}</span>
                </button>
              )}
              <button
                onClick={() => router.push('/profile')}
                className="px-3 py-2 text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-gray-200 hover:border-gray-300"
              >
                <Icon icon="solar:user-bold-duotone" className="w-3.5 h-3.5" />
                <span>{t.profile}</span>
              </button>
              <button
                onClick={handleSignOut}
                className="px-3 py-2 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-red-200 hover:border-red-300"
              >
                <Icon icon="solar:logout-2-bold-duotone" className="w-3.5 h-3.5" />
                <span>{t.logout}</span>
              </button>
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden px-2 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all cursor-pointer border border-purple-200"
            >
              <Icon icon={mobileMenuOpen ? "solar:close-circle-bold" : "solar:hamburger-menu-bold"} className="w-5 h-5" />
            </button>

            {/* Floating Mobile Menu */}
            {mobileMenuOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="sm:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                  onClick={() => setMobileMenuOpen(false)}
                />
                
                {/* Floating Menu Card */}
                <div className="sm:hidden absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-purple-100 z-50 animate-scale-in">
                  <div className="p-3 space-y-2">
                    <button
                      onClick={() => { setLanguage(language === 'th' ? 'en' : 'th'); setMobileMenuOpen(false); }}
                      className="w-full px-3 py-2.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-2 font-medium cursor-pointer border border-purple-200"
                    >
                      <Icon icon="ic:baseline-language" className="w-4 h-4" />
                      <span>{language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นไทย'}</span>
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => { router.push('/admin'); setMobileMenuOpen(false); }}
                        className="w-full px-3 py-2.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-2 font-medium cursor-pointer border border-purple-200"
                      >
                        <Icon icon="solar:settings-bold-duotone" className="w-4 h-4" />
                        <span>{t.admin}</span>
                      </button>
                    )}
                    <button
                      onClick={() => { router.push('/profile'); setMobileMenuOpen(false); }}
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-2 cursor-pointer border border-gray-200"
                    >
                      <Icon icon="solar:user-bold-duotone" className="w-4 h-4" />
                      <span>{t.profile}</span>
                    </button>
                    <button
                      onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                      className="w-full px-3 py-2.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all flex items-center gap-2 cursor-pointer border border-red-200"
                    >
                      <Icon icon="solar:logout-2-bold-duotone" className="w-4 h-4" />
                      <span>{t.logout}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Clean White Space */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-5 space-y-3">
        
        {/* Summary Cards - Compact Design */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Value */}
          <div className="card-1 p-5 hover:scale-[1.01] transform transition-all duration-300">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Icon icon="solar:wallet-money-bold-duotone" className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{t.totalValue}</p>
                <p className="text-xs sm:text-xl font-bold text-gray-900">
                  ฿{summary.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Total Cost */}
          <div className="card-2 p-5 hover:scale-[1.01] transform transition-all duration-300">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Icon icon="solar:calculator-bold-duotone" className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{t.totalCost}</p>
                <p className="text-xs sm:text-xl font-bold text-gray-900">
                  ฿{summary.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Profit/Loss */}
          <div className="card-3 p-5 hover:scale-[1.01] transform transition-all duration-300">
            <div className="flex flex-col gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                summary.totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Icon 
                  icon={summary.totalProfit >= 0 ? "solar:graph-up-bold-duotone" : "solar:graph-down-bold-duotone"} 
                  className={`w-5 h-5 ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{t.profitLoss}</p>
                <p className={`text-xs sm:text-xl font-bold ${
                  summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {summary.totalProfit >= 0 ? '+' : ''}฿{summary.totalProfit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Percentage */}
          <div className="card-4 p-5 hover:scale-[1.01] transform transition-all duration-300">
            <div className="flex flex-col gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                summary.totalProfitPercent >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Icon 
                  icon="solar:chart-bold-duotone" 
                  className={`w-5 h-5 ${summary.totalProfitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{t.percentage}</p>
                <p className={`text-xs sm:text-xl font-bold ${
                  summary.totalProfitPercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {summary.totalProfitPercent >= 0 ? '+' : ''}{summary.totalProfitPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Charts - Compact Design */}
        {portfolio.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Trend Chart */}
            <div className="card-5 p-5 lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Icon icon="hugeicons:chart-no-axes-combined" className="w-4 h-4 text-purple-600" />
                  </div>
                  {t.portfolioTrend}
                </h2>
                <p className="text-xs text-gray-500 ml-10 mt-1">{t.dayProgress}</p>
              </div>
              <PortfolioChart 
                totalValue={summary.totalValue} 
                totalCost={summary.totalCost} 
              />
            </div>

            {/* Composition Chart */}
            <div className="card-6 p-5">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Icon icon="hugeicons:pie-chart-02" className="w-4 h-4 text-purple-600" />
                  </div>
                  {t.composition}
                </h2>
                <p className="text-xs text-gray-500 ml-10 mt-1">{t.distributionByType}</p>
              </div>
              <PortfolioCompositionChart 
                portfolio={portfolio}
                mode="type"
              />
            </div>
          </div>
        )}

        {/* Your Portfolio Section - Compact */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-9 h-9 bg-purple-200 rounded-xl flex items-center justify-center border border-purple-300">
                <Icon icon="hugeicons:pie-chart-08" className="w-5 h-5 text-purple-600" />
              </div>
              {t.yourPortfolio}
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {portfolio.length > 0 && (
                <button
                  onClick={handleSyncPrices}
                  disabled={syncing}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 flex-1 sm:flex-initial justify-center text-sm cursor-pointer border border-purple-200 hover:border-purple-300"
                >
                  {syncing ? (
                    <>
                      <Icon icon="hugeicons:refresh-03" className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">{t.syncing}</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Icon icon="hugeicons:refresh-03" className="w-4 h-4" />
                      <span className="hidden sm:inline">{t.syncPrices}</span>
                      <span className="sm:hidden">Sync</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 flex-1 sm:flex-initial justify-center text-sm cursor-pointer"
              >
                <Icon icon="hugeicons:add-circle" className="w-4 h-4" />
                <span className="hidden sm:inline">{t.addAsset}</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>

          {/* Sort Dropdown - Mobile with Floating Menu */}
          {portfolio.length > 0 && (
            <div className="lg:hidden relative">
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
                <Icon icon="solar:sort-bold-duotone" className="w-6 h-6 text-purple-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-700">{t.sortBy}</span>
                <button
                  onClick={() => setSortMenuOpen(!sortMenuOpen)}
                  className="flex-1 px-4 py-2 bg-white border border-purple-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-purple-50 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span>{sortField === 'none' ? t.sortDefault : 
                    sortField === 'assetName' ? t.sortName :
                    sortField === 'assetType' ? t.sortType :
                    sortField === 'currentValue' ? t.sortValue :
                    sortField === 'profit' ? t.sortProfit :
                    sortField === 'profitPercent' ? t.sortProfitPercent :
                    sortField === 'quantity' ? t.sortQuantity :
                    sortField === 'currentPrice' ? t.sortCurrentPrice : t.sortDefault
                  }</span>
                  <Icon icon={sortMenuOpen ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"} className="w-4 h-4" />
                </button>
                {sortField !== 'none' && (
                  <button
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-all cursor-pointer"
                    title={`Sort ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
                  >
                    <Icon icon={sortDirection === 'asc' ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Floating Sort Menu */}
              {sortMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setSortMenuOpen(false)}
                  />
                  
                  {/* Floating Menu Card */}
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-purple-100 z-50 animate-scale-in">
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => { setSortField('none'); setSortMenuOpen(false); }}
                        className={`w-full px-4 py-2.5 text-sm rounded-lg text-left transition-all cursor-pointer ${
                          sortField === 'none' 
                            ? 'bg-purple-100 text-purple-700 font-medium' 
                            : 'text-gray-700 hover:bg-purple-50'
                        }`}
                      >
                        {t.sortDefault}
                      </button>
                      <button
                        onClick={() => { handleSort('assetName'); setSortMenuOpen(false); }}
                        className={`w-full px-4 py-2.5 text-sm rounded-lg text-left transition-all cursor-pointer ${
                          sortField === 'assetName' 
                            ? 'bg-purple-100 text-purple-700 font-medium' 
                            : 'text-gray-700 hover:bg-purple-50'
                        }`}
                      >
                        {t.sortName}
                      </button>
                      <button
                        onClick={() => { handleSort('assetType'); setSortMenuOpen(false); }}
                        className={`w-full px-4 py-2.5 text-sm rounded-lg text-left transition-all cursor-pointer ${
                          sortField === 'assetType' 
                            ? 'bg-purple-100 text-purple-700 font-medium' 
                            : 'text-gray-700 hover:bg-purple-50'
                        }`}
                      >
                        {t.sortType}
                      </button>
                      <button
                        onClick={() => { handleSort('currentValue'); setSortMenuOpen(false); }}
                        className={`w-full px-4 py-2.5 text-sm rounded-lg text-left transition-all cursor-pointer ${
                          sortField === 'currentValue' 
                            ? 'bg-purple-100 text-purple-700 font-medium' 
                            : 'text-gray-700 hover:bg-purple-50'
                        }`}
                      >
                        {t.sortValue}
                      </button>
                      <button
                        onClick={() => { handleSort('profit'); setSortMenuOpen(false); }}
                        className={`w-full px-4 py-2.5 text-sm rounded-lg text-left transition-all cursor-pointer ${
                          sortField === 'profit' 
                            ? 'bg-purple-100 text-purple-700 font-medium' 
                            : 'text-gray-700 hover:bg-purple-50'
                        }`}
                      >
                        {t.sortProfit}
                      </button>
                      <button
                        onClick={() => { handleSort('profitPercent'); setSortMenuOpen(false); }}
                        className={`w-full px-4 py-2.5 text-sm rounded-lg text-left transition-all cursor-pointer ${
                          sortField === 'profitPercent' 
                            ? 'bg-purple-100 text-purple-700 font-medium' 
                            : 'text-gray-700 hover:bg-purple-50'
                        }`}
                      >
                        {t.sortProfitPercent}
                      </button>
                      <button
                        onClick={() => { handleSort('quantity'); setSortMenuOpen(false); }}
                        className={`w-full px-4 py-2.5 text-sm rounded-lg text-left transition-all cursor-pointer ${
                          sortField === 'quantity' 
                            ? 'bg-purple-100 text-purple-700 font-medium' 
                            : 'text-gray-700 hover:bg-purple-50'
                        }`}
                      >
                        {t.sortQuantity}
                      </button>
                      <button
                        onClick={() => { handleSort('currentPrice'); setSortMenuOpen(false); }}
                        className={`w-full px-4 py-2.5 text-sm rounded-lg text-left transition-all cursor-pointer ${
                          sortField === 'currentPrice' 
                            ? 'bg-purple-100 text-purple-700 font-medium' 
                            : 'text-gray-700 hover:bg-purple-50'
                        }`}
                      >
                        {t.sortCurrentPrice}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sync Message */}
        {syncMessage && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-700 flex items-center gap-3 animate-fade-in">
            <Icon icon="solar:info-circle-bold-duotone" className="w-5 h-5 flex-shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Portfolio Table/Cards - Minimal Clean Design */}
        {portfolio.length === 0 ? (
          <div className="card-1 p-16 text-center">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon icon="solar:document-add-bold-duotone" className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Investments Yet</h3>
            <p className="text-sm text-gray-500 mb-8">Start building your portfolio by adding your first asset</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all inline-flex items-center gap-2"
            >
              <Icon icon="solar:add-circle-bold-duotone" className="w-5 h-5" />
              Add First Asset
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View - Minimal Clean */}
            <div className="hidden lg:block card-1 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-purple-50 border-b-2 border-purple-100">
                    <tr>
                      <th className="px-6 py-4 text-sm text-left font-bold text-gray-900">
                        <button onClick={() => handleSort('assetName')} className="flex items-center gap-1.5 hover:text-purple-600 transition-colors cursor-pointer">
                          Asset
                          {sortField === 'assetName' && (
                            <Icon icon={sortDirection === 'asc' ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-sm text-center font-bold text-gray-900">
                        <button onClick={() => handleSort('assetType')} className="flex items-center gap-1.5 justify-center w-full hover:text-purple-600 transition-colors cursor-pointer">
                          Type
                          {sortField === 'assetType' && (
                            <Icon icon={sortDirection === 'asc' ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                        <button onClick={() => handleSort('quantity')} className="flex items-center gap-1.5 justify-end w-full hover:text-purple-600 transition-colors cursor-pointer">
                          Quantity
                          {sortField === 'quantity' && (
                            <Icon icon={sortDirection === 'asc' ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                        <button onClick={() => handleSort('avgBuyPrice')} className="flex items-center gap-1.5 justify-end w-full hover:text-purple-600 transition-colors cursor-pointer">
                          Cost/Unit
                          {sortField === 'avgBuyPrice' && (
                            <Icon icon={sortDirection === 'asc' ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                        <button onClick={() => handleSort('currentPrice')} className="flex items-center gap-1.5 justify-end w-full hover:text-purple-600 transition-colors cursor-pointer">
                          Current
                          {sortField === 'currentPrice' && (
                            <Icon icon={sortDirection === 'asc' ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                        <button onClick={() => handleSort('currentValue')} className="flex items-center gap-1.5 justify-end w-full hover:text-purple-600 transition-colors cursor-pointer">
                          Value
                          {sortField === 'currentValue' && (
                            <Icon icon={sortDirection === 'asc' ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                        <button onClick={() => handleSort('profit')} className="flex items-center gap-1.5 justify-end w-full hover:text-purple-600 transition-colors cursor-pointer">
                          P/L
                          {sortField === 'profit' && (
                            <Icon icon={sortDirection === 'asc' ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-sm text-center font-bold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100">
                    {sortedPortfolio.map((item) => (
                      <tr key={item.id} className="hover:bg-purple-50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                              item.assetType === 'fund' ? 'bg-purple-100 border border-purple-200' :
                              item.assetType === 'stock' ? 'bg-pink-100 border border-pink-200' : 'bg-blue-100 border border-blue-200'
                            }`}>
                              <Icon 
                                icon={
                                  item.assetType === 'fund' ? 'lucide:chart-line' :
                                  item.assetType === 'stock' ? 'ri:funds-box-fill' : 
                                  'lineicons:bitcoin'
                                } 
                                className={`w-6 h-6 ${
                                  item.assetType === 'fund' ? 'text-purple-600' :
                                  item.assetType === 'stock' ? 'text-pink-600' : 'text-blue-600'
                                }`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-gray-900 truncate max-w-[200px]" title={item.assetName}>
                                {item.assetName}
                              </div>
                              <div className="text-xs font-medium text-gray-600">
                                {item.assetType === 'fund' && item.assetDetails && 'projAbbrName' in item.assetDetails && item.assetDetails.projAbbrName ? String(item.assetDetails.projAbbrName) : item.assetId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold ${
                            item.assetType === 'fund' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            item.assetType === 'stock' ? 'bg-pink-100 text-pink-800 border border-pink-200' : 
                            'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {item.assetType === 'fund' ? 'Fund' : item.assetType === 'stock' ? 'Stock' : 'Crypto'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-xs text-right font-medium text-gray-900">
                          {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 4 })}
                        </td>
                        <td className="px-6 py-3 text-xs text-right font-medium text-gray-500">
                          ฿{item.avgBuyPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-xs text-right font-medium text-gray-900">
                          ฿{item.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-xs text-right font-medium text-gray-900">
                          ฿{item.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className={`text-xs font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.profit >= 0 ? '+' : ''}฿{item.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div className={`text-xs font-medium ${item.profitPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            <Icon icon={item.profitPercent >= 0 ? 'uil:arrow-growth' : 'uil:chart-down'} className="w-4 h-4 inline-block mr-1" />
                            {item.profitPercent >= 0 ? '+' : ''}{item.profitPercent.toFixed(2)}%
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditAsset(item)}
                              className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-all cursor-pointer border border-purple-200"
                              title="Edit"
                            >
                              <Icon icon="fluent:edit-32-regular" className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(item.id)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all cursor-pointer border border-red-200"
                              title="Delete"
                            >
                              <Icon icon="hugeicons:delete-02" className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View - Minimal Clean */}
            <div className="lg:hidden space-y-4">
              {sortedPortfolio.map((item) => (
                <div key={item.id} className="card-1 p-3">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        item.assetType === 'fund' ? 'bg-purple-100 border border-purple-200' :
                        item.assetType === 'stock' ? 'bg-pink-100 border border-pink-200' : 'bg-blue-100 border border-blue-200'
                      }`}>
                        <Icon 
                          icon={
                            item.assetType === 'fund' ? 'lucide:chart-line' :
                            item.assetType === 'stock' ? 'ri:funds-box-fill' : 
                            'lineicons:bitcoin'
                          } 
                          className={`w-6 h-6 ${
                            item.assetType === 'fund' ? 'text-purple-600' :
                            item.assetType === 'stock' ? 'text-pink-600' : 'text-blue-600'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base truncate" title={item.assetName}>{item.assetName}</h3>
                        <div className='flex flex-wrap items-center gap-2'>
                        <p className="text-sm font-medium text-gray-600 truncate">
                          {item.assetType === 'fund' && item.assetDetails && 'projAbbrName' in item.assetDetails && item.assetDetails.projAbbrName ? String(item.assetDetails.projAbbrName) : (String(item.assetDetails?.baseSymbol) || item.assetId)}
                        </p>
                        <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.assetType === 'fund' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          item.assetType === 'stock' ? 'bg-pink-100 text-pink-800 border border-pink-200' : 
                          'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {item.assetType === 'fund' ? 'Fund' : item.assetType === 'stock' ? 'Stock' : 'Crypto'}
                        </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditAsset(item)}
                        className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-all cursor-pointer border border-purple-200"
                      >
                        <Icon icon="solar:pen-bold-duotone" className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(item.id)}
                        className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all cursor-pointer border border-red-200"
                      >
                        <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-3 border border-purple-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Quantity</p>
                      <p className="text-sm font-medium text-gray-900">{item.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-purple-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Cost</p>
                      <p className="text-sm font-medium text-gray-400">฿{item.avgBuyPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-purple-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Current</p>
                      <p className="text-sm font-medium text-gray-900">฿{item.currentPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-purple-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Value</p>
                      <p className="text-sm font-medium text-gray-900">฿{item.currentValue.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className={`mt-2 p-3 rounded-lg ${item.profit >= 0 ? 'bg-green-50 border border-green-400' : 'bg-red-50 border border-red-400'}`}>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Profit/Loss</p>
                    <div className="flex items-center justify-between">
                      <p className={`text-base font-medium ${item.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {item.profit >= 0 ? '+' : '-'}฿{Math.abs(item.profit).toLocaleString()}
                      </p>
                      <p className={`text-base font-semibold ${item.profitPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        <Icon icon={item.profitPercent >= 0 ? 'uil:arrow-growth' : 'uil:chart-down'} className="w-4 h-4 inline-block mr-1" />
                            {item.profitPercent >= 0 ? '+' : ''}{item.profitPercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Admin Quick Action - Minimal Clean */}
        {/* {user?.role === 'admin' && (
          <div className="card-1 p-8 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Icon icon="solar:crown-bold-duotone" className="w-7 h-7 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Admin Panel</h3>
                  <p className="text-sm text-gray-600">Manage funds, stocks, and crypto data</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/admin')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Icon icon="solar:settings-bold-duotone" className="w-5 h-5" />
                <span className="hidden sm:inline">Go to Panel</span>
              </button>
            </div>
          </div>
        )} */}
      </main>

      {/* Add/Edit Asset Modal */}
      <AddAssetModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={() => {
          fetchPortfolio();
          handleCloseModal();
        }}
        mode={editingAsset ? 'edit' : 'add'}
        initialData={editingAsset || undefined}
      />
    </div>
  );
}
