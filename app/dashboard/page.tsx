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
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [mobileDisplayMode, setMobileDisplayMode] = useState<'baht' | 'percent'>('baht');

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
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {/* Total Value */}
          <div className="card-1 p-3 sm:p-5 hover:scale-[1.01] transform transition-all duration-300">
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Icon icon="solar:wallet-money-bold-duotone" className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5 sm:mb-1">{t.totalValue}</p>
                <p className="text-sm sm:text-xl font-bold text-gray-900">
                  ฿{summary.totalValue.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* Total Cost */}
          <div className="card-2 p-3 sm:p-5 hover:scale-[1.01] transform transition-all duration-300">
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Icon icon="solar:calculator-bold-duotone" className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5 sm:mb-1">{t.totalCost}</p>
                <p className="text-sm sm:text-xl font-bold text-gray-900">
                  ฿{summary.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* Profit/Loss */}
          <div className="card-3 p-3 sm:p-5 hover:scale-[1.01] transform transition-all duration-300">
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
                summary.totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Icon 
                  icon={summary.totalProfit >= 0 ? "solar:graph-up-bold-duotone" : "solar:graph-down-bold-duotone"} 
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5 sm:mb-1">{t.profitLoss}</p>
                <p className={`text-sm sm:text-xl font-bold ${
                  summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {summary.totalProfit >= 0 ? '+' : ''}฿{summary.totalProfit.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* Percentage */}
          <div className="card-4 p-3 sm:p-5 hover:scale-[1.01] transform transition-all duration-300">
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
                summary.totalProfitPercent >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Icon 
                  icon="solar:chart-bold-duotone" 
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${summary.totalProfitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5 sm:mb-1">{t.percentage}</p>
                <p className={`text-sm sm:text-xl font-bold ${
                  summary.totalProfitPercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {summary.totalProfitPercent >= 0 ? '+' : ''}{summary.totalProfitPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Charts - Compact Design - Hidden on Mobile */}
        {portfolio.length > 0 && (
          <div className="hidden sm:grid grid-cols-1 lg:grid-cols-3 gap-4">
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

            {/* Mobile Single Line View - Aligned & Grouped */}
            <div className="lg:hidden space-y-4">
              {/* Group by Type */}
              {['fund', 'stock', 'crypto'].map((type) => {
                const items = sortedPortfolio.filter(item => item.assetType === type);
                if (items.length === 0) return null;
                
                // Calculate total for percentage
                const groupTotal = items.reduce((sum, item) => sum + item.currentValue, 0);
                
                return (
                  <div key={type} className="card-1 overflow-hidden">
                    {/* Group Header with Toggle */}
                    <div className={`px-3 py-2 flex items-center justify-between ${
                      type === 'fund' ? 'bg-purple-50 border-b border-purple-200' :
                      type === 'stock' ? 'bg-pink-50 border-b border-pink-200' : 
                      'bg-blue-50 border-b border-blue-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm flex items-center gap-2 ${
                          type === 'fund' ? 'text-purple-700' :
                          type === 'stock' ? 'text-pink-700' : 
                          'text-blue-700'
                        }`}>
                          {type === 'fund' ? (
                            <>
                              <Icon icon="lucide:chart-line" className="w-7 h-7 text-purple-400" />
                              {language === 'th' ? 'กองทุน' : 'Funds'}
                            </>
                          ) : type === 'stock' ? (
                            <>
                              <Icon icon="lucide:trending-up" className="w-7 h-7 text-pink-400" />
                              {language === 'th' ? 'หุ้น' : 'Stocks'}
                            </>
                          ) : (
                            <>
                              <Icon icon="lineicons:bitcoin" className="w-7 h-7 text-blue-400" />
                              Crypto
                            </>
                          )}
                        
                          <span className="text-xs opacity-75">({items.length})</span>
                        </span>
                      </div>
                      
                      {/* Mode Toggle - Radio Style */}
                      <div className={`flex rounded-lg overflow-hidden`}>
                        <button
                          onClick={() => setMobileDisplayMode('baht')}
                          className={`px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                            mobileDisplayMode === 'baht'
                              ? type === 'fund' ? 'text-purple-700' :
                                type === 'stock' ? 'text-pink-700' : 
                                'text-blue-700'
                              : type === 'fund' ? 'text-grey-500 hover:bg-purple-100' :
                                type === 'stock' ? 'text-grey-500 hover:bg-pink-100' : 
                                'text-grey-500 hover:bg-blue-100'
                          }`}
                        >
                          ฿
                        </button>
                        <div className={`w-px h-6 bg-gray-400 self-center`}></div>
                        <button
                          onClick={() => setMobileDisplayMode('percent')}
                          className={`px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                            mobileDisplayMode === 'percent'
                              ? type === 'fund' ? 'text-purple-700' :
                                type === 'stock' ? 'text-pink-700' : 
                                'text-blue-700'
                              : type === 'fund' ? 'text-grey-500 hover:bg-purple-100' :
                                type === 'stock' ? 'text-grey-500 hover:bg-pink-100' : 
                                'text-grey-500 hover:bg-blue-100'
                          }`}
                        >
                          %
                        </button>
                      </div>
                    </div>
                    
                    {/* Column Headers */}
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center text-xs font-semibold text-gray-600">
                      <div className="flex-1">{language === 'th' ? 'สัญลักษณ์' : 'Symbol'}</div>
                      <div className="flex-2 text-right pr-1">{language === 'th' ? 'มูลค่า / กำไร-ขาดทุน' : 'Value'}</div>
                    </div>
                    
                    {/* Items List */}
                    <div className="divide-y divide-gray-200">
                      {items.map((item) => {
                        const itemPercentage = (item.currentValue / groupTotal) * 100;
                        
                        return (
                          <div 
                            key={item.id} 
                            className={`px-2 py-1 hover:bg-purple-200 transition-colors cursor-pointer`}
                            onClick={() => {
                              setSelectedItem(item);
                              setDetailModalOpen(true);
                            }}
                          >
                            <div className="flex items-center text-xs gap-2">
                              {/* Symbol - Can wrap to 2 lines with ellipsis */}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm line-clamp-2 leading-tight overflow-hidden break-all">
                                  {item.assetType === 'fund' && item.assetDetails && 'projAbbrName' in item.assetDetails && item.assetDetails.projAbbrName 
                                    ? String(item.assetDetails.projAbbrName) 
                                    : (item.assetDetails && 'baseSymbol' in item.assetDetails && item.assetDetails.baseSymbol
                                        ? String(item.assetDetails.baseSymbol)
                                        : item.assetId)}
                                </div>
                              </div>

                              {/* Percentage */}
                              {/* <div className="flex-1 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${
                                  type === 'fund' ? 'bg-purple-100 text-purple-700' :
                                  type === 'stock' ? 'bg-pink-100 text-pink-700' : 
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {itemPercentage.toFixed(0)}%
                                </span>
                              </div> */}

                              {/* Value / P/L (2 lines) */}
                              <div className="flex-2 text-right space-y-0.5 min-w-0">
                                {/* Line 1: Value */}
                                <div className="text-gray-900 font-semibold text-xs">
                                  {`฿${item.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                </div>
                                
                                {/* Line 2: P/L */}
                                <div className={`font-medium text-xs flex items-center justify-end gap-1 ${
                                  item.profit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {mobileDisplayMode === 'baht' ? (
                                    <>
                                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                                        item.profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                      }`}>
                                        {item.profit >= 0 ? '+' : ''}฿{item.profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                                        item.profitPercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                      }`}>
                                        {item.profitPercent >= 0 ? '+' : ''}{item.profitPercent.toFixed(1)}%
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Group Total Summary */}
                    <div className={`px-4 py-3.5 border-t-2 ${
                      type === 'fund' ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300' :
                      type === 'stock' ? 'bg-gradient-to-br from-pink-50 to-pink-100 border-pink-300' : 
                      'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300'
                    }`}>
                      {(() => {
                        const totalValue = groupTotal;
                        const totalProfit = items.reduce((sum, item) => sum + item.profit, 0);
                        const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
                        const profitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
                        
                        return (
                          <div className="flex items-center justify-between">
                            {/* Left: Total Label + Value */}
                            <div>
                              <div className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                                {/* <Icon icon="solar:calculator-minimalistic-bold-duotone" className="w-3.5 h-3.5" /> */}
                                <span className="tracking-wide">
                                  {language === 'th' 
                                    ? `รวม ${type === 'fund' ? 'กองทุน' : type === 'stock' ? 'หุ้น' : 'Crypto'}`
                                    : `Total ${type === 'fund' ? 'Funds' : type === 'stock' ? 'Stocks' : 'Crypto'}`
                                  }
                                </span>
                              </div>
                              <div className={`text-medium font-medium ${
                                type === 'fund' ? 'text-purple-900' :
                                type === 'stock' ? 'text-pink-900' : 
                                'text-blue-900'
                              }`}>
                                ฿{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </div>
                            </div>
                            
                            {/* Right: P/L */}
                            <div className="text-right">
                              <div className="text-xs font-bold text-gray-500 mb-1.5 flex items-center justify-end gap-1">
                                <Icon icon={totalProfit >= 0 ? "uil:arrow-growth" : "uil:chart-down"} className={`w-3.5 h-3.5 ${totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`} />
                                <span className="tracking-wide">
                                  {language === 'th' ? 'กำไร/ขาดทุน' : 'Profit/Loss'}
                                </span>
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <span className={`text-medium font-medium ${
                                  totalProfit >= 0 ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {totalProfit >= 0 ? '+' : ''}฿{Math.abs(totalProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                                <span className={`px-2 py-1 rounded-lg text-sm font-medium shadow-sm ${
                                  totalProfit >= 0 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-red-600 text-white'
                                }`}>
                                  {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
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

      {/* Detail Modal - Mobile */}
      {detailModalOpen && selectedItem && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
            onClick={() => setDetailModalOpen(false)}
          />
          
          {/* Floating Detail Card */}
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 lg:hidden animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-purple-100 p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedItem.assetType === 'fund' ? 'bg-purple-100 border border-purple-200' :
                    selectedItem.assetType === 'stock' ? 'bg-pink-100 border border-pink-200' : 'bg-blue-100 border border-blue-200'
                  }`}>
                    <Icon 
                      icon={
                        selectedItem.assetType === 'fund' ? 'lucide:chart-line' :
                        selectedItem.assetType === 'stock' ? 'ri:funds-box-fill' : 
                        'lineicons:bitcoin'
                      } 
                      className={`w-6 h-6 ${
                        selectedItem.assetType === 'fund' ? 'text-purple-600' :
                        selectedItem.assetType === 'stock' ? 'text-pink-600' : 'text-blue-600'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{selectedItem.assetName}</h3>
                    <p className="text-sm text-gray-600">
                      {selectedItem.assetType === 'fund' && selectedItem.assetDetails && 'projAbbrName' in selectedItem.assetDetails && selectedItem.assetDetails.projAbbrName 
                        ? String(selectedItem.assetDetails.projAbbrName) 
                        : (selectedItem.assetDetails && 'baseSymbol' in selectedItem.assetDetails && selectedItem.assetDetails.baseSymbol
                            ? String(selectedItem.assetDetails.baseSymbol)
                            : selectedItem.assetId)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                >
                  <Icon icon="solar:close-circle-bold" className="w-8 h-8 text-purple-500" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Type Badge */}
              <div className="flex justify-center">
                <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${
                  selectedItem.assetType === 'fund' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                  selectedItem.assetType === 'stock' ? 'bg-pink-100 text-pink-800 border border-pink-200' : 
                  'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {selectedItem.assetType === 'fund' ? 'Mutual Fund' : selectedItem.assetType === 'stock' ? 'Stock' : 'Cryptocurrency'}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">{language === 'th' ? 'จำนวน' : 'Quantity'}</p>
                  <p className="text-base font-bold text-gray-900">{selectedItem.quantity.toLocaleString(undefined, { minimumFractionDigits: 4 })}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">{language === 'th' ? 'ต้นทุนต่อหน่วย' : 'Cost/Unit'}</p>
                  <p className="text-base font-bold text-gray-900">฿{selectedItem.avgBuyPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">{language === 'th' ? 'ราคาปัจจุบัน' : 'Current Price'}</p>
                  <p className="text-base font-bold text-gray-900">฿{selectedItem.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">{language === 'th' ? 'มูลค่ารวม' : 'Total Value'}</p>
                  <p className="text-base font-bold text-gray-900">฿{selectedItem.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Total Cost */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-1.5">{language === 'th' ? 'ต้นทุนทั้งหมด' : 'Total Cost'}</p>
                <p className="text-lg font-bold text-gray-900">฿{selectedItem.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>

              {/* Profit/Loss */}
              <div className={`rounded-xl p-4 border-2 ${
                selectedItem.profit >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
              }`}>
                <p className="text-xs font-semibold text-gray-700 mb-2">{language === 'th' ? 'กำไร/ขาดทุน' : 'Profit/Loss'}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-lg font-bold ${selectedItem.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {selectedItem.profit >= 0 ? '+' : ''}฿{selectedItem.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold flex items-center gap-1 ${selectedItem.profitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <Icon icon={selectedItem.profitPercent >= 0 ? 'uil:arrow-growth' : 'uil:chart-down'} className="w-6 h-6" />
                      {selectedItem.profitPercent >= 0 ? '+' : ''}{selectedItem.profitPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedItem.notes && (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <p className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                    <Icon icon="solar:notes-bold-duotone" className="w-4 h-4 text-yellow-600" />
                    {language === 'th' ? 'หมายเหตุ' : 'Notes'}
                  </p>
                  <p className="text-sm text-gray-700">{selectedItem.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    handleEditAsset(selectedItem);
                    setDetailModalOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all"
                >
                  <Icon icon="solar:pen-bold-duotone" className="w-5 h-5" />
                  {language === 'th' ? 'แก้ไข' : 'Edit'}
                </button>
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleDeleteAsset(selectedItem.id);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all"
                >
                  <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-5 h-5" />
                  {language === 'th' ? 'ลบ' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
