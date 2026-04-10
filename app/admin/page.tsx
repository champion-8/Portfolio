'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { NumericFormat } from 'react-number-format';
import Loading from '@/components/Loading';

interface User {
  id: string;
  username: string;
  role: string;
  fullName: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'th' | 'en'>('en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Translations
  const t = {
    title: language === 'th' ? 'Admin Panel' : 'Admin Panel',
    subtitle: language === 'th' ? 'จัดการและซิงก์ข้อมูล' : 'Manage and sync data',
    dashboard: language === 'th' ? 'แดชบอร์ด' : 'Dashboard',
    profile: language === 'th' ? 'โปรไฟล์' : 'Profile',
    logout: language === 'th' ? 'ออกจากระบบ' : 'Logout',
    funds: language === 'th' ? 'กองทุนรวม' : 'Mutual Funds',
    stocks: language === 'th' ? 'หุ้น' : 'Stocks',
    crypto: language === 'th' ? 'Cryptocurrency' : 'Cryptocurrency',
    syncFunds: language === 'th' ? 'ซิงก์กองทุนรวม' : 'Sync Funds',
    syncFundsDesc: language === 'th' ? 'ดึงข้อมูลกองทุนจาก SEC API' : 'Fetch fund data from SEC API',
    syncNav: language === 'th' ? 'ซิงก์ NAV ทั้งหมด' : 'Sync All NAV',
    syncNavDesc: language === 'th' ? 'อัพเดตมูลค่ากองทุนทั้งหมด' : 'Update all fund values',
    importStocks: language === 'th' ? 'นำเข้าข้อมูลหุ้น' : 'Import Stocks',
    importStocksDesc: language === 'th' ? 'อัพโหลดไฟล์ Excel' : 'Upload Excel file',
    syncStockPrices: language === 'th' ? 'ซิงก์ราคาหุ้น' : 'Sync Stock Prices',
    syncStockPricesDesc: language === 'th' ? 'อัพเดตจาก Yahoo Finance' : 'Update from Yahoo Finance',
    syncCrypto: language === 'th' ? 'ซิงก์ราคา Crypto' : 'Sync Crypto Prices',
    syncCryptoDesc: language === 'th' ? 'อัพเดตจาก Bitkub Exchange' : 'Update from Bitkub Exchange',
    navDate: language === 'th' ? 'วันที่ NAV' : 'NAV Date',
    limit: language === 'th' ? 'จำกัดจำนวน' : 'Limit',
    syncing: language === 'th' ? 'กำลังซิงก์...' : 'Syncing...',
    importing: language === 'th' ? 'กำลังนำเข้า...' : 'Importing...',
    sync: language === 'th' ? 'ซิงก์' : 'Sync',
    import: language === 'th' ? 'นำเข้าข้อมูล' : 'Import Data',
    selectFile: language === 'th' ? 'กรุณาเลือกไฟล์ Excel' : 'Please select Excel file',
    file: language === 'th' ? 'ไฟล์' : 'File',
    loading: language === 'th' ? 'กำลังโหลด...' : 'Loading...',
  };
  
  // State for all sync operations
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [navAllLoading, setNavAllLoading] = useState(false);
  const [navAllResult, setNavAllResult] = useState<any>(null);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [stocksResult, setStocksResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [syncAllPricesLoading, setSyncAllPricesLoading] = useState(false);
  const [syncAllPricesResult, setSyncAllPricesResult] = useState<any>(null);
  const [priceLimit, setPriceLimit] = useState('');
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [cryptoResult, setCryptoResult] = useState<any>(null);
  const [navAllDate, setNavAllDate] = useState('');
  const [navAllLimit, setNavAllLimit] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/profile');
      const data = await res.json();
      
      if (data.success && data.user.role === 'admin') {
        setUser(data.user);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      router.push('/signin');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFunds = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/sync-funds', { method: 'POST' });
      const data = await response.json();
      setSyncResult(data);
    } catch {
      setSyncResult({ success: false, error: 'Failed to sync funds' });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncAllNav = async () => {
    setNavAllLoading(true);
    setNavAllResult(null);
    try {
      const response = await fetch('/api/sync-all-nav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nav_date: navAllDate || undefined,
          limit: navAllLimit ? parseInt(navAllLimit) : undefined,
        }),
      });
      const data = await response.json();
      setNavAllResult(data);
    } catch {
      setNavAllResult({ success: false, error: 'Failed to sync all NAV' });
    } finally {
      setNavAllLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      router.push('/signin');
      router.refresh();
    } catch (error) {
      console.error('Sign out failed');
    }
  };

  const handleImportStocks = async () => {
    if (!selectedFile) {
      alert(t.selectFile);
      return;
    }
    setStocksLoading(true);
    setStocksResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await fetch('/api/import-stocks', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setStocksResult(data);
    } catch {
      setStocksResult({ success: false, error: 'Failed to import stocks' });
    } finally {
      setStocksLoading(false);
    }
  };

  const handleSyncAllPrices = async () => {
    setSyncAllPricesLoading(true);
    setSyncAllPricesResult(null);
    try {
      const response = await fetch('/api/sync-stock-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: priceLimit ? parseInt(priceLimit) : undefined,
        }),
      });
      const data = await response.json();
      setSyncAllPricesResult(data);
    } catch {
      setSyncAllPricesResult({ success: false, error: 'Failed to sync stock prices' });
    } finally {
      setSyncAllPricesLoading(false);
    }
  };

  const handleSyncCrypto = async () => {
    setCryptoLoading(true);
    setCryptoResult(null);
    try {
      const response = await fetch('/api/sync-crypto-prices', { method: 'POST' });
      const data = await response.json();
      setCryptoResult(data);
    } catch {
      setCryptoResult({ success: false, error: 'Failed to sync crypto prices' });
    } finally {
      setCryptoLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-purple-100">
      {/* Header - Matching Dashboard Style */}
      <header className="bg-purple-700 backdrop-blur-sm border-b border-purple-300 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-3">
          <div className="flex items-center justify-between relative">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center border border-purple-300">
                <Icon icon="solar:crown-bold-duotone" className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-purple-50">
                  {t.title}
                </h1>
                <p className="text-xs text-purple-200">
                  {t.subtitle}
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
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-1.5 font-medium cursor-pointer border border-purple-200 hover:border-purple-300"
              >
                <Icon icon="solar:arrow-left-bold-duotone" className="w-3.5 h-3.5" />
                <span>{t.dashboard}</span>
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="px-3 py-2 text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-gray-200 hover:border-gray-300"
              >
                <Icon icon="solar:user-circle-bold-duotone" className="w-3.5 h-3.5" />
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
                    <button
                      onClick={() => { router.push('/dashboard'); setMobileMenuOpen(false); }}
                      className="w-full px-3 py-2.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-2 font-medium cursor-pointer border border-purple-200"
                    >
                      <Icon icon="solar:arrow-left-bold-duotone" className="w-4 h-4" />
                      <span>{t.dashboard}</span>
                    </button>
                    <button
                      onClick={() => { router.push('/profile'); setMobileMenuOpen(false); }}
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-2 cursor-pointer border border-gray-200"
                    >
                      <Icon icon="solar:user-circle-bold-duotone" className="w-4 h-4" />
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        <div className="space-y-8">
          
          {/* Fund Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Icon icon="lucide:chart-line" className="w-7 h-7 text-purple-400" />
              <h2 className="text-lg font-semibold text-gray-900">{t.funds}</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Sync Funds */}
              <div className="bg-white border border-purple-200 hover:border-purple-300 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon icon="solar:refresh-circle-bold-duotone" className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{t.syncFunds}</h3>
                    <p className="text-sm text-gray-500">{t.syncFundsDesc}</p>
                  </div>
                </div>
                <div className="flex-1"></div>
                <button
                  onClick={handleSyncFunds}
                  disabled={syncLoading}
                  className="w-full bg-purple-400 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {syncLoading ? (
                    <><Icon icon="solar:hourglass-bold-duotone" className="w-4 h-4 animate-spin" /> {t.syncing}</>
                  ) : (
                    <><Icon icon="solar:refresh-circle-bold-duotone" className="w-4 h-4" /> {t.sync}</>
                  )}
                </button>
                {syncResult && (
                  <div className={`mt-3 p-3 rounded-lg text-xs ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <pre className="overflow-auto max-h-40">{JSON.stringify(syncResult, null, 2)}</pre>
                  </div>
                )}
              </div>

              {/* Sync All NAV */}
              <div className="bg-white border border-purple-200 hover:border-purple-300 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon icon="solar:chart-square-bold-duotone" className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{t.syncNav}</h3>
                    <p className="text-sm text-gray-500">{t.syncNavDesc}</p>
                  </div>
                </div>
                <div className="space-y-3 mb-3 flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t.navDate}</label>
                      <input
                        type="date"
                        value={navAllDate}
                        onChange={(e) => setNavAllDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t.limit}</label>
                      <NumericFormat
                        value={navAllLimit}
                        onValueChange={(values) => setNavAllLimit(values.value)}
                        thousandSeparator=","
                        decimalScale={0}
                        allowNegative={false}
                        placeholder="10"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSyncAllNav}
                  disabled={navAllLoading}
                  className="w-full bg-purple-400 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {navAllLoading ? (
                    <><Icon icon="solar:hourglass-bold-duotone" className="w-4 h-4 animate-spin" /> {t.syncing}</>
                  ) : (
                    <><Icon icon="solar:refresh-circle-bold-duotone" className="w-4 h-4" /> {t.sync}</>
                  )}
                </button>
                {navAllResult && (
                  <div className={`mt-3 p-3 rounded-lg text-xs ${navAllResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <pre className="overflow-auto max-h-40">{JSON.stringify(navAllResult, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Stock Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Icon icon="ri:funds-box-fill" className="w-7 h-7 text-pink-400" />
              <h2 className="text-lg font-semibold text-gray-900">{t.stocks}</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Import Stocks */}
              <div className="bg-white border border-pink-200 hover:border-pink-300 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon icon="solar:upload-bold-duotone" className="w-5 h-5 text-pink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{t.importStocks}</h3>
                    <p className="text-sm text-gray-500">{t.importStocksDesc}</p>
                  </div>
                </div>
                <div className="space-y-3 mb-3 flex-1">
                  <input
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-pink-50 file:text-pink-600 hover:file:bg-pink-100 transition-all cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="text-xs text-gray-500">
                      {t.file}: <span className="font-medium">{selectedFile.name}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={handleImportStocks}
                  disabled={stocksLoading || !selectedFile}
                  className="w-full bg-pink-400 hover:bg-pink-500 text-white px-4 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {stocksLoading ? (
                    <><Icon icon="solar:hourglass-bold-duotone" className="w-4 h-4 animate-spin" /> {t.importing}</>
                  ) : (
                    <><Icon icon="solar:upload-bold-duotone" className="w-4 h-4" /> {t.import}</>
                  )}
                </button>
                {stocksResult && (
                  <div className={`mt-3 p-3 rounded-lg text-xs ${stocksResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <pre className="overflow-auto max-h-40">{JSON.stringify(stocksResult, null, 2)}</pre>
                  </div>
                )}
              </div>

              {/* Sync Stock Prices */}
              <div className="bg-white border border-pink-200 hover:border-pink-300 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon icon="solar:graph-up-bold-duotone" className="w-5 h-5 text-pink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{t.syncStockPrices}</h3>
                    <p className="text-sm text-gray-500">{t.syncStockPricesDesc}</p>
                  </div>
                </div>
                <div className="space-y-3 mb-3 flex-1">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.limit}</label>
                    <NumericFormat
                      value={priceLimit}
                      onValueChange={(values) => setPriceLimit(values.value)}
                      thousandSeparator=","
                      decimalScale={0}
                      allowNegative={false}
                      placeholder="10"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSyncAllPrices}
                  disabled={syncAllPricesLoading}
                  className="w-full bg-pink-400 hover:bg-pink-500 text-white px-4 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {syncAllPricesLoading ? (
                    <><Icon icon="solar:hourglass-bold-duotone" className="w-4 h-4 animate-spin" /> {t.syncing}</>
                  ) : (
                    <><Icon icon="solar:refresh-circle-bold-duotone" className="w-4 h-4" /> {t.sync}</>
                  )}
                </button>
                {syncAllPricesResult && (
                  <div className={`mt-3 p-3 rounded-lg text-xs ${syncAllPricesResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <pre className="overflow-auto max-h-40">{JSON.stringify(syncAllPricesResult, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Crypto Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Icon icon="lineicons:bitcoin" className="w-7 h-7 text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900">{t.crypto}</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Sync Crypto */}
              <div className="bg-white border border-blue-200 hover:border-blue-300 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon icon="solar:refresh-circle-bold-duotone" className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{t.syncCrypto}</h3>
                    <p className="text-sm text-gray-500">{t.syncCryptoDesc}</p>
                  </div>
                </div>
                <div className="flex-1"></div>
                <button
                  onClick={handleSyncCrypto}
                  disabled={cryptoLoading}
                  className="w-full bg-blue-400 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {cryptoLoading ? (
                    <><Icon icon="solar:hourglass-bold-duotone" className="w-4 h-4 animate-spin" /> {t.syncing}</>
                  ) : (
                    <><Icon icon="solar:refresh-circle-bold-duotone" className="w-4 h-4" /> {t.sync}</>
                  )}
                </button>
                {cryptoResult && (
                  <div className={`mt-3 p-3 rounded-lg text-xs ${cryptoResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <pre className="overflow-auto max-h-40">{JSON.stringify(cryptoResult, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
